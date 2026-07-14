"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Cloud,
  Globe,
  KeyRound,
  Plane,
  PlugZap,
  Power,
  ScrollText,
  ShieldCheck,
  Unplug,
  Upload,
  XCircle,
} from "lucide-react";

import type { IntegrationOverview } from "@/features/integrations/queries/integrations.query";
import {
  testIntegrationAction,
  toggleIntegrationAction,
} from "@/features/integrations/actions/integration.action";
import {
  disconnectProviderCredentialsAction,
  importEnvCredentialsAction,
} from "@/features/integrations/actions/credentials.action";
import { ConnectionWizard } from "@/features/integrations/components/connection-wizard";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

const ICONS = { DUFFEL: Plane, HOTELBEDS: Building2, AMADEUS: Globe } as const;
const EXPLORER_PATHS = { DUFFEL: "duffel", HOTELBEDS: "hotelbeds", AMADEUS: "amadeus" } as const;

type Props = {
  tenantId: string;
  tenantSlug: string;
  integration: IntegrationOverview;
  canEdit: boolean;
  canManage: boolean;
  platformFallbackAvailable: boolean;
};

export function IntegrationCard({
  tenantId,
  tenantSlug,
  integration,
  canEdit,
  canManage,
  platformFallbackAvailable,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();
  const Icon = ICONS[integration.type];

  const connected = integration.connectionStatus === "CONNECTED";
  const usingShared = integration.configured && integration.credentialSource === "environment";

  function test() {
    startTransition(async () => {
      const result = await testIntegrationAction(tenantId, { type: integration.type });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.ok) toast.success(`${integration.name} connected (${result.data.latencyMs}ms)`);
      else toast.error(result.data.message);
      router.refresh();
    });
  }

  function toggle(enabled: boolean) {
    startTransition(async () => {
      const result = await toggleIntegrationAction(tenantId, { type: integration.type, enabled });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${integration.name} ${enabled ? "enabled" : "disabled"}.`);
      router.refresh();
    });
  }

  async function disconnect() {
    if (
      !(await confirm({
        title: `Remove ${integration.name} credentials for this agency?`,
        destructive: true,
      }))
    )
      return;
    startTransition(async () => {
      const result = await disconnectProviderCredentialsAction(tenantId, { type: integration.type });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${integration.name} disconnected.`);
      router.refresh();
    });
  }

  function importEnv() {
    startTransition(async () => {
      const result = await importEnvCredentialsAction(tenantId, { type: integration.type });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Imported platform credentials into this agency. Rotate them when ready.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-muted flex size-10 items-center justify-center rounded-md">
            <Icon className="text-muted-foreground size-5" />
          </span>
          <div>
            <p className="font-medium">{integration.name}</p>
            <p className="text-muted-foreground text-xs">{integration.kind}</p>
          </div>
        </div>
        {integration.configured ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              connected
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {connected ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
            {connected ? "Connected" : "Not tested"}
          </span>
        ) : (
          <Badge variant="outline" className="gap-1">
            <KeyRound className="size-3" />
            Not connected
          </Badge>
        )}
      </div>

      <p className="text-muted-foreground mt-3 flex-1 text-sm">{integration.description}</p>

      {/* Credential source — the multi-tenant signal */}
      <div className="mt-3">
        {integration.hasOwnCredentials ? (
          <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
            <ShieldCheck className="size-3" />
            Agency&rsquo;s own account
          </Badge>
        ) : usingShared ? (
          <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700 dark:text-amber-400">
            <Cloud className="size-3" />
            Shared platform credentials
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <KeyRound className="size-3" />
            No credentials
          </Badge>
        )}
      </div>

      <dl className="text-muted-foreground mt-3 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt>Last successful request</dt>
          <dd>{integration.lastSuccessAt ? new Date(integration.lastSuccessAt).toLocaleString() : "—"}</dd>
        </div>
        {integration.latencyMs != null && (
          <div className="flex justify-between gap-2">
            <dt>Latency</dt>
            <dd className="tabular-nums">{integration.latencyMs}ms</dd>
          </div>
        )}
        {integration.lastError && (
          <div className="flex justify-between gap-2 text-red-600 dark:text-red-400">
            <dt>Last error</dt>
            <dd className="max-w-[60%] truncate text-right" title={integration.lastError.message}>
              {integration.lastError.message}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canManage && (
          <ConnectionWizard
            tenantId={tenantId}
            type={integration.type}
            name={integration.name}
            hasOwnCredentials={integration.hasOwnCredentials}
            trigger={
              <Button size="sm" variant={integration.hasOwnCredentials ? "outline" : "default"}>
                <KeyRound className="mr-1.5 size-4" />
                {integration.hasOwnCredentials ? "Update" : "Connect"}
              </Button>
            }
          />
        )}
        {canEdit && integration.configured && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={test}>
            <PlugZap className="mr-1.5 size-4" />
            Test
          </Button>
        )}
        {canManage && usingShared && platformFallbackAvailable && (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={importEnv}>
            <Upload className="mr-1.5 size-4" />
            Adopt platform keys
          </Button>
        )}
        {canManage && integration.hasOwnCredentials && (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={disconnect}>
            <Unplug className="mr-1.5 size-4" />
            Disconnect
          </Button>
        )}
        {canManage && integration.providerId && (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => toggle(!integration.enabled)}>
            <Power className="mr-1.5 size-4" />
            {integration.enabled ? "Disable" : "Enable"}
          </Button>
        )}
        <span className="flex-1" />
        <Link href={`/${tenantSlug}/integrations/logs?provider=${integration.type}`}>
          <Button size="sm" variant="ghost">
            <ScrollText className="mr-1.5 size-4" />
            Logs
          </Button>
        </Link>
        <Link href={`/${tenantSlug}/integrations/${EXPLORER_PATHS[integration.type]}`}>
          <Button size="sm">Open</Button>
        </Link>
      </div>
      {confirmDialog}
    </div>
  );
}
