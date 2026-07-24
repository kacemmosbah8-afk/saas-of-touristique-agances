"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Plus, Star } from "lucide-react";

import type { PackageSummary } from "@/features/packages/queries/list-packages.query";
import { deletePackageAction } from "@/features/packages/actions/delete-package.action";
import { updatePackageStatusAction } from "@/features/packages/actions/update-package-status.action";
import { duplicatePackageAction } from "@/features/packages/actions/duplicate-package.action";
import { PackageStatusBadge } from "@/features/packages/components/package-status-badge";
import { EmptyState } from "@/shared/components/empty-state";
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
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
};

export function PackageList({
  tenantId,
  tenantSlug,
  packages,
  canCreate,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(packageId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
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

  function handleDuplicate(packageId: string) {
    startTransition(async () => {
      const result = await duplicatePackageAction(tenantId, packageId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Package duplicated.");
      router.push(`/${tenantSlug}/admin/packages/${result.data.packageId}/edit`);
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
      <EmptyState
        title="No packages match your filters."
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/admin/packages/new`}>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Create your first package
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
            <th className="px-4 py-3 text-left font-medium">Package</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Destination</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Duration</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">From Price</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg) => (
            <tr key={pkg.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {pkg.coverImageUrl ? (
                    <div className="relative size-10 shrink-0 overflow-hidden rounded">
                      <Image
                        src={pkg.coverImageUrl}
                        alt={pkg.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="bg-muted size-10 shrink-0 rounded" />
                  )}
                  <div>
                    <Link
                      href={`/${tenantSlug}/admin/packages/${pkg.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {pkg.name}
                    </Link>
                    {pkg.featured && (
                      <span className="text-amber-500 ml-1.5">
                        <Star className="inline size-3 fill-current" />
                      </span>
                    )}
                    {pkg.category && (
                      <p className="text-muted-foreground text-xs">{pkg.category}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <PackageStatusBadge status={pkg.status} />
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {pkg.destination ?? pkg.country ?? "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {pkg.duration != null
                  ? `${pkg.duration}D${pkg.durationNights != null ? ` / ${pkg.durationNights}N` : ""}`
                  : "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {pkg.sellingPrice != null
                  ? `${pkg.currency} ${pkg.sellingPrice.toLocaleString()}`
                  : "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {new Date(pkg.updatedAt).toLocaleDateString()}
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
                      <Link href={`/${tenantSlug}/admin/packages/${pkg.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>

                    {canCreate && (
                      <DropdownMenuItem onSelect={() => handleDuplicate(pkg.id)}>
                        Duplicate
                      </DropdownMenuItem>
                    )}

                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        {pkg.status !== "PUBLISHED" && (
                          <DropdownMenuItem onSelect={() => handleStatusChange(pkg.id, "PUBLISHED")}>
                            Publish
                          </DropdownMenuItem>
                        )}
                        {pkg.status === "PUBLISHED" && (
                          <DropdownMenuItem onSelect={() => handleStatusChange(pkg.id, "DRAFT")}>
                            Unpublish
                          </DropdownMenuItem>
                        )}
                        {pkg.status !== "ARCHIVED" && (
                          <DropdownMenuItem onSelect={() => handleStatusChange(pkg.id, "ARCHIVED")}>
                            Archive
                          </DropdownMenuItem>
                        )}
                        {pkg.status === "ARCHIVED" && (
                          <DropdownMenuItem onSelect={() => handleStatusChange(pkg.id, "DRAFT")}>
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
