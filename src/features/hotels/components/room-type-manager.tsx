"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BedDouble, Pencil, Plus, Trash2, Users } from "lucide-react";

import type { HotelRoomType } from "@/features/hotels/queries/get-hotel.query";
import type { RoomTypeFormInput } from "@/features/hotels/schemas/hotel.schema";
import { ROOM_TYPE_KIND_LABELS } from "@/features/hotels/lib/labels";
import { createRoomTypeAction } from "@/features/hotels/actions/room-type.action";
import { updateRoomTypeAction } from "@/features/hotels/actions/room-type.action";
import { deleteRoomTypeAction } from "@/features/hotels/actions/room-type.action";
import { RoomTypeForm } from "@/features/hotels/components/room-type-form";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantId: string;
  hotelId: string;
  roomTypes: HotelRoomType[];
  canEdit: boolean;
};

function formatMoney(amount: number | null, currency: string) {
  if (amount == null) return null;
  return `${currency} ${amount.toLocaleString()}`;
}

export function RoomTypeManager({ tenantId, hotelId, roomTypes, canEdit }: Props) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  async function handleCreate(values: RoomTypeFormInput) {
    const result = await createRoomTypeAction(tenantId, hotelId, values);
    if (result.ok) router.refresh();
    return result;
  }

  async function handleUpdate(id: string, values: RoomTypeFormInput) {
    const result = await updateRoomTypeAction(tenantId, id, values);
    if (result.ok) router.refresh();
    return result;
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Delete this room type?", destructive: true }))) return;
    const result = await deleteRoomTypeAction(tenantId, id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Room type deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Room Types</h3>
          <p className="text-muted-foreground text-sm">
            Room categories, capacity, and pricing for this hotel.
          </p>
        </div>
        {canEdit && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="mr-1.5 size-4" />
            Add Room Type
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-lg border p-4">
          <RoomTypeForm onSubmit={handleCreate} onCancel={() => setIsAdding(false)} />
        </div>
      )}

      {roomTypes.length === 0 && !isAdding ? (
        <EmptyState title="No room types yet." className="rounded-lg py-8" />
      ) : (
        <div className="space-y-2">
          {roomTypes.map((room) =>
            editingId === room.id ? (
              <div key={room.id} className="rounded-lg border p-4">
                <RoomTypeForm
                  defaultValues={{
                    kind: room.kind,
                    name: room.name,
                    capacity: room.capacity,
                    beds: room.beds ?? undefined,
                    occupancy: room.occupancy ?? undefined,
                    basePrice: room.basePrice ?? undefined,
                    internalCost: room.internalCost ?? undefined,
                    currency: room.currency,
                    images: room.images,
                    notes: room.notes ?? "",
                  }}
                  submitLabel="Save"
                  onSubmit={(values) => handleUpdate(room.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div
                key={room.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
                      {ROOM_TYPE_KIND_LABELS[room.kind]}
                    </span>
                    <span className="font-medium">{room.name}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 flex flex-wrap gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {room.capacity} pax
                    </span>
                    {room.beds != null && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="size-3" />
                        {room.beds} bed{room.beds !== 1 ? "s" : ""}
                      </span>
                    )}
                    {formatMoney(room.basePrice, room.currency) && (
                      <span>{formatMoney(room.basePrice, room.currency)}/night</span>
                    )}
                  </div>
                  {room.notes && (
                    <p className="text-muted-foreground mt-1 text-xs">{room.notes}</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => setEditingId(room.id)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-7"
                      onClick={() => handleDelete(room.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
