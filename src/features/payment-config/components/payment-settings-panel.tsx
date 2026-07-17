"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Wallet } from "lucide-react";

import { updatePaymentConfigurationAction } from "@/features/payment-config/actions/payment-config.action";
import type { PaymentConfigurationView } from "@/features/payment-config/lib/types";
import { PAYMENT_METHOD_LABELS, SELECTABLE_PAYMENT_METHOD_TYPES } from "@/features/payment-config/lib/types";
import type { PaymentMethodType, ProviderType } from "@prisma/client";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  tenantId: string;
  provider: ProviderType;
  providerName: string;
  configuration: PaymentConfigurationView;
  /** Which account's calls this method type actually applies to — "tenant" (this agency's own Duffel account) or "environment" (the platform's shared account), or null if not connected at all. */
  credentialSource: "tenant" | "environment" | null;
  canManage: boolean;
};

const NOT_YET_AVAILABLE: PaymentMethodType[] = ["CARD", "ARC_BSP_CASH"];

export function PaymentSettingsPanel({
  tenantId,
  provider,
  providerName,
  configuration,
  credentialSource,
  canManage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [methodType, setMethodType] = useState<PaymentMethodType>(configuration.methodType);

  function save() {
    if (!SELECTABLE_PAYMENT_METHOD_TYPES.includes(methodType as never)) {
      toast.error(`${PAYMENT_METHOD_LABELS[methodType]} isn't available yet.`);
      return;
    }
    startTransition(async () => {
      const result = await updatePaymentConfigurationAction(tenantId, provider, {
        methodType: methodType as (typeof SELECTABLE_PAYMENT_METHOD_TYPES)[number],
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment configuration updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Wallet className="text-muted-foreground size-4" />
          <h2 className="text-sm font-medium">Currently active</h2>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <p className="text-lg font-semibold">{configuration.label}</p>
          <Badge variant={configuration.isConfigured ? "secondary" : "outline"}>
            {configuration.isConfigured ? "Configured" : "Default"}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {credentialSource === "tenant" ? (
            <>
              This agency&rsquo;s own {providerName} account is connected. The balance charged is
              whatever funding source (bank transfer) is configured directly in{" "}
              <strong>this agency&rsquo;s own {providerName} dashboard</strong> — TravelOS never
              sees or stores that funding source.
            </>
          ) : credentialSource === "environment" ? (
            <>
              This agency is currently using the <strong>platform&rsquo;s shared {providerName}
              account</strong>. The balance charged is whatever funding source is configured in the
              platform&rsquo;s {providerName} dashboard, not this agency&rsquo;s own.
            </>
          ) : (
            <>{providerName} isn&rsquo;t connected for this agency yet.</>
          )}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h2 className="text-sm font-medium">Payment method</h2>
          <p className="text-muted-foreground text-xs">
            Controls how {providerName} is asked to pay when a booking is confirmed — never a
            change to the booking flow itself.
          </p>
        </div>

        <Select
          value={methodType}
          onValueChange={(v) => setMethodType(v as PaymentMethodType)}
          disabled={!canManage}
        >
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodType[]).map((type) => (
              <SelectItem key={type} value={type} disabled={NOT_YET_AVAILABLE.includes(type)}>
                {PAYMENT_METHOD_LABELS[type]}
                {NOT_YET_AVAILABLE.includes(type) ? " — not available yet" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {NOT_YET_AVAILABLE.includes(methodType) && (
          <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm">
            <CreditCard className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground">
              Card payments require {providerName}&rsquo;s own secure card-collection component and
              a per-booking 3D Secure session — a separate frontend flow, not yet built. This
              option is reserved so the architecture doesn&rsquo;t need to change when it is.
            </p>
          </div>
        )}

        <p className="text-muted-foreground text-xs">
          Want to replace the account entirely — e.g. switch from the platform&rsquo;s shared{" "}
          {providerName} account to this agency&rsquo;s own? Connect the agency&rsquo;s own
          credentials from the main Integrations page; this page only controls how the connected
          account is asked to pay.
        </p>

        {canManage && (
          <Button size="sm" disabled={isPending || methodType === configuration.methodType} onClick={save}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        )}
      </section>
    </div>
  );
}
