"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building, Plus } from "lucide-react";
import type { ResourceStatus } from "@prisma/client";

import type { CompanySummary } from "@/features/crm/queries/list-companies.query";
import {
  updateCompanyStatusAction,
  deleteCompanyAction,
} from "@/features/crm/actions/company.action";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { ResourceRowActions } from "@/shared/components/data/resource-row-actions";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantSlug: string;
  tenantId: string;
  companies: CompanySummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
};

export function CompanyList({
  tenantSlug,
  tenantId,
  companies,
  canCreate,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(id: string, status: ResourceStatus) {
    startTransition(async () => {
      const result = await updateCompanyStatusAction(tenantId, id, { status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this company? Linked customers keep their profiles.")) return;
    startTransition(async () => {
      const result = await deleteCompanyAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Company deleted.");
      router.refresh();
    });
  }

  if (companies.length === 0) {
    return (
      <div className="border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Building className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">No companies match your filters.</p>
        {canCreate && (
          <Link href={`/${tenantSlug}/companies/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add your first company
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
            <th className="px-4 py-3 text-left font-medium">Company</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Industry</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Contact</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Customers</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/companies/${c.id}/edit`}
                  className="font-medium hover:underline"
                >
                  {c.name}
                </Link>
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {c.industry ?? "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {c.email ?? c.phone ?? "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {c.customerCount}
              </td>
              <td className="px-4 py-3">
                <ResourceStatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <ResourceRowActions
                  editHref={`/${tenantSlug}/companies/${c.id}/edit`}
                  status={c.status}
                  canManage={canManage}
                  canDelete={canDelete}
                  disabled={isPending}
                  onStatus={(s) => setStatus(c.id, s)}
                  onDelete={() => remove(c.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
