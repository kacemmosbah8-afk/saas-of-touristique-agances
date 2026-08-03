"use client";

import dynamic from "next/dynamic";

import { createDestinationAction } from "@/features/destinations/actions/destination.action";
import { type Locale } from "@/shared/i18n/dictionary";

/** Lightweight placeholder shown while the wizard's JS chunk streams in. */
function DestinationFormSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="bg-muted h-4 w-40 rounded" />
        <div className="bg-muted h-1.5 w-full rounded-full" />
      </div>
      <div className="space-y-4 rounded-lg border p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="bg-muted h-4 w-24 rounded" />
            <div className="bg-muted h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

const DestinationDetailsForm = dynamic(
  () => import("@/features/destinations/components/destination-form").then((m) => m.DestinationDetailsForm),
  { loading: () => <DestinationFormSkeleton />, ssr: true },
);

export function DestinationFormClient({
  tenantId,
  tenantSlug,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  locale: Locale;
}) {
  return (
    <DestinationDetailsForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createDestinationAction(tenantId, values)}
      locale={locale}
    />
  );
}
