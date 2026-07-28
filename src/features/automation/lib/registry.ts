import type { JobHandler } from "@/features/automation/lib/types";

/**
 * The single place new asynchronous capabilities plug into the platform: a
 * new job type is a new file exporting a `JobHandler` plus one
 * `registerJobHandler` call — never a change to the engine, the schema, or
 * a call site's shape. Module-level singleton because the worker process
 * (`/api/jobs/process`) needs every handler registered before it claims a
 * single job; see `handlers/register.ts` for the side-effecting import
 * that populates this at cold start.
 */
const handlers = new Map<string, JobHandler>();

export function registerJobHandler(handler: JobHandler): void {
  if (handlers.has(handler.type)) {
    throw new Error(`A job handler is already registered for type "${handler.type}".`);
  }
  handlers.set(handler.type, handler);
}

export function getJobHandler(type: string): JobHandler | undefined {
  return handlers.get(type);
}

/** Test-only: clears the registry between test files that register handlers. */
export function __resetRegistryForTests(): void {
  handlers.clear();
}
