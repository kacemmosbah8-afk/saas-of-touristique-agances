"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Plus, Star } from "lucide-react";

import type { HotelSummary } from "@/features/hotels/queries/list-hotels.query";
import { HOTEL_CATEGORY_LABELS } from "@/features/hotels/lib/labels";
import { updateHotelStatusAction } from "@/features/hotels/actions/update-hotel-status.action";
import { deleteHotelAction } from "@/features/hotels/actions/delete-hotel.action";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { ResourceRowActions } from "@/shared/components/data/resource-row-actions";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import type { HotelCategory } from "@prisma/client";

type Props = {
  tenantSlug: string;
  tenantId: string;
  hotels: HotelSummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
};

export function HotelList({
  tenantSlug,
  tenantId,
  hotels,
  canCreate,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    startTransition(async () => {
      const result = await updateHotelStatusAction(tenantId, id, { status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteHotelAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Hotel deleted.");
      router.refresh();
    });
  }

  if (hotels.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No hotels match your filters."
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/hotels/new`}>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Add your first hotel
              </Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-4 py-3 text-left font-medium">Hotel</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Category</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Location</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Rooms</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {hotels.map((h) => (
            <tr key={h.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {h.coverImageUrl ? (
                    <div className="relative size-10 shrink-0 overflow-hidden rounded">
                      <Image src={h.coverImageUrl} alt={h.name} fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded">
                      <Building2 className="text-muted-foreground size-4" />
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/${tenantSlug}/hotels/${h.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {h.name}
                    </Link>
                    {h.stars != null && (
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: h.stars }).map((_, i) => (
                          <Star key={i} className="size-3 fill-current" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {HOTEL_CATEGORY_LABELS[h.category as HotelCategory]}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {[h.city, h.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {h.roomTypeCount}
              </td>
              <td className="px-4 py-3">
                <ResourceStatusBadge status={h.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <ResourceRowActions
                  editHref={`/${tenantSlug}/hotels/${h.id}/edit`}
                  status={h.status}
                  canManage={canManage}
                  canDelete={canDelete}
                  disabled={isPending}
                  onStatus={(s) => setStatus(h.id, s)}
                  onDelete={() => remove(h.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
