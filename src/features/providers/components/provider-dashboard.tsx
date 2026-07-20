"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cable, Plug } from "lucide-react";
import type { ProviderType } from "@prisma/client";

import type { ProviderOverview } from "@/features/providers/queries/get-providers.query";
import {
  PROVIDER_REGISTRY,
  DASHBOARD_PROVIDER_TYPES,
} from "@/features/providers/lib/provider-registry";
import { enableProviderAction } from "@/features/providers/actions/provider.action";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";
import { cn } from "@/shared/lib/utils";

const CONNECTION_TONE: Record<string, StatusTone> = {
  CONNECTED: "success",
  PENDING: "warning",
  ERROR: "danger",
  EXPIRED: "danger",
  DISCONNECTED: "neutral",
};

type Props = {
  tenantId: string;
  tenantSlug: string;
  providers: ProviderOverview[];
  canCreate: boolean;
};

export function ProviderDashboard({ tenantId, tenantSlug, providers, canCreate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const byType = new Map(providers.map((p) => [p.type, p]));

  function enable(type: ProviderType) {
    startTransition(async () => {
      const result = await enableProviderAction(tenantId, { type });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${PROVIDER_REGISTRY[type].name} enabled.`);
      router.push(`/${tenantSlug}/admin/providers/${result.data.providerId}`);
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {DASHBOARD_PROVIDER_TYPES.map((type) => {
        const meta = PROVIDER_REGISTRY[type];
        const provider = byType.get(type);
        const isEnabled = provider?.enabled ?? false;

        return (
          <div
            key={type}
            className={cn(
              "flex flex-col rounded-lg border p-4",
              !isEnabled && "opacity-80",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-muted flex size-9 items-center justify-center rounded-md">
                  <Cable className="text-muted-foreground size-4" />
                </span>
                <div>
                  <p className="font-medium">{meta.name}</p>
                  <p className="text-muted-foreground text-xs">{meta.category}</p>
                </div>
              </div>
              {isEnabled && provider?.connectionStatus && (
                <StatusBadge tone={CONNECTION_TONE[provider.connectionStatus] ?? "neutral"}>
                  {provider.connectionStatus.toLowerCase()}
                </StatusBadge>
              )}
            </div>

            <p className="text-muted-foreground mt-3 flex-1 text-sm">{meta.description}</p>

            <div className="mt-3 flex flex-wrap gap-1">
              {meta.capabilities.slice(0, 3).map((cap) => (
                <Badge key={cap} variant="secondary" className="text-[10px]">
                  {cap.replace(/_/g, " ")}
                </Badge>
              ))}
              {meta.capabilities.length > 3 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{meta.capabilities.length - 3}
                </Badge>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              {isEnabled && provider ? (
                <>
                  <div className="text-muted-foreground text-xs">
                    {provider.openErrors > 0 && (
                      <span className="font-medium text-red-500">
                        {provider.openErrors} open error{provider.openErrors > 1 ? "s" : ""}
                      </span>
                    )}
                    {provider.openErrors === 0 && provider.lastSyncAt && (
                      <span>Synced {new Date(provider.lastSyncAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <Link href={`/${tenantSlug}/admin/providers/${provider.id}`}>
                    <Button size="sm" variant="outline">
                      Manage
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground text-xs">Not enabled</span>
                  {canCreate && (
                    <Button size="sm" disabled={isPending} onClick={() => enable(type)}>
                      <Plug className="mr-1.5 size-4" />
                      Enable
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
