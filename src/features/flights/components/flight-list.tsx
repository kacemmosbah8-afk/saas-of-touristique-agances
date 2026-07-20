"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Plus, Star, PlaneTakeoff } from "lucide-react";

import type { FlightSummary } from "@/features/flights/queries/list-flights.query";
import { deleteFlightAction } from "@/features/flights/actions/delete-flight.action";
import { updateFlightStatusAction } from "@/features/flights/actions/update-flight-status.action";
import { FlightStatusBadge } from "@/features/flights/components/flight-status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

type Props = {
  tenantId: string;
  tenantSlug: string;
  flights: FlightSummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
};

export function FlightList({ tenantId, tenantSlug, flights, canCreate, canManage, canDelete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(flightId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    startTransition(async () => {
      const result = await updateFlightStatusAction(tenantId, flightId, { status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  }

  function handleDelete(flightId: string) {
    startTransition(async () => {
      const result = await deleteFlightAction(tenantId, flightId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Flight deleted.");
      router.refresh();
    });
  }

  if (flights.length === 0) {
    return (
      <EmptyState
        icon={PlaneTakeoff}
        title="No flights match your filters."
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/admin/flights/new`}>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Add your first flight
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
            <th className="px-4 py-3 text-left font-medium">Flight</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Route</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Price</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {flights.map((flight) => (
            <tr key={flight.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {flight.coverImageUrl ? (
                    <div className="relative size-10 shrink-0 overflow-hidden rounded">
                      <Image
                        src={flight.coverImageUrl}
                        alt={flight.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="bg-muted size-10 shrink-0 rounded" />
                  )}
                  <div>
                    <Link
                      href={`/${tenantSlug}/admin/flights/${flight.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {flight.name}
                    </Link>
                    {flight.featured && (
                      <span className="ml-1.5 text-amber-500">
                        <Star className="inline size-3 fill-current" />
                      </span>
                    )}
                    {flight.airline && (
                      <p className="text-muted-foreground text-xs">{flight.airline}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <FlightStatusBadge status={flight.status} />
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {flight.departureCity && flight.arrivalCity
                  ? `${flight.departureCity} → ${flight.arrivalCity}`
                  : "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {flight.basePrice != null ? `${flight.currency} ${flight.basePrice.toLocaleString()}` : "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {new Date(flight.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="size-8 p-0" disabled={isPending}>
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/${tenantSlug}/admin/flights/${flight.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>

                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        {flight.status !== "PUBLISHED" && (
                          <DropdownMenuItem onSelect={() => handleStatusChange(flight.id, "PUBLISHED")}>
                            Publish
                          </DropdownMenuItem>
                        )}
                        {flight.status === "PUBLISHED" && (
                          <DropdownMenuItem onSelect={() => handleStatusChange(flight.id, "DRAFT")}>
                            Unpublish
                          </DropdownMenuItem>
                        )}
                        {flight.status !== "ARCHIVED" && (
                          <DropdownMenuItem onSelect={() => handleStatusChange(flight.id, "ARCHIVED")}>
                            Archive
                          </DropdownMenuItem>
                        )}
                        {flight.status === "ARCHIVED" && (
                          <DropdownMenuItem onSelect={() => handleStatusChange(flight.id, "DRAFT")}>
                            Restore to Draft
                          </DropdownMenuItem>
                        )}
                      </>
                    )}

                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => handleDelete(flight.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
