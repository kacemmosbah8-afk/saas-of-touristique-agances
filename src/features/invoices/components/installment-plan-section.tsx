"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Trash2, X } from "lucide-react";

import {
  createInstallmentPlanAction,
  removeInstallmentPlanAction,
} from "@/features/invoices/actions/installment.action";
import {
  installmentPlanSchema,
  type InstallmentPlanInput,
} from "@/features/invoices/schemas/invoice.schema";
import type { InstallmentPlanView } from "@/features/invoices/queries/get-invoice.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function defaultFirstDue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

type Props = {
  tenantId: string;
  invoiceId: string;
  currency: string;
  plan: InstallmentPlanView | null;
  /** Invoice open for collection AND caller holds invoice:update. */
  canManagePlan: boolean;
};

export function InstallmentPlanSection({
  tenantId,
  invoiceId,
  currency,
  plan,
  canManagePlan,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<InstallmentPlanInput>({
    depositAmount: 0,
    installmentCount: 3,
    firstDueDate: defaultFirstDue(),
    intervalDays: 30,
    notes: "",
  });

  function confirmCreate() {
    const parsed = installmentPlanSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid plan.");
      return;
    }
    startTransition(async () => {
      const result = await createInstallmentPlanAction(tenantId, invoiceId, parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment plan created.");
      setCreating(false);
      router.refresh();
    });
  }

  function removePlan() {
    startTransition(async () => {
      const result = await removeInstallmentPlanAction(tenantId, invoiceId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment plan removed.");
      router.refresh();
    });
  }

  if (!plan && !canManagePlan) return null;

  return (
    <div className="space-y-3">
      {plan && (
        <>
          <ol className="space-y-2">
            {plan.installments.map((i) => {
              const overdue =
                i.status === "PENDING" && new Date(i.dueDate).getTime() < Date.now();
              return (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{i.label}</p>
                    <p
                      className={cn(
                        "text-xs",
                        overdue
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-muted-foreground",
                      )}
                    >
                      Due{" "}
                      {new Date(i.dueDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      {overdue ? " · overdue" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">{money(i.amount, currency)}</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        i.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {i.status === "PAID" ? "Paid" : "Pending"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          {canManagePlan && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              disabled={isPending}
              onClick={removePlan}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Remove plan
            </Button>
          )}
        </>
      )}

      {!plan && creating && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Deposit (0 for none)
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={draft.depositAmount ?? 0}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    depositAmount: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Installments</label>
              <Input
                type="number"
                min={1}
                max={36}
                value={draft.installmentCount}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    installmentCount: e.target.value === "" ? 1 : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">First due date</label>
              <Input
                type="date"
                value={draft.firstDueDate}
                onChange={(e) => setDraft({ ...draft, firstDueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Days between installments
              </label>
              <Input
                type="number"
                min={1}
                max={365}
                value={draft.intervalDays}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    intervalDays: e.target.value === "" ? 30 : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            The remaining balance after the deposit is split evenly (cents-exact) across the
            installments.
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={confirmCreate}>
              Create plan
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setCreating(false)}>
              <X className="mr-1 size-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!plan && canManagePlan && !creating && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setCreating(true)}>
          <CalendarClock className="mr-1.5 size-4" />
          Set up payment plan
        </Button>
      )}
    </div>
  );
}
