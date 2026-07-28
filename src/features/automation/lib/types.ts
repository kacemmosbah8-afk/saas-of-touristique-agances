/**
 * The provider-agnostic contract every asynchronous capability implements
 * to run through the Platform Automation Capability — mirrors
 * `SupplierExecutionProvider`/`EmailProvider` exactly:
 * one small interface, registered handlers are the "providers". A job's
 * `payload` is untyped `unknown` here on purpose (it round-trips through a
 * JSONB column) — each handler validates its own payload shape (typically
 * with Zod) rather than trusting an unchecked cast, the same discipline
 * every DTO boundary in this codebase already applies.
 */

export type JobHandlerResult =
  | { ok: true }
  | { ok: false; retryable: boolean; message: string };

export type JobContext = {
  jobId: string;
  tenantId: string | null;
  /** 1 on the first attempt, incremented by the engine before each claim. */
  attempt: number;
};

export interface JobHandler {
  /** Matches `Job.type` — the registry's lookup key. */
  readonly type: string;
  handle(payload: unknown, context: JobContext): Promise<JobHandlerResult>;
}
