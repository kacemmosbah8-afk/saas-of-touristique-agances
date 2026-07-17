import { z } from "zod";

import { SELECTABLE_PAYMENT_METHOD_TYPES } from "@/features/payment-config/lib/types";

/**
 * Only method types the platform can actually operate today are accepted —
 * see `SELECTABLE_PAYMENT_METHOD_TYPES`'s comment. Rejecting CARD/ARC_BSP_CASH
 * here (rather than accepting the selection and silently falling back to
 * BALANCE at execution time) means a tenant gets a clear "not available yet"
 * error the moment they try, not a booking that quietly pays a different way
 * than they chose.
 */
export const updatePaymentConfigurationSchema = z.object({
  methodType: z.enum(SELECTABLE_PAYMENT_METHOD_TYPES),
});

export type UpdatePaymentConfigurationInput = z.infer<typeof updatePaymentConfigurationSchema>;
