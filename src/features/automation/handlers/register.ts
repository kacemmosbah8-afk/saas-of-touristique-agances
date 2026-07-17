import "server-only";

/**
 * Side-effecting import: each handler module calls `registerJobHandler` at
 * module load. Importing this file (once, before the worker claims its
 * first job) populates the registry. A new asynchronous capability adds
 * one line here and a new handler file — never a change to the engine.
 */
import "@/features/automation/handlers/send-communication.handler";
import "@/features/automation/handlers/reconcile-supplier-order.handler";
import "@/features/automation/handlers/sync-content.handler";
