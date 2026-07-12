"use client";

import { createTransportAction } from "@/features/transport/actions/transport.action";
import { updateTransportAction } from "@/features/transport/actions/transport.action";
import { TransportForm } from "@/features/transport/components/transport-form";
import type { TransportDetail } from "@/features/transport/queries/get-transport.query";

export function TransportFormClient({
  tenantId,
  tenantSlug,
  provider,
}: {
  tenantId: string;
  tenantSlug: string;
  provider?: TransportDetail;
}) {
  if (provider) {
    return (
      <TransportForm
        mode="edit"
        tenantSlug={tenantSlug}
        provider={provider}
        onSubmit={(values) => updateTransportAction(tenantId, provider.id, values)}
      />
    );
  }
  return (
    <TransportForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createTransportAction(tenantId, values)}
    />
  );
}
