"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";

import type { InventoryItem } from "@/features/package-inventory/queries/get-package-inventory.query";
import type { InventoryOption } from "@/features/package-inventory/queries/inventory-options.query";
import { RESOURCE_STATUS_LABELS } from "@/shared/lib/resource-status";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  title: string;
  items: InventoryItem[];
  options: InventoryOption[];
  canEdit: boolean;
  emptyLabel: string;
  onAttach: (resourceId: string) => Promise<{ ok: boolean; error?: string }>;
  onDetach: (joinId: string) => Promise<{ ok: boolean; error?: string }>;
  onReorder: (orderedIds: string[]) => Promise<{ ok: boolean; error?: string }>;
};

function SortableRow({
  item,
  canEdit,
  onDetach,
}: {
  item: InventoryItem;
  canEdit: boolean;
  onDetach: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-2 rounded-md border px-3 py-2"
    >
      {canEdit && (
        <button
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <span className="flex-1 text-sm font-medium">{item.name}</span>
      {item.status !== "ACTIVE" && (
        <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-xs">
          {RESOURCE_STATUS_LABELS[item.status]}
        </span>
      )}
      {canEdit && (
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive size-7"
          onClick={onDetach}
          aria-label="Remove"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

export function InventorySection({
  title,
  items: initialItems,
  options,
  canEdit,
  emptyLabel,
  onAttach,
  onDetach,
  onReorder,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Options not already attached.
  const attachedIds = new Set(items.map((i) => i.resourceId));
  const availableOptions = options.filter((o) => !attachedIds.has(o.id));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const previous = items;
    setItems(reordered);

    startTransition(async () => {
      const result = await onReorder(reordered.map((i) => i.id));
      if (!result.ok) {
        toast.error(result.error ?? "Failed to reorder.");
        setItems(previous);
      }
    });
  }

  function handleAttach() {
    if (!selected) return;
    const resourceId = selected;
    setSelected("");
    startTransition(async () => {
      const result = await onAttach(resourceId);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to add.");
        return;
      }
      toast.success("Added.");
    });
  }

  function handleDetach(joinId: string) {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== joinId));
    startTransition(async () => {
      const result = await onDetach(joinId);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to remove.");
        setItems(previous);
      }
    });
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>

      {items.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm">
          {emptyLabel}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  onDetach={() => handleDetach(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {canEdit && (
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue
                placeholder={availableOptions.length > 0 ? "Select to add…" : "Nothing available"}
              />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected}
            onClick={handleAttach}
          >
            <Plus className="mr-1.5 size-4" />
            Add
          </Button>
        </div>
      )}
    </section>
  );
}
