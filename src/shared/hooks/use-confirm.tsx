"use client";

import { useCallback, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button destructive-red for irreversible actions. */
  destructive?: boolean;
};

/**
 * Promise-based replacement for `window.confirm()` — an accessible,
 * on-brand `AlertDialog` instead of the browser's native dialog. Usage:
 *
 *   const { confirm, confirmDialog } = useConfirm(locale);
 *   ...
 *   if (!(await confirm({ title: "Delete this customer?", destructive: true }))) return;
 *   ...
 *   return <>{confirmDialog}...</>;
 *
 * One hook instance serves every confirmation in the component that owns
 * it — `confirm()` is re-callable with different options each time, so a
 * list component with several distinct destructive actions needs only one
 * `useConfirm()` call, not one per action.
 */
export function useConfirm(locale: Locale) {
  const dict = getAdminDictionary(locale).common;
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    setOptions(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }

  const confirmDialog = (
    <AlertDialog open={options != null} onOpenChange={(open) => !open && settle(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description && (
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {options?.cancelLabel ?? dict.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={cn(options?.destructive && buttonVariants({ variant: "destructive" }))}
          >
            {options?.confirmLabel ?? dict.confirmContinue}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, confirmDialog };
}
