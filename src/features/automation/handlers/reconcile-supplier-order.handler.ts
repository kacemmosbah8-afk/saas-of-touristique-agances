import "server-only";
import { z } from "zod";

import { getTenantDb } from "@/shared/lib/db";
import { getHotelbedsClientForTenant } from "@/features/integrations/lib/client-factory";
import { createHotelbedsExecutionProvider } from "@/features/supplier-execution/providers/hotelbeds/hotelbeds-execution-provider";
import { reconcileSupplierOrder } from "@/features/supplier-execution/lib/reconciliation";
import type { JobHandler, JobHandlerResult, JobContext } from "@/features/automation/lib/types";
import { registerJobHandler } from "@/features/automation/lib/registry";

export const RECONCILE_SUPPLIER_ORDER_JOB_TYPE = "RECONCILE_SUPPLIER_ORDER";

const payloadSchema = z.object({
  tenantId: z.string().min(1),
  supplierOrderId: z.string().min(1),
});

export type ReconcileSupplierOrderJobPayload = z.infer<typeof payloadSchema>;

/**
 * The Booking Status Resolution Capability's automatic path — riding the
 * Platform Automation Capability's existing Job/JobEvent tables and the
 * existing `/api/jobs/process` cron (every 5 minutes, see `vercel.json`),
 * exactly the way `SEND_COMMUNICATION` already does. No polling loop, no
 * cron-specific code, and no scheduling logic live here: returning
 * `retryable: true` while still AWAITING_SUPPLIER_CONFIRMATION hands
 * "check again later" entirely to the engine's own backoff
 * (`nextAvailableAt`, capped at 30 minutes) — this handler only answers
 * "is it resolved yet."
 */
async function handle(payload: unknown, context: JobContext): Promise<JobHandlerResult> {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      retryable: false,
      message: `Invalid RECONCILE_SUPPLIER_ORDER payload: ${parsed.error.issues[0]?.message ?? "unknown error"}.`,
    };
  }

  const tenantId = context.tenantId ?? parsed.data.tenantId;
  const db = getTenantDb(tenantId);

  const order = await db.supplierOrder.findFirst({
    where: { id: parsed.data.supplierOrderId, tenantId },
    select: { provider: true },
  });
  if (!order) {
    // Nothing to reconcile (deleted / never existed) — not retryable.
    return { ok: true };
  }
  if (order.provider !== "HOTELBEDS") {
    return {
      ok: false,
      retryable: false,
      message: `No reconciliation strategy for provider "${order.provider}".`,
    };
  }

  const clientResult = await getHotelbedsClientForTenant(db, tenantId);
  if (!clientResult.ok) {
    // Credentials may be mid-rotation; worth another attempt rather than
    // dead-lettering on the first hiccup.
    return { ok: false, retryable: true, message: clientResult.error };
  }
  const provider = createHotelbedsExecutionProvider(clientResult.client);

  const result = await reconcileSupplierOrder(db, tenantId, parsed.data.supplierOrderId, provider);

  switch (result.outcome) {
    case "confirmed":
    case "cancelled":
    case "not_applicable":
      return { ok: true };
    case "still_awaiting":
      return { ok: false, retryable: true, message: "Still awaiting supplier confirmation." };
    case "check_failed":
      return { ok: false, retryable: result.retryable, message: result.message };
  }
}

export const reconcileSupplierOrderJobHandler: JobHandler = {
  type: RECONCILE_SUPPLIER_ORDER_JOB_TYPE,
  handle,
};

registerJobHandler(reconcileSupplierOrderJobHandler);
