"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, UserRound } from "lucide-react";
import type { ResourceStatus } from "@prisma/client";

import type { GuideSummary } from "@/features/guides/queries/list-guides.query";
import {
  updateGuideStatusAction,
  deleteGuideAction,
} from "@/features/guides/actions/guide.action";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { ResourceRowActions } from "@/shared/components/data/resource-row-actions";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantSlug: string;
  tenantId: string;
  guides: GuideSummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
};

export function GuideList({
  tenantSlug,
  tenantId,
  guides,
  canCreate,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(id: string, status: ResourceStatus) {
    startTransition(async () => {
      const result = await updateGuideStatusAction(tenantId, id, { status });
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
      const result = await deleteGuideAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Guide deleted.");
      router.refresh();
    });
  }

  if (guides.length === 0) {
    return (
      <EmptyState
        icon={UserRound}
        title="No guides match your filters."
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/admin/guides/new`}>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Add your first guide
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
            <th className="px-4 py-3 text-left font-medium">Guide</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Languages</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Experience</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Daily Rate</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {guides.map((g) => (
            <tr key={g.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/admin/guides/${g.id}/edit`}
                  className="font-medium hover:underline"
                >
                  {g.name}
                </Link>
                {(g.city || g.country) && (
                  <p className="text-muted-foreground text-xs">
                    {[g.city, g.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {g.languages.length > 0 ? g.languages.slice(0, 3).join(", ") : "—"}
                {g.languages.length > 3 && ` +${g.languages.length - 3}`}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {g.experienceYears != null ? `${g.experienceYears} yr` : "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {g.dailyRate != null ? `${g.currency} ${g.dailyRate.toLocaleString()}` : "—"}
              </td>
              <td className="px-4 py-3">
                <ResourceStatusBadge status={g.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <ResourceRowActions
                  editHref={`/${tenantSlug}/admin/guides/${g.id}/edit`}
                  status={g.status}
                  canManage={canManage}
                  canDelete={canDelete}
                  disabled={isPending}
                  onStatus={(s) => setStatus(g.id, s)}
                  onDelete={() => remove(g.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
