"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { updateModuleSettingsAction } from "@/features/settings/actions/settings.action";
import type {
  PricingSettings,
  PricingPolicy,
  PricingComponent,
} from "@/features/pricing/schemas/pricing.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  tenantId: string;
  settings: PricingSettings;
  canEdit: boolean;
};

/**
 * The Universal Pricing Engine's tenant-facing configuration. Every
 * customer-facing price passes through this policy — see
 * `features/pricing/lib/calculate.ts` for the calculation itself and
 * PROJECT.md, "Universal Pricing Engine" for the full component list.
 *
 * A generic row editor over all thirteen `PricingComponent` types (not a
 * fixed set of fields) — new component types the engine adds later need
 * only a new `COMPONENT_META` entry here, never a new form section. Rows
 * apply in the order shown (`calculatePrice`'s own documented order:
 * additive/subtractive components compound top-to-bottom; MIN/MAX_MARKUP
 * and ROUND_TO_NEAREST always apply last regardless of row position).
 */

type ComponentType = PricingComponent["type"];

type ValueKind = "amount" | "percent" | "unit";

const COMPONENT_META: Record<ComponentType, { label: string; value: ValueKind; hasCode?: boolean }> = {
  MARKUP_FIXED: { label: "Fixed markup", value: "amount" },
  MARKUP_PERCENT: { label: "Percentage markup", value: "percent" },
  COMMISSION_PERCENT: { label: "Commission %", value: "percent" },
  FEE_FIXED: { label: "Fixed fee", value: "amount" },
  FEE_PERCENT: { label: "Percentage fee", value: "percent" },
  TAX_PERCENT: { label: "Tax (placeholder) %", value: "percent" },
  DISCOUNT_FIXED: { label: "Fixed discount", value: "amount" },
  DISCOUNT_PERCENT: { label: "Percentage discount", value: "percent" },
  COUPON_FIXED: { label: "Coupon (fixed amount)", value: "amount", hasCode: true },
  PROMO_PERCENT: { label: "Promotional discount %", value: "percent" },
  MIN_MARKUP_PERCENT: { label: "Minimum markup % (floor)", value: "percent" },
  MAX_MARKUP_PERCENT: { label: "Maximum markup % (ceiling)", value: "percent" },
  ROUND_TO_NEAREST: { label: "Round to nearest", value: "unit" },
};

const COMPONENT_TYPES = Object.keys(COMPONENT_META) as ComponentType[];
const SUPPLIERS = ["HOTELBEDS", "DUFFEL", "AMADEUS"] as const;

function defaultComponentFor(type: ComponentType): PricingComponent {
  const meta = COMPONENT_META[type];
  if (meta.value === "amount") {
    return meta.hasCode ? { type: type as "COUPON_FIXED", amount: 0, code: "" } : { type: type as "MARKUP_FIXED", amount: 0 };
  }
  if (meta.value === "unit") return { type: "ROUND_TO_NEAREST", unit: 1 };
  return { type: type as "MARKUP_PERCENT", percent: 0 };
}

function componentValue(component: PricingComponent): number {
  if ("amount" in component) return component.amount;
  if ("percent" in component) return component.percent;
  return component.unit;
}

function withValue(component: PricingComponent, value: number): PricingComponent {
  if ("amount" in component) return { ...component, amount: value };
  if ("percent" in component) return { ...component, percent: value };
  return { ...component, unit: value };
}

function ComponentRow({
  component,
  onChange,
  onRemove,
  disabled,
}: {
  component: PricingComponent;
  onChange: (next: PricingComponent) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const meta = COMPONENT_META[component.type];
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-2">
      <div className="min-w-[180px] flex-1 space-y-1">
        <label className="text-muted-foreground text-[11px]">Rule</label>
        <Select
          value={component.type}
          disabled={disabled}
          onValueChange={(type) => onChange(defaultComponentFor(type as ComponentType))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPONENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {COMPONENT_META[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-28 space-y-1">
        <label className="text-muted-foreground text-[11px]">
          {meta.value === "percent" ? "Percent" : meta.value === "unit" ? "Unit" : "Amount"}
        </label>
        <Input
          type="number"
          min={meta.value === "unit" ? 0.01 : 0}
          step={meta.value === "percent" ? "0.1" : "0.01"}
          disabled={disabled}
          value={componentValue(component)}
          onChange={(e) => onChange(withValue(component, Number(e.target.value) || 0))}
        />
      </div>
      {meta.hasCode && "code" in component && (
        <div className="w-32 space-y-1">
          <label className="text-muted-foreground text-[11px]">Code (optional)</label>
          <Input
            disabled={disabled}
            value={component.code ?? ""}
            onChange={(e) => onChange({ ...component, code: e.target.value })}
          />
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function PolicyEditor({
  policy,
  onChange,
  disabled,
}: {
  policy: PricingPolicy;
  onChange: (next: PricingPolicy) => void;
  disabled: boolean;
}) {
  function updateRow(i: number, next: PricingComponent) {
    const components = [...policy.components];
    components[i] = next;
    onChange({ components });
  }
  function removeRow(i: number) {
    onChange({ components: policy.components.filter((_, idx) => idx !== i) });
  }
  function addRow() {
    onChange({ components: [...policy.components, defaultComponentFor("MARKUP_PERCENT")] });
  }

  return (
    <div className="space-y-2">
      {policy.components.length === 0 && (
        <p className="text-muted-foreground text-xs">No rules — this policy prices at cost (zero markup).</p>
      )}
      {policy.components.map((component, i) => (
        <ComponentRow
          key={i}
          component={component}
          onChange={(next) => updateRow(i, next)}
          onRemove={() => removeRow(i)}
          disabled={disabled}
        />
      ))}
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addRow}>
        <Plus className="mr-1 size-3.5" />
        Add rule
      </Button>
    </div>
  );
}

export function PricingSettingsForm({ tenantId, settings, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [defaultPolicy, setDefaultPolicy] = useState<PricingPolicy>(settings.default);
  const [overrideEnabled, setOverrideEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(SUPPLIERS.map((s) => [s, s in settings.overrides])),
  );
  const [overridePolicy, setOverridePolicy] = useState<Record<string, PricingPolicy>>(
    Object.fromEntries(SUPPLIERS.map((s) => [s, settings.overrides[s] ?? { components: [] }])),
  );

  function save() {
    const overrides: PricingSettings["overrides"] = {};
    for (const supplier of SUPPLIERS) {
      if (overrideEnabled[supplier]) {
        overrides[supplier] = overridePolicy[supplier];
      }
    }
    const next: PricingSettings = { default: defaultPolicy, overrides };

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
      <p className="text-muted-foreground text-sm">
        Every customer-facing price — search results, booking confirmation, invoices, the
        Customer Portal — is computed from this policy. Supplier wholesale/net rates are never
        shown directly. Rules apply top to bottom; minimum/maximum markup and rounding always
        apply last regardless of where they appear in the list.
      </p>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Default policy (applies to every supplier)</h3>
        <PolicyEditor policy={defaultPolicy} onChange={setDefaultPolicy} disabled={!canEdit || isPending} />
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
              <PolicyEditor
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
