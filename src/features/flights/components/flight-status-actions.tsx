"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateFlightStatusAction } from "@/features/flights/actions/update-flight-status.action";
import { deleteFlightAction } from "@/features/flights/actions/delete-flight.action";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";

type Props = {
  tenantId: string;
  tenantSlug: string;
  flightId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  canManage: boolean;
  canDelete: boolean;
};

export function FlightStatusActions({
  tenantId,
  tenantSlug,
  flightId,
  status,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeStatus(newStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    startTransition(async () => {
      const result = await updateFlightStatusAction(tenantId, flightId, { status: newStatus });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
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
      toast.success("Flight deleted.");
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
            <h2 className="text-sm font-medium">Status</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Control visibility of this flight on the public site.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {status !== "PUBLISHED" && (
                <Button size="sm" disabled={isPending} onClick={() => changeStatus("PUBLISHED")}>
                  Publish
                </Button>
              )}
              {status === "PUBLISHED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => changeStatus("DRAFT")}
                >
                  Unpublish
                </Button>
              )}
              {status !== "ARCHIVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => changeStatus("ARCHIVED")}
                >
                  Archive
                </Button>
              )}
              {status === "ARCHIVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => changeStatus("DRAFT")}
                >
                  Restore to Draft
                </Button>
              )}
            </div>
          </div>
        )}

        {canDelete && (
          <div className="border-destructive/20 bg-destructive/5 rounded-md border p-4">
            <h2 className="text-destructive text-sm font-medium">Danger Zone</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Deleting a flight is permanent and cannot be undone.
            </p>
            <Button
              size="sm"
              variant="destructive"
              className="mt-3"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete Flight
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
