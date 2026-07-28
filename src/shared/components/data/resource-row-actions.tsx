"use client";

import Link from "next/link";
import type { ResourceStatus } from "@prisma/client";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  editHref: string;
  status: ResourceStatus;
  canManage: boolean;
  canDelete: boolean;
  disabled?: boolean;
  onStatus: (status: ResourceStatus) => void;
  onDelete: () => void;
  locale: Locale;
};

/**
 * Standard row-actions menu (Edit / status transitions / Delete) shared by
 * every Suppliers & Inventory list. Keeps status-transition logic identical
 * across modules.
 */
export function ResourceRowActions({
  editHref,
  status,
  canManage,
  canDelete,
  disabled,
  onStatus,
  onDelete,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).common;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="size-8 p-0" disabled={disabled}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">{dict.actions}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={editHref}>{dict.edit}</Link>
        </DropdownMenuItem>

        {canManage && (
          <>
            <DropdownMenuSeparator />
            {status !== "ACTIVE" && (
              <DropdownMenuItem onSelect={() => onStatus("ACTIVE")}>
                {status === "ARCHIVED" ? dict.restore : dict.setActive}
              </DropdownMenuItem>
            )}
            {status === "ACTIVE" && (
              <DropdownMenuItem onSelect={() => onStatus("INACTIVE")}>
                {dict.setInactive}
              </DropdownMenuItem>
            )}
            {status !== "ARCHIVED" && (
              <DropdownMenuItem onSelect={() => onStatus("ARCHIVED")}>
                {dict.archive}
              </DropdownMenuItem>
            )}
          </>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onDelete}
            >
              {dict.delete}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
