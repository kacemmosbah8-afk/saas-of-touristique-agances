"use client";

import { createTransportAction } from "@/features/transport/actions/transport.action";
import { updateTransportAction } from "@/features/transport/actions/transport.action";
import { TransportForm } from "@/features/transport/components/transport-form";
import type { TransportDetail } from "@/features/transport/queries/get-transport.query";
import { type Locale } from "@/shared/i18n/dictionary";

export function TransportFormClient({
  tenantId,
  tenantSlug,
  provider,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  provider?: TransportDetail;
  locale: Locale;
}) {
  if (provider) {
    return (
      <TransportForm
        mode="edit"
        tenantSlug={tenantSlug}
        provider={provider}
        onSubmit={(values) => updateTransportAction(tenantId, provider.id, values)}
        locale={locale}
      />
    );
  }
  return (
    <TransportForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createTransportAction(tenantId, values)}
      locale={locale}
    />
  );
}
