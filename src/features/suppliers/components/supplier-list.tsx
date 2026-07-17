"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, Plus, Star } from "lucide-react";
import type { ResourceStatus } from "@prisma/client";

import type { SupplierSummary } from "@/features/suppliers/queries/list-suppliers.query";
import { SUPPLIER_TYPE_LABELS } from "@/features/suppliers/schemas/supplier.schema";
import {
  updateSupplierStatusAction,
  deleteSupplierAction,
} from "@/features/suppliers/actions/supplier.action";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { ResourceRowActions } from "@/shared/components/data/resource-row-actions";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantSlug: string;
  tenantId: string;
  suppliers: SupplierSummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
};

export function SupplierList({
  tenantSlug,
  tenantId,
  suppliers,
  canCreate,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(id: string, status: ResourceStatus) {
    startTransition(async () => {
      const result = await updateSupplierStatusAction(tenantId, id, { status });
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
      const result = await deleteSupplierAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Supplier deleted.");
      router.refresh();
    });
  }

  if (suppliers.length === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title="No suppliers match your filters."
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/suppliers/new`}>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Add your first supplier
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
            <th className="px-4 py-3 text-left font-medium">Supplier</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Type</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Location</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Rating</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/suppliers/${s.id}/edit`}
                  className="font-medium hover:underline"
                >
                  {s.name}
                </Link>
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {SUPPLIER_TYPE_LABELS[s.type]}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {[s.city, s.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                {s.internalRating != null ? (
                  <span className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: s.internalRating }).map((_, i) => (
                      <Star key={i} className="size-3 fill-current" />
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <ResourceStatusBadge status={s.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <ResourceRowActions
                  editHref={`/${tenantSlug}/suppliers/${s.id}/edit`}
                  status={s.status}
                  canManage={canManage}
                  canDelete={canDelete}
                  disabled={isPending}
                  onStatus={(st) => setStatus(s.id, st)}
                  onDelete={() => remove(s.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
