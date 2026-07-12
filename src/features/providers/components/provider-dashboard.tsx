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
  PROVIDER_TYPES,
} from "@/features/providers/lib/provider-registry";
import { enableProviderAction } from "@/features/providers/actions/provider.action";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

const CONNECTION_BADGE: Record<string, string> = {
  CONNECTED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  ERROR: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  EXPIRED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  DISCONNECTED: "bg-muted text-muted-foreground",
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
      router.push(`/${tenantSlug}/providers/${result.data.providerId}`);
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PROVIDER_TYPES.map((type) => {
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
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    CONNECTION_BADGE[provider.connectionStatus] ?? "bg-muted",
                  )}
                >
                  {provider.connectionStatus.toLowerCase()}
                </span>
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
                  <Link href={`/${tenantSlug}/providers/${provider.id}`}>
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
