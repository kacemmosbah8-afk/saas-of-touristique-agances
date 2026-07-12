"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ticket, Plus } from "lucide-react";
import type { ResourceStatus } from "@prisma/client";

import type { ActivitySummary } from "@/features/activities/queries/list-activities.query";
import {
  updateActivityStatusAction,
  deleteActivityCatalogAction,
} from "@/features/activities/actions/activity.action";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { ResourceRowActions } from "@/shared/components/data/resource-row-actions";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantSlug: string;
  tenantId: string;
  activities: ActivitySummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
};

function formatDuration(minutes: number | null) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function ActivityList({
  tenantSlug,
  tenantId,
  activities,
  canCreate,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(id: string, status: ResourceStatus) {
    startTransition(async () => {
      const result = await updateActivityStatusAction(tenantId, id, { status });
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
      const result = await deleteActivityCatalogAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Activity deleted.");
      router.refresh();
    });
  }

  if (activities.length === 0) {
    return (
      <div className="border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Ticket className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">No activities match your filters.</p>
        {canCreate && (
          <Link href={`/${tenantSlug}/activities/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add your first activity
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
            <th className="px-4 py-3 text-left font-medium">Activity</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Category</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Duration</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Price</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {a.coverImageUrl ? (
                    <div className="relative size-10 shrink-0 overflow-hidden rounded">
                      <Image src={a.coverImageUrl} alt={a.name} fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded">
                      <Ticket className="text-muted-foreground size-4" />
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/${tenantSlug}/activities/${a.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {a.name}
                    </Link>
                    {(a.city || a.country) && (
                      <p className="text-muted-foreground text-xs">
                        {[a.city, a.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {a.category ?? "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {formatDuration(a.durationMinutes)}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {a.sellingPrice != null ? `${a.currency} ${a.sellingPrice.toLocaleString()}` : "—"}
              </td>
              <td className="px-4 py-3">
                <ResourceStatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <ResourceRowActions
                  editHref={`/${tenantSlug}/activities/${a.id}/edit`}
                  status={a.status}
                  canManage={canManage}
                  canDelete={canDelete}
                  disabled={isPending}
                  onStatus={(s) => setStatus(a.id, s)}
                  onDelete={() => remove(a.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
