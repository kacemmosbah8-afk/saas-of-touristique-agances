"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import {
  addBookingItemAction,
  updateBookingItemAction,
  removeBookingItemAction,
} from "@/features/bookings/actions/booking-item.action";
import {
  BOOKING_ITEM_TYPES,
  BOOKING_ITEM_TYPE_LABELS,
  bookingItemSchema,
  type BookingItemInput,
} from "@/features/bookings/schemas/booking.schema";
import { lineAmount } from "@/features/bookings/lib/totals";
import type { BookingItemView } from "@/features/bookings/queries/get-booking.query";
import { EmptyState } from "@/shared/components/empty-state";
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
  bookingId: string;
  items: BookingItemView[];
  currency: string;
  editable: boolean;
};

const EMPTY: BookingItemInput = {
  type: "HOTEL",
  description: "",
  referenceId: "",
  quantity: 1,
  unitPrice: 0,
  notes: "",
};

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function BookingItemsEditor({ tenantId, bookingId, items, currency, editable }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BookingItemInput>(EMPTY);

  function startAdd() {
    setDraft(EMPTY);
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(item: BookingItemView) {
    setDraft({
      type: item.type,
      description: item.description,
      referenceId: item.referenceId ?? "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes ?? "",
    });
    setAdding(false);
    setEditingId(item.id);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setDraft(EMPTY);
  }

  function save() {
    const parsed = bookingItemSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid item.");
      return;
    }
    startTransition(async () => {
      const result = editingId
        ? await updateBookingItemAction(tenantId, bookingId, editingId, parsed.data)
        : await addBookingItemAction(tenantId, bookingId, parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "Item updated." : "Item added.");
      cancel();
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeBookingItemAction(tenantId, bookingId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Item removed.");
      router.refresh();
    });
  }

  const draftAmount = lineAmount(draft.quantity, draft.unitPrice);
  const showForm = adding || editingId !== null;

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Unit</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                {editable && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">{BOOKING_ITEM_TYPE_LABELS[item.type]}</td>
                  <td className="px-3 py-2">
                    {item.description}
                    {item.notes && (
                      <span className="text-muted-foreground block text-xs">{item.notes}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {money(item.unitPrice, currency)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {money(item.amount, currency)}
                  </td>
                  {editable && (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          disabled={isPending}
                          onClick={() => startEdit(item)}
                          aria-label="Edit item"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-red-600 hover:text-red-700"
                          disabled={isPending}
                          onClick={() => remove(item.id)}
                          aria-label="Delete item"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <EmptyState
          title="No items yet. Add hotels, transfers, activities and more to build the booking."
          className="rounded-lg py-8"
        />
      )}

      {editable && showForm && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="booking-item-type" className="text-muted-foreground mb-1 block text-xs">
                Type
              </label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft({ ...draft, type: v as BookingItemInput["type"] })}
              >
                <SelectTrigger id="booking-item-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_ITEM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {BOOKING_ITEM_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                htmlFor="booking-item-description"
                className="text-muted-foreground mb-1 block text-xs"
              >
                Description
              </label>
              <Input
                id="booking-item-description"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="3 nights — Hilton Marrakech, DBL"
              />
            </div>
            <div>
              <label htmlFor="booking-item-quantity" className="text-muted-foreground mb-1 block text-xs">
                Quantity
              </label>
              <Input
                id="booking-item-quantity"
                type="number"
                min={1}
                value={draft.quantity}
                onChange={(e) =>
                  setDraft({ ...draft, quantity: e.target.value === "" ? 1 : Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label
                htmlFor="booking-item-unit-price"
                className="text-muted-foreground mb-1 block text-xs"
              >
                Unit price
              </label>
              <Input
                id="booking-item-unit-price"
                type="number"
                min={0}
                step="0.01"
                value={draft.unitPrice}
                onChange={(e) =>
                  setDraft({ ...draft, unitPrice: e.target.value === "" ? 0 : Number(e.target.value) })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="booking-item-notes" className="text-muted-foreground mb-1 block text-xs">
                Notes (optional)
              </label>
              <Input
                id="booking-item-notes"
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Line amount:{" "}
              <span className="font-medium tabular-nums">{money(draftAmount, currency)}</span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" disabled={isPending} onClick={save}>
                {editingId ? "Save item" : "Add item"}
              </Button>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={cancel}>
                <X className="mr-1 size-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {editable && !showForm && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={startAdd}>
          <Plus className="mr-1.5 size-4" />
          Add item
        </Button>
      )}
    </div>
  );
}
