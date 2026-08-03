"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";

import {
  requestConfirmationAction,
  confirmSupplierConfirmationAction,
  rejectSupplierConfirmationAction,
} from "@/features/confirmations/actions/confirmation.action";
import type { ConfirmableItem } from "@/features/confirmations/queries/booking-confirmations.query";
import type { SupplierOption } from "@/features/suppliers/queries/supplier-options.query";
import { BOOKING_ITEM_TYPE_LABELS } from "@/features/bookings/schemas/booking.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";
import type { AdminDictionary } from "@/shared/i18n/admin-dictionary";

const NO_SUPPLIER = "__none__";

const CONFIRMATION_TONE: Record<string, StatusTone> = {
  CONFIRMED: "success",
  PENDING: "warning",
  REJECTED: "danger",
};

type Props = {
  tenantId: string;
  bookingId: string;
  items: ConfirmableItem[];
  editable: boolean;
  suppliers: SupplierOption[];
  dict: AdminDictionary["confirmations"];
  commonDict: AdminDictionary["common"];
};

type Flow =
  | { kind: "request"; itemId: string }
  | { kind: "confirm"; confirmationId: string }
  | { kind: "reject"; confirmationId: string }
  | null;

export function ConfirmationsSection({
  tenantId,
  bookingId,
  items,
  editable,
  suppliers,
  dict,
  commonDict,
}: Props) {
  const STATUS_LABELS: Record<string, string> = {
    PENDING: dict.statusPending,
    CONFIRMED: dict.statusConfirmed,
    REJECTED: dict.statusRejected,
  };

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [flow, setFlow] = useState<Flow>(null);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setFlow(null);
    setSupplierId("");
    setSupplierName("");
    setConfirmationNumber("");
    setNotes("");
  }

  function selectSupplier(value: string) {
    if (value === NO_SUPPLIER) {
      setSupplierId("");
      return;
    }
    setSupplierId(value);
    const match = suppliers.find((s) => s.id === value);
    if (match) setSupplierName(match.name);
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? commonDict.somethingWentWrong);
        return;
      }
      toast.success(success);
      reset();
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed py-4 text-center text-xs">
        {dict.addLineItemsHint}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((item) => {
          const c = item.confirmation;
          return (
            <li key={item.id} className="rounded-lg border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.description}</p>
                  <p className="text-muted-foreground text-xs">
                    {BOOKING_ITEM_TYPE_LABELS[item.type]}
                    {c?.supplierName ? ` · ${c.supplierName}` : ""}
                    {c?.status === "CONFIRMED" && c.confirmationNumber
                      ? ` · #${c.confirmationNumber}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c ? (
                    <StatusBadge tone={CONFIRMATION_TONE[c.status] ?? "neutral"}>
                      {STATUS_LABELS[c.status]}
                    </StatusBadge>
                  ) : (
                    <span className="text-muted-foreground text-xs">{dict.notRequested}</span>
                  )}

                  {editable && !c && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={isPending}
                      onClick={() => {
                        reset();
                        setFlow({ kind: "request", itemId: item.id });
                      }}
                    >
                      <Send className="mr-1 size-3" />
                      {dict.request}
                    </Button>
                  )}
                  {editable && c?.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={isPending}
                        onClick={() => {
                          reset();
                          setFlow({ kind: "confirm", confirmationId: c.id });
                        }}
                      >
                        {dict.confirm}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        disabled={isPending}
                        onClick={() => {
                          reset();
                          setFlow({ kind: "reject", confirmationId: c.id });
                        }}
                      >
                        {dict.reject}
                      </Button>
                    </>
                  )}
                  {editable && c?.status === "REJECTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={isPending}
                      onClick={() => {
                        reset();
                        setFlow({ kind: "request", itemId: item.id });
                      }}
                    >
                      {dict.reRequest}
                    </Button>
                  )}
                </div>
              </div>

              {flow?.kind === "request" && flow.itemId === item.id && (
                <div className="mt-2 space-y-2 border-t pt-2">
                  {suppliers.length > 0 && (
                    <Select value={supplierId || NO_SUPPLIER} onValueChange={selectSupplier}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={dict.linkSupplierPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_SUPPLIER}>{dict.noSupplierRecord}</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    placeholder={dict.supplierNamePlaceholder}
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        run(
                          () =>
                            requestConfirmationAction(tenantId, bookingId, item.id, {
                              supplierId,
                              supplierName,
                              notes: "",
                            }),
                          dict.confirmationRequested,
                        )
                      }
                    >
                      {dict.sendRequest}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={reset}>
                      {commonDict.cancel}
                    </Button>
                  </div>
                </div>
              )}

              {flow?.kind === "confirm" && c && flow.confirmationId === c.id && (
                <div className="mt-2 space-y-2 border-t pt-2">
                  <Input
                    placeholder={dict.confirmationNumberPlaceholder}
                    value={confirmationNumber}
                    onChange={(e) => setConfirmationNumber(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isPending || !confirmationNumber.trim()}
                      onClick={() =>
                        run(
                          () =>
                            confirmSupplierConfirmationAction(tenantId, c.id, {
                              confirmationNumber: confirmationNumber.trim(),
                              notes: "",
                            }),
                          dict.markedConfirmed,
                        )
                      }
                    >
                      {dict.saveConfirmation}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={reset}>
                      {commonDict.cancel}
                    </Button>
                  </div>
                </div>
              )}

              {flow?.kind === "reject" && c && flow.confirmationId === c.id && (
                <div className="mt-2 space-y-2 border-t pt-2">
                  <Input
                    placeholder={dict.reasonPlaceholder}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      disabled={isPending}
                      onClick={() =>
                        run(
                          () => rejectSupplierConfirmationAction(tenantId, c.id, { notes }),
                          dict.markedRejected,
                        )
                      }
                    >
                      {dict.markRejected}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={reset}>
                      {commonDict.cancel}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
