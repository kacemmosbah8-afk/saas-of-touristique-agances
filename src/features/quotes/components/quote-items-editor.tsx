"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";

import {
  addQuoteItemAction,
  updateQuoteItemAction,
  removeQuoteItemAction,
} from "@/features/quotes/actions/quote-item.action";
import {
  QUOTE_ITEM_TYPES,
  QUOTE_ITEM_TYPE_LABELS,
  quoteItemSchema,
  type QuoteItemInput,
} from "@/features/quotes/schemas/quote.schema";
import { lineAmount } from "@/shared/lib/money";
import type { QuoteItemView } from "@/features/quotes/queries/get-quote.query";
import type { CatalogEntry, PricingCatalog } from "@/features/quotes/queries/pricing-catalog.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  tenantId: string;
  quoteId: string;
  items: QuoteItemView[];
  currency: string;
  catalog: PricingCatalog;
  editable: boolean;
};

const EMPTY: QuoteItemInput = {
  type: "HOTEL",
  description: "",
  referenceId: "",
  quantity: 1,
  unitPrice: 0,
  notes: "",
};

const CATALOG_NONE = "__manual__";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function QuoteItemsEditor({
  tenantId,
  quoteId,
  items,
  currency,
  catalog,
  editable,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuoteItemInput>(EMPTY);

  // Index every catalog entry by referenceId so a picked value seeds the draft.
  const catalogGroups = useMemo(
    () =>
      [
        { label: "Hotels", entries: catalog.hotels },
        { label: "Activities", entries: catalog.activities },
        { label: "Guides", entries: catalog.guides },
        { label: "Transport", entries: catalog.transport },
      ].filter((g) => g.entries.length > 0),
    [catalog],
  );
  const catalogById = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    for (const g of catalogGroups) for (const e of g.entries) map.set(e.referenceId, e);
    return map;
  }, [catalogGroups]);
  const hasCatalog = catalogById.size > 0;

  function startAdd() {
    setDraft(EMPTY);
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(item: QuoteItemView) {
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

  /** Seed the draft line from a chosen inventory item (automated pricing). */
  function seedFromCatalog(referenceId: string) {
    if (referenceId === CATALOG_NONE) {
      setDraft((d) => ({ ...d, referenceId: "" }));
      return;
    }
    const entry = catalogById.get(referenceId);
    if (!entry) return;
    setDraft((d) => ({
      ...d,
      type: entry.type,
      description: entry.label,
      referenceId: entry.referenceId,
      // Seed the configured rate; leave a manual price untouched when the
      // inventory item has no rate (unitPrice === null).
      unitPrice: entry.unitPrice ?? d.unitPrice,
    }));
    if (entry.unitPrice === null) {
      toast.info("No rate on file for this item — enter the unit price.");
    }
  }

  function save() {
    const parsed = quoteItemSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid item.");
      return;
    }
    startTransition(async () => {
      const result = editingId
        ? await updateQuoteItemAction(tenantId, quoteId, editingId, parsed.data)
        : await addQuoteItemAction(tenantId, quoteId, parsed.data);
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
      const result = await removeQuoteItemAction(tenantId, quoteId, id);
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
                  <td className="px-3 py-2">{QUOTE_ITEM_TYPE_LABELS[item.type]}</td>
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
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-red-600 hover:text-red-700"
                          disabled={isPending}
                          onClick={() => remove(item.id)}
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
        <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No items yet. Add from your inventory catalog to auto-price, or enter lines manually.
        </p>
      )}

      {editable && showForm && (
        <div className="space-y-3 rounded-lg border p-3">
          {hasCatalog && (
            <div>
              <label className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
                <Sparkles className="size-3.5" />
                Add from catalog (auto-prices the line)
              </label>
              <Select value={CATALOG_NONE} onValueChange={seedFromCatalog}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick an inventory item…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATALOG_NONE}>Manual entry</SelectItem>
                  {catalogGroups.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.entries.map((e) => (
                        <SelectItem key={e.referenceId} value={e.referenceId}>
                          {e.label}
                          {e.unitPrice !== null ? ` · ${money(e.unitPrice, currency)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Type</label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft({ ...draft, type: v as QuoteItemInput["type"] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_ITEM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {QUOTE_ITEM_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Description</label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="3 nights — Hilton Marrakech, DBL"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Quantity</label>
              <Input
                type="number"
                min={1}
                value={draft.quantity}
                onChange={(e) =>
                  setDraft({ ...draft, quantity: e.target.value === "" ? 1 : Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Unit price</label>
              <Input
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
              <label className="text-muted-foreground mb-1 block text-xs">Notes (optional)</label>
              <Input
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
