import "server-only";
import { Prisma } from "@prisma/client";

import { prisma } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { getJobHandler } from "@/features/automation/lib/registry";
import { nextAvailableAt } from "@/features/automation/lib/retry";
import type { JobHandlerResult } from "@/features/automation/lib/types";

/**
 * The Platform Automation Capability's engine. There is no separate queue
 * or worker process — `jobs` is the queue, and this module is the worker,
 * callable from anywhere (`/api/jobs/process` on a schedule, a script, a
 * test). Every safety property comes from the atomic single-row claim
 * below, not from anything held in memory — the same conclusion Supplier
 * Order Execution's engine reached; see PROJECT.md, "Concurrency — what's
 * actually guaranteed".
 *
 * Uses the raw `prisma` client throughout, never a tenant-scoped one: a
 * job's `tenantId` is data on the row, not a request-scoped identity the
 * caller belongs to, and the worker itself claims and processes jobs
 * across every tenant in one run.
 */

type ClaimedJob = {
  id: string;
  tenantId: string | null;
  type: string;
  payload: Prisma.JsonValue;
  attempts: number;
  maxAttempts: number;
};

export type EnqueueJobInput = {
  type: string;
  payload: Prisma.InputJsonValue;
  tenantId?: string | null;
  priority?: number;
  availableAt?: Date;
  /** A second `enqueueJob` call with the same key joins the existing row. */
  idempotencyKey?: string;
  maxAttempts?: number;
};

/**
 * The only supported way to create a job. A duplicate `idempotencyKey`
 * joins the existing row rather than erroring — the same P2002-race
 * handling `SupplierOrder` creation established in the Supplier Order
 * Execution Capability's self-review.
 */
export async function enqueueJob(input: EnqueueJobInput): Promise<{ id: string }> {
  try {
    const job = await prisma.job.create({
      data: {
        type: input.type,
        payload: input.payload,
        tenantId: input.tenantId ?? null,
        priority: input.priority ?? 0,
        availableAt: input.availableAt ?? new Date(),
        idempotencyKey: input.idempotencyKey,
        maxAttempts: input.maxAttempts ?? 5,
      },
      select: { id: true, tenantId: true },
    });
    await prisma.jobEvent.create({
      data: {
        tenantId: job.tenantId,
        jobId: job.id,
        type: "ENQUEUED",
        message: `Enqueued type "${input.type}".`,
      },
    });
    return { id: job.id };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      input.idempotencyKey
    ) {
      const existing = await prisma.job.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true },
      });
      if (existing) return { id: existing.id };
    }
    throw err;
  }
}

/** Cancels a job that hasn't started yet. Returns false if it's already running or terminal. */
export async function cancelJob(id: string): Promise<boolean> {
  const result = await prisma.job.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
  if (result.count !== 1) return false;

  const job = await prisma.job.findUnique({ where: { id }, select: { tenantId: true } });
  await prisma.jobEvent.create({
    data: { tenantId: job?.tenantId ?? null, jobId: id, type: "CANCELLED" },
  });
  return true;
}

// Over-select candidates: some will lose the claim race to a concurrent
// worker run, or have gone CANCELLED between selection and claim attempt.
const CANDIDATE_OVERSELECT_MULTIPLIER = 3;

