"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Plus } from "lucide-react";

import type { PackageSummary } from "@/features/packages/queries/list-packages.query";
import { deletePackageAction } from "@/features/packages/actions/delete-package.action";
import { updatePackageStatusAction } from "@/features/packages/actions/update-package-status.action";
import { PackageStatusBadge } from "@/features/packages/components/package-status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

type Props = {
  tenantId: string;
  tenantSlug: string;
  packages: PackageSummary[];
  canManage: boolean; // package:manage permission
  canDelete: boolean; // package:delete permission
};

export function PackageList({
  tenantId,
  tenantSlug,
  packages,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(
    packageId: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
  ) {
    startTransition(async () => {
      const result = await updatePackageStatusAction(tenantId, packageId, { status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  }

  function handleDelete(packageId: string) {
    startTransition(async () => {
      const result = await deletePackageAction(tenantId, packageId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Package deleted.");
      router.refresh();
    });
  }

  if (packages.length === 0) {
    return (
      <div className="border-muted rounded-xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">No packages yet.</p>
        <Link href={`/${tenantSlug}/packages/new`}>
          <Button size="sm" className="mt-4">
            <Plus className="mr-1.5 size-4" />
            Create your first package
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Destination</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Duration</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Created</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg) => (
            <tr key={pkg.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">
                <Link
                  href={`/${tenantSlug}/packages/${pkg.id}/edit`}
                  className="hover:underline"
                >
                  {pkg.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <PackageStatusBadge status={pkg.status} />
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {pkg.destination ?? "—"}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {pkg.duration != null ? `${pkg.duration}d` : "—"}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                {new Date(pkg.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      disabled={isPending}
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/${tenantSlug}/packages/${pkg.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>

                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        {pkg.status !== "PUBLISHED" && (
                          <DropdownMenuItem
                            onSelect={() => handleStatusChange(pkg.id, "PUBLISHED")}
                          >
                            Publish
                          </DropdownMenuItem>
                        )}
                        {pkg.status === "PUBLISHED" && (
                          <DropdownMenuItem
                            onSelect={() => handleStatusChange(pkg.id, "DRAFT")}
                          >
                            Unpublish
                          </DropdownMenuItem>
                        )}
                        {pkg.status !== "ARCHIVED" && (
                          <DropdownMenuItem
                            onSelect={() => handleStatusChange(pkg.id, "ARCHIVED")}
                          >
                            Archive
                          </DropdownMenuItem>
                        )}
                        {pkg.status === "ARCHIVED" && (
                          <DropdownMenuItem
                            onSelect={() => handleStatusChange(pkg.id, "DRAFT")}
                          >
                            Restore to Draft
                          </DropdownMenuItem>
                        )}
                      </>
                    )}

                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => handleDelete(pkg.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
