"use client";

import * as React from "react";

import { QueryProvider } from "@/shared/providers/query-provider";
import { Toaster } from "@/shared/components/ui/sonner";
import { TapRipple } from "@/shared/components/tap-ripple";

/**
 * Single composition root for all client-side providers. `app/layout.tsx`
 * mounts this once; new global providers (theme, i18n, ...) get added here,
 * not scattered across the tree.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <Toaster />
      <TapRipple />
    </QueryProvider>
  );
}
