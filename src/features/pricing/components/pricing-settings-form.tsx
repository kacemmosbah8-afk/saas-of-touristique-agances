"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateModuleSettingsAction } from "@/features/settings/actions/settings.action";
import type { PricingSettings, PricingPolicy } from "@/features/pricing/schemas/pricing.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Props = {
  tenantId: string;
  settings: PricingSettings;
  canEdit: boolean;
};

/**
 * The Universal Pricing Engine's tenant-facing configuration. Deliberately
 * exposes the most common fields (percentage/fixed markup, min/max markup)
 * rather than a generic editor for all thirteen component types the engine
 * supports — the full `PricingComponent` vocabulary (commission, fees, tax
 * placeholder, coupons, promo, rounding) is reachable by editing
 * `TenantSettings.pricingSettings` directly (or a future richer editor);
 * this form covers the policy every agency needs on day one. See
 * PROJECT.md, "Universal Pricing Engine" for the full component list.
 */

const SUPPLIERS = ["HOTELBEDS", "DUFFEL", "AMADEUS"] as const;

type SimplePolicy = {
  markupPercent: number;
  markupFixed: number;
  minMarkupPercent: number;
  maxMarkupPercent: number;
};

const EMPTY_POLICY: SimplePolicy = { markupPercent: 0, markupFixed: 0, minMarkupPercent: 0, maxMarkupPercent: 0 };

function toSimplePolicy(policy: PricingPolicy | undefined): SimplePolicy {
  const result = { ...EMPTY_POLICY };
  for (const c of policy?.components ?? []) {
    if (c.type === "MARKUP_PERCENT") result.markupPercent = c.percent;
    else if (c.type === "MARKUP_FIXED") result.markupFixed = c.amount;
    else if (c.type === "MIN_MARKUP_PERCENT") result.minMarkupPercent = c.percent;
    else if (c.type === "MAX_MARKUP_PERCENT") result.maxMarkupPercent = c.percent;
  }
  return result;
}

function toPolicy(simple: SimplePolicy): PricingPolicy {
  const components: PricingPolicy["components"] = [];
  if (simple.markupPercent > 0) components.push({ type: "MARKUP_PERCENT", percent: simple.markupPercent });
  if (simple.markupFixed > 0) components.push({ type: "MARKUP_FIXED", amount: simple.markupFixed });
  if (simple.minMarkupPercent > 0) components.push({ type: "MIN_MARKUP_PERCENT", percent: simple.minMarkupPercent });
  if (simple.maxMarkupPercent > 0) components.push({ type: "MAX_MARKUP_PERCENT", percent: simple.maxMarkupPercent });
  return { components };
}

function PolicyFields({
  policy,
  onChange,
  disabled,
}: {
  policy: SimplePolicy;
  onChange: (next: SimplePolicy) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Markup %</label>
        <Input
          type="number"
          min={0}
          step="0.1"
          disabled={disabled}
          value={policy.markupPercent}
          onChange={(e) => onChange({ ...policy, markupPercent: Number(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Fixed markup</label>
        <Input
          type="number"
          min={0}
          step="0.01"
          disabled={disabled}
          value={policy.markupFixed}
          onChange={(e) => onChange({ ...policy, markupFixed: Number(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Min markup %</label>
        <Input
          type="number"
          min={0}
          step="0.1"
          disabled={disabled}
          value={policy.minMarkupPercent}
          onChange={(e) => onChange({ ...policy, minMarkupPercent: Number(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Max markup %</label>
        <Input
          type="number"
          min={0}
          step="0.1"
          disabled={disabled}
          value={policy.maxMarkupPercent}
          onChange={(e) => onChange({ ...policy, maxMarkupPercent: Number(e.target.value) || 0 })}
        />
      </div>
    </div>
  );
}

export function PricingSettingsForm({ tenantId, settings, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [defaultPolicy, setDefaultPolicy] = useState(toSimplePolicy(settings.default));
  const [overrideEnabled, setOverrideEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(SUPPLIERS.map((s) => [s, s in settings.overrides])),
  );
  const [overridePolicy, setOverridePolicy] = useState<Record<string, SimplePolicy>>(
    Object.fromEntries(SUPPLIERS.map((s) => [s, toSimplePolicy(settings.overrides[s])])),
  );

  function save() {
    const overrides: PricingSettings["overrides"] = {};
    for (const supplier of SUPPLIERS) {
      if (overrideEnabled[supplier]) {
        overrides[supplier] = toPolicy(overridePolicy[supplier]);
      }
    }
    const next: PricingSettings = { default: toPolicy(defaultPolicy), overrides };

    startTransition(async () => {
      const result = await updateModuleSettingsAction(tenantId, { module: "pricing", settings: next });
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("Pricing settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          Every customer-facing price — search results, booking confirmation, invoices, the
          Customer Portal — is computed from this policy. Supplier wholesale/net rates are never
          shown directly. Leave a field at 0 to skip it.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Default policy (applies to every supplier)</h3>
        <PolicyFields policy={defaultPolicy} onChange={setDefaultPolicy} disabled={!canEdit || isPending} />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium">Supplier overrides</h3>
        {SUPPLIERS.map((supplier) => (
          <div key={supplier} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{supplier}</span>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={overrideEnabled[supplier]}
                  disabled={!canEdit || isPending}
                  onChange={(e) =>
                    setOverrideEnabled((prev) => ({ ...prev, [supplier]: e.target.checked }))
                  }
                  className="size-4 rounded border-gray-300"
                />
                <span className="text-muted-foreground">Override default</span>
              </label>
            </div>
            {overrideEnabled[supplier] && (
              <PolicyFields
                policy={overridePolicy[supplier]}
                onChange={(next) => setOverridePolicy((prev) => ({ ...prev, [supplier]: next }))}
                disabled={!canEdit || isPending}
              />
            )}
          </div>
        ))}
      </section>

      {canEdit && (
        <Button onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : "Save pricing settings"}
        </Button>
      )}
    </div>
  );
}
