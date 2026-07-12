"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Plus } from "lucide-react";
import type { ResourceStatus } from "@prisma/client";

import type { CustomerSummary } from "@/features/crm/queries/list-customers.query";
import {
  CUSTOMER_TYPE_LABELS,
  LEAD_SOURCE_LABELS,
} from "@/features/crm/schemas/customer.schema";
import {
  updateCustomerStatusAction,
  deleteCustomerAction,
} from "@/features/crm/actions/customer.action";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { ResourceRowActions } from "@/shared/components/data/resource-row-actions";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantSlug: string;
  tenantId: string;
  customers: CustomerSummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
};

export function CustomerList({
  tenantSlug,
  tenantId,
  customers,
  canCreate,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(id: string, status: ResourceStatus) {
    startTransition(async () => {
      const result = await updateCustomerStatusAction(tenantId, id, { status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this customer? Their notes and history will be archived with them.")) return;
    startTransition(async () => {
      const result = await deleteCustomerAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer deleted.");
      router.refresh();
    });
  }

  if (customers.length === 0) {
    return (
      <div className="border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Users className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">No customers match your filters.</p>
        {canCreate && (
          <Link href={`/${tenantSlug}/customers/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add your first customer
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
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Type</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Contact</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Source</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/customers/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.firstName} {c.lastName}
                </Link>
                {c.companyName && (
                  <p className="text-muted-foreground text-xs">{c.companyName}</p>
                )}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {CUSTOMER_TYPE_LABELS[c.type]}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {c.email ?? c.phone ?? "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {c.leadSource ? LEAD_SOURCE_LABELS[c.leadSource] : "—"}
              </td>
              <td className="px-4 py-3">
                <ResourceStatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <ResourceRowActions
                  editHref={`/${tenantSlug}/customers/${c.id}`}
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
