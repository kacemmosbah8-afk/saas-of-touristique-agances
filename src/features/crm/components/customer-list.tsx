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
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { useConfirm } from "@/shared/hooks/use-confirm";
import type { Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantSlug: string;
  tenantId: string;
  customers: CustomerSummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
  locale: Locale;
};

export function CustomerList({
  tenantSlug,
  tenantId,
  customers,
  canCreate,
  canManage,
  canDelete,
  locale,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm(locale);
  const dict = getAdminDictionary(locale).customers;
  const common = getAdminDictionary(locale).common;

  function setStatus(id: string, status: ResourceStatus) {
    startTransition(async () => {
      const result = await updateCustomerStatusAction(tenantId, id, { status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.statusUpdated);
      router.refresh();
    });
  }

  async function remove(id: string) {
    if (
      !(await confirm({
        title: dict.deleteConfirmTitle,
        description: dict.deleteConfirmBody,
        destructive: true,
      }))
    )
      return;
    startTransition(async () => {
      const result = await deleteCustomerAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.deleted);
      router.refresh();
    });
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={dict.noMatch}
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/admin/customers/new`}>
              <Button size="sm">
                <Plus className="me-1.5 size-4" />
                {dict.addFirst}
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
            <th className="px-4 py-3 text-start font-medium">{dict.columnCustomer}</th>
            <th className="hidden px-4 py-3 text-start font-medium sm:table-cell">{dict.columnType}</th>
            <th className="hidden px-4 py-3 text-start font-medium md:table-cell">{dict.columnContact}</th>
            <th className="hidden px-4 py-3 text-start font-medium lg:table-cell">{dict.columnSource}</th>
            <th className="px-4 py-3 text-start font-medium">{common.status}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/admin/customers/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.firstName} {c.lastName}
                </Link>
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
                  editHref={`/${tenantSlug}/admin/customers/${c.id}`}
                  status={c.status}
                  canManage={canManage}
                  canDelete={canDelete}
                  disabled={isPending}
                  onStatus={(s) => setStatus(c.id, s)}
                  onDelete={() => remove(c.id)}
                  locale={locale}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {confirmDialog}
    </div>
  );
}
