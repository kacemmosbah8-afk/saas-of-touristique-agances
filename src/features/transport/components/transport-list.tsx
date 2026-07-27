"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bus, Plus } from "lucide-react";
import type { ResourceStatus } from "@prisma/client";

import type { TransportSummary } from "@/features/transport/queries/list-transport.query";
import { TRANSPORT_TYPE_LABELS } from "@/features/transport/schemas/transport.schema";
import {
  updateTransportStatusAction,
  deleteTransportAction,
} from "@/features/transport/actions/transport.action";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { ResourceRowActions } from "@/shared/components/data/resource-row-actions";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantSlug: string;
  tenantId: string;
  providers: TransportSummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
  locale: Locale;
};

export function TransportList({
  tenantSlug,
  tenantId,
  providers,
  canCreate,
  canManage,
  canDelete,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).transport;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(id: string, status: ResourceStatus) {
    startTransition(async () => {
      const result = await updateTransportStatusAction(tenantId, id, { status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.statusUpdated);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteTransportAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.deleted);
      router.refresh();
    });
  }

  if (providers.length === 0) {
    return (
      <EmptyState
        icon={Bus}
        title={dict.noMatch}
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/admin/transport/new`}>
              <Button size="sm">
                <Plus className="me-1.5 size-4" />
                {dict.addFirstProvider}
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
            <th className="px-4 py-3 text-left font-medium">{dict.columnProvider}</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
              {dict.columnType}
            </th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">
              {dict.columnLocation}
            </th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">
              {dict.columnPhone}
            </th>
            <th className="px-4 py-3 text-left font-medium">{dict.columnStatus}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/admin/transport/${p.id}/edit`}
                  className="font-medium hover:underline"
                >
                  {p.name}
                </Link>
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {TRANSPORT_TYPE_LABELS[p.type]}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {[p.city, p.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {p.contactPhone ?? "—"}
              </td>
              <td className="px-4 py-3">
                <ResourceStatusBadge status={p.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <ResourceRowActions
                  editHref={`/${tenantSlug}/admin/transport/${p.id}/edit`}
                  status={p.status}
                  canManage={canManage}
                  canDelete={canDelete}
                  disabled={isPending}
                  onStatus={(s) => setStatus(p.id, s)}
                  onDelete={() => remove(p.id)}
                  locale={locale}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
