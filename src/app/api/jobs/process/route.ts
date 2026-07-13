import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/shared/config/env";
import { logger } from "@/shared/lib/logger";
import { runWorker } from "@/features/automation/lib/engine";
// Side-effecting import — registers every job handler before the worker
// claims anything. Must run before `runWorker` is ever called from here.
import "@/features/automation/handlers/register";

/**
 * The Platform Automation Capability's external trigger — there is no
 * long-running worker process, so something outside the request/response
 * cycle must call this on a schedule. `vercel.json`'s `crons` entry does
 * that in production; in development, hit it manually with the header
 * below. Not a user-session endpoint — protected by a shared secret, not
 * RBAC, the same trust model a webhook receiver uses.
 *
 * Named `CRON_SECRET` and checked as a Bearer token to match Vercel's own
 * documented convention: when the env var is set, Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET` on every scheduled invocation
 * automatically — no bespoke header to configure on either side.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!env.CRON_SECRET) {
    logger.error("automation: /api/jobs/process called but CRON_SECRET is not configured");
    return NextResponse.json({ error: "Automation worker is not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const summary = await runWorker();
  logger.info("automation: worker tick complete", summary);

  return NextResponse.json(summary);
}