async function selectCandidateIds(batchSize: number): Promise<string[]> {
  const rows = await prisma.job.findMany({
    where: { status: "PENDING", availableAt: { lte: new Date() } },
    orderBy: [{ priority: "desc" }, { availableAt: "asc" }],
    take: batchSize * CANDIDATE_OVERSELECT_MULTIPLIER,
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Atomically claims one job. `updateMany` keyed on id + status serializes
 * on Postgres's own row-level lock, so two concurrent worker runs can
 * never both claim the same job — this is the entire concurrency
 * guarantee; no separate distributed lock exists because none is needed.
 */
async function claim(id: string): Promise<ClaimedJob | null> {
  const result = await prisma.job.updateMany({
    where: { id, status: "PENDING", availableAt: { lte: new Date() } },
    data: { status: "RUNNING", lockedAt: new Date(), attempts: { increment: 1 } },
  });
  if (result.count !== 1) return null;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return null; // defensive; cannot happen immediately after a successful claim

  await prisma.jobEvent.create({
    data: {
      tenantId: job.tenantId,
      jobId: job.id,
      type: "CLAIMED",
      message: `Attempt ${job.attempts}.`,
    },
  });

  return {
    id: job.id,
    tenantId: job.tenantId,
    type: job.type,
    payload: job.payload,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
  };
}

async function deadLetter(job: Pick<ClaimedJob, "id" | "tenantId">, message: string): Promise<void> {
  await prisma.job.update({
    where: { id: job.id },
    data: { status: "DEAD_LETTER", lastError: message, completedAt: new Date() },
  });
  await prisma.jobEvent.create({
    data: { tenantId: job.tenantId, jobId: job.id, type: "DEAD_LETTERED", message },
  });
  logger.error("automation: job dead-lettered", { jobId: job.id, message });
}

type ProcessOutcome = "succeeded" | "retried" | "dead_lettered";

async function process(job: ClaimedJob): Promise<ProcessOutcome> {
  const log = logger.child({ jobId: job.id, type: job.type, tenantId: job.tenantId, attempt: job.attempts });
  const handler = getJobHandler(job.type);

  if (!handler) {
    log.error("automation: no handler registered for job type");
    await deadLetter(job, `No handler registered for job type "${job.type}".`);
    return "dead_lettered";
  }

  let result: JobHandlerResult;
  try {
    result = await handler.handle(job.payload, { jobId: job.id, tenantId: job.tenantId, attempt: job.attempts });
  } catch (err) {
    result = { ok: false, retryable: false, message: err instanceof Error ? err.message : "Unhandled job error." };
    log.error("automation: job handler threw", { error: String(err) });
  }

  if (result.ok) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "SUCCEEDED", completedAt: new Date(), lastError: null },
    });
    await prisma.jobEvent.create({ data: { tenantId: job.tenantId, jobId: job.id, type: "SUCCEEDED" } });
    log.info("automation: job succeeded");
    return "succeeded";
  }

  if (result.retryable && job.attempts < job.maxAttempts) {
    // job.attempts is already the post-increment count (1 after the first
    // attempt) — pass attempts-1 so the first failure schedules the first
    // backoff step (~30s), not the second (~60s). See retry.ts.
    const availableAt = nextAvailableAt(job.attempts - 1);
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "PENDING", availableAt, lastError: result.message },
    });
    await prisma.jobEvent.create({
      data: {
        tenantId: job.tenantId,
        jobId: job.id,
        type: "RETRY_SCHEDULED",
        message: result.message,
        metadata: { nextAttemptAt: availableAt.toISOString() },
      },
    });
    log.warn("automation: job failed, retry scheduled", { message: result.message, availableAt });
    return "retried";
  }

  await deadLetter(job, result.message);
  return "dead_lettered";
}

export type WorkerRunSummary = {
  claimed: number;
  succeeded: number;
  retried: number;
  deadLettered: number;
};

/**
 * One worker tick — claims up to `batchSize` due jobs and runs each to
 * completion, sequentially. Stateless: safe to call concurrently from
 * multiple invocations (overlapping cron ticks, a manual trigger racing
 * the schedule) without any coordination between them.
 */
export async function runWorker(batchSize = 10): Promise<WorkerRunSummary> {
  const summary: WorkerRunSummary = { claimed: 0, succeeded: 0, retried: 0, deadLettered: 0 };
  const candidateIds = await selectCandidateIds(batchSize);

  for (const id of candidateIds) {
    if (summary.claimed >= batchSize) break;

    const job = await claim(id);
    if (!job) continue; // lost the claim race, or no longer eligible

    summary.claimed++;
    const outcome = await process(job);
    if (outcome === "succeeded") summary.succeeded++;
    else if (outcome === "retried") summary.retried++;
    else summary.deadLettered++;
  }

  return summary;
}
