"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Plus } from "lucide-react";
import type { ResourceStatus } from "@prisma/client";

import type { DestinationSummary } from "@/features/destinations/queries/list-destinations.query";
import {
  updateDestinationStatusAction,
  deleteDestinationAction,
} from "@/features/destinations/actions/destination.action";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { ResourceRowActions } from "@/shared/components/data/resource-row-actions";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantSlug: string;
  tenantId: string;
  destinations: DestinationSummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
};

export function DestinationList({
  tenantSlug,
  tenantId,
  destinations,
  canCreate,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(id: string, status: ResourceStatus) {
    startTransition(async () => {
      const result = await updateDestinationStatusAction(tenantId, id, { status });
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
      const result = await deleteDestinationAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Destination deleted.");
      router.refresh();
    });
  }

  if (destinations.length === 0) {
    return (
      <div className="border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <MapPin className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">No destinations match your filters.</p>
        {canCreate && (
          <Link href={`/${tenantSlug}/destinations/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add your first destination
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-4 py-3 text-left font-medium">Destination</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Country</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Region</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {destinations.map((d) => (
            <tr key={d.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {d.heroImageUrl ? (
                    <div className="relative size-10 shrink-0 overflow-hidden rounded">
                      <Image src={d.heroImageUrl} alt={d.name} fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded">
                      <MapPin className="text-muted-foreground size-4" />
                    </div>
                  )}
                  <Link
                    href={`/${tenantSlug}/destinations/${d.id}/edit`}
                    className="font-medium hover:underline"
                  >
                    {d.name}
                  </Link>
                </div>
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">{d.country}</td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {d.region ?? d.city ?? "—"}
              </td>
              <td className="px-4 py-3">
                <ResourceStatusBadge status={d.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <ResourceRowActions
                  editHref={`/${tenantSlug}/destinations/${d.id}/edit`}
                  status={d.status}
                  canManage={canManage}
                  canDelete={canDelete}
                  disabled={isPending}
                  onStatus={(s) => setStatus(d.id, s)}
                  onDelete={() => remove(d.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
