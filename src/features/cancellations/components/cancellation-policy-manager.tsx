"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Star, Trash2, X } from "lucide-react";

import {
  createCancellationPolicyAction,
  updateCancellationPolicyAction,
  deleteCancellationPolicyAction,
} from "@/features/cancellations/actions/cancellation-policy.action";
import {
  cancellationPolicyFormSchema,
  PENALTY_TYPES,
  PENALTY_TYPE_LABELS,
  type CancellationPolicyFormInput,
  type PolicyRuleInput,
} from "@/features/cancellations/schemas/cancellation.schema";
import type { CancellationPolicyView } from "@/features/cancellations/queries/cancellation.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const EMPTY: CancellationPolicyFormInput = {
  name: "",
  description: "",
  isDefault: false,
  rules: [
    { daysBefore: 30, penaltyType: "NONE", penaltyValue: 0 },
    { daysBefore: 0, penaltyType: "PERCENTAGE", penaltyValue: 100 },
  ],
};

type Props = {
  tenantId: string;
  policies: CancellationPolicyView[];
  canEdit: boolean;
};

export function CancellationPolicyManager({ tenantId, policies, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CancellationPolicyFormInput>(EMPTY);

  function startCreate() {
    setDraft(EMPTY);
    setEditingId(null);
    setCreating(true);
  }

  function startEdit(policy: CancellationPolicyView) {
    setDraft({
      name: policy.name,
      description: policy.description ?? "",
      isDefault: policy.isDefault,
      rules: policy.rules.map((r) => ({
        daysBefore: r.daysBefore,
        penaltyType: r.penaltyType,
        penaltyValue: r.penaltyValue,
      })),
    });
    setCreating(false);
    setEditingId(policy.id);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setDraft(EMPTY);
  }

  function setRule(index: number, patch: Partial<PolicyRuleInput>) {
    setDraft((d) => ({
      ...d,
      rules: d.rules.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }

  function save() {
    const parsed = cancellationPolicyFormSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid policy.");
      return;
    }
    startTransition(async () => {
      const result = editingId
        ? await updateCancellationPolicyAction(tenantId, editingId, parsed.data)
        : await createCancellationPolicyAction(tenantId, parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "Policy updated." : "Policy created.");
      cancelForm();
      router.refresh();
    });
  }

  function remove(policyId: string) {
    startTransition(async () => {
      const result = await deleteCancellationPolicyAction(tenantId, policyId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Policy deleted.");
      router.refresh();
    });
  }

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Tiered cancellation terms assigned to bookings. On cancellation the matching tier
        (by days before travel) sets the penalty, and the refund due is calculated from what
        the customer has actually paid.
      </p>

      {policies.length === 0 && !showForm && (
        <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No cancellation policies yet.
        </p>
      )}

      {policies.length > 0 && (
        <ul className="space-y-2">
          {policies.map((p) => (
            <li key={p.id} className="rounded-lg border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {p.name}
                    {p.isDefault && (
                      <Star
                        className="size-3.5 fill-amber-400 text-amber-400"
                        aria-label="Default policy"
                      />
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {p.rules
                      .map(
                        (r) =>
                          `≥${r.daysBefore}d: ${
                            r.penaltyType === "NONE"
                              ? "free"
                              : r.penaltyType === "PERCENTAGE"
                                ? `${r.penaltyValue}%`
                                : r.penaltyValue.toFixed(2)
                          }`,
                      )
                      .join(" · ")}
                    {p.bookingCount > 0 && ` · ${p.bookingCount} booking(s)`}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={isPending}
                      onClick={() => startEdit(p)}
                      aria-label="Edit policy"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-red-600 hover:text-red-700"
                      disabled={isPending}
                      onClick={() => remove(p.id)}
                      aria-label="Delete policy"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && showForm && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Name</label>
              <Input
                placeholder="Standard tour policy"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Description</label>
              <Input
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="policy-default"
              className="accent-primary size-4"
              checked={draft.isDefault === true}
              onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}
            />
            <label htmlFor="policy-default" className="text-sm">
              Default policy for new assignments
            </label>
          </div>

          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Tiers (matched top-down by days before travel)
            </p>
            <div className="space-y-2">
              {draft.rules.map((rule, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs">≥</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 w-20"
                    value={rule.daysBefore}
                    onChange={(e) =>
                      setRule(i, { daysBefore: e.target.value === "" ? 0 : Number(e.target.value) })
                    }
                  />
                  <span className="text-muted-foreground text-xs">days before →</span>
                  <Select
                    value={rule.penaltyType}
                    onValueChange={(v) =>
                      setRule(i, { penaltyType: v as PolicyRuleInput["penaltyType"] })
                    }
                  >
                    <SelectTrigger className="h-8 w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PENALTY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {PENALTY_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rule.penaltyType !== "NONE" && (
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-8 w-24"
                      value={rule.penaltyValue}
                      onChange={(e) =>
                        setRule(i, {
                          penaltyValue: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                    />
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-red-600 hover:text-red-700"
                    disabled={isPending || draft.rules.length <= 1}
                    onClick={() =>
                      setDraft((d) => ({ ...d, rules: d.rules.filter((_, j) => j !== i) }))
                    }
                    aria-label="Remove tier"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              disabled={isPending || draft.rules.length >= 20}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  rules: [...d.rules, { daysBefore: 0, penaltyType: "PERCENTAGE", penaltyValue: 50 }],
                }))
              }
            >
              <Plus className="mr-1 size-3.5" />
              Add tier
            </Button>
          </div>

          <div className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={save}>
              {editingId ? "Save policy" : "Create policy"}
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={cancelForm}>
              <X className="mr-1 size-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {canEdit && !showForm && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={startCreate}>
          <Plus className="mr-1.5 size-4" />
          New policy
        </Button>
      )}
    </div>
  );
}
