"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateFlightStatusAction } from "@/features/flights/actions/update-flight-status.action";
import { deleteFlightAction } from "@/features/flights/actions/delete-flight.action";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  tenantSlug: string;
  flightId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  canManage: boolean;
  canDelete: boolean;
  locale: Locale;
};

export function FlightStatusActions({
  tenantId,
  tenantSlug,
  flightId,
  status,
  canManage,
  canDelete,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).flights;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeStatus(newStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    startTransition(async () => {
      const result = await updateFlightStatusAction(tenantId, flightId, { status: newStatus });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.statusUpdated);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFlightAction(tenantId, flightId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.deleted);
      router.push(`/${tenantSlug}/admin/flights`);
    });
  }

  if (!canManage && !canDelete) return null;

  return (
    <>
      <Separator />
      <div className="space-y-6">
        {canManage && (
          <div>
            <h2 className="text-sm font-medium">{dict.statusSectionHeading}</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{dict.statusSectionSubtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {status !== "PUBLISHED" && (
                <Button size="sm" disabled={isPending} onClick={() => changeStatus("PUBLISHED")}>
                  {dict.publish}
                </Button>
              )}
              {status === "PUBLISHED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => changeStatus("DRAFT")}
                >
                  {dict.unpublish}
                </Button>
              )}
              {status !== "ARCHIVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => changeStatus("ARCHIVED")}
                >
                  {dict.archive}
                </Button>
              )}
              {status === "ARCHIVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => changeStatus("DRAFT")}
                >
                  {dict.restoreToDraft}
                </Button>
              )}
            </div>
          </div>
        )}

        {canDelete && (
          <div className="border-destructive/20 bg-destructive/5 rounded-md border p-4">
            <h2 className="text-destructive text-sm font-medium">{dict.dangerZoneHeading}</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{dict.dangerZoneSubtitle}</p>
            <Button
              size="sm"
              variant="destructive"
              className="mt-3"
              disabled={isPending}
              onClick={handleDelete}
            >
              {dict.deleteFlight}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
