"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  KeyRound,
  PlugZap,
  RefreshCw,
  Trash2,
  Unplug,
  XCircle,
} from "lucide-react";
import type { ProviderCredentialType } from "@prisma/client";

import type { ProviderDetail } from "@/features/providers/queries/get-providers.query";
import {
  PROVIDER_REGISTRY,
  CREDENTIAL_TYPE_LABELS,
  AUTH_TYPE_LABELS,
} from "@/features/providers/lib/provider-registry";
import {
  updateProviderConnectionAction,
  saveProviderCredentialAction,
  deleteProviderCredentialAction,
  testProviderConnectionAction,
  runProviderSyncAction,
  toggleProviderCapabilityAction,
  addProviderWebhookAction,
  deleteProviderWebhookAction,
  resolveProviderErrorAction,
  disconnectProviderAction,
  removeProviderAction,
} from "@/features/providers/actions/provider.action";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Separator } from "@/shared/components/ui/separator";

const LOG_LEVEL_CLASS: Record<string, string> = {
  DEBUG: "text-muted-foreground",
  INFO: "text-foreground",
  WARN: "text-amber-600 dark:text-amber-400",
  ERROR: "text-red-600 dark:text-red-400",
};

type Props = {
  tenantId: string;
  tenantSlug: string;
  provider: ProviderDetail;
  canManage: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function ProviderDetailTabs({
  tenantId,
  tenantSlug,
  provider,
  canManage,
  canEdit,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const meta = PROVIDER_REGISTRY[provider.type];
  const connection = provider.connection;

  // Connection settings local state (simple controlled form).
  const [environment, setEnvironment] = useState(
    connection?.environment ?? "SANDBOX",
  );
  const [authType, setAuthType] = useState(
    connection?.authType ?? meta.authType,
  );
  const [baseUrl, setBaseUrl] = useState(connection?.baseUrl ?? "");
  const [autoReconnect, setAutoReconnect] = useState(
    connection?.autoReconnect ?? true,
  );

  // Credential entry state.
  const [credType, setCredType] = useState<ProviderCredentialType>(
    meta.credentialTypes[0],
  );
  const [credValue, setCredValue] = useState("");
  const [credExpiry, setCredExpiry] = useState("");

  // Webhook entry state.
  const [webhookEvent, setWebhookEvent] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  function saveConnection() {
    startTransition(async () => {
      const result = await updateProviderConnectionAction(
        tenantId,
        provider.id,
        {
          environment,
          authType,
          baseUrl,
          autoReconnect,
        },
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Connection settings saved.");
      router.refresh();
    });
  }

  function saveCredential() {
    if (!credValue.trim()) return;
    startTransition(async () => {
      const result = await saveProviderCredentialAction(tenantId, provider.id, {
        type: credType,
        value: credValue,
        expiresAt: credExpiry,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCredValue("");
      setCredExpiry("");
      toast.success("Credential saved (encrypted).");
      router.refresh();
    });
  }

  function removeCredential(credentialId: string) {
    startTransition(async () => {
      const result = await deleteProviderCredentialAction(
        tenantId,
        credentialId,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Credential removed.");
      router.refresh();
    });
  }

  function testConnection() {
    startTransition(async () => {
      const result = await testProviderConnectionAction(tenantId, provider.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.ok) {
        toast.success(`Connection OK (${result.data.latencyMs}ms)`);
      } else {
        toast.error(result.data.message);
      }
      router.refresh();
    });
  }

  function runSync() {
    startTransition(async () => {
      const result = await runProviderSyncAction(tenantId, provider.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Sync completed.");
      router.refresh();
    });
  }

  function toggleCapability(capabilityId: string, enabled: boolean) {
    startTransition(async () => {
      const result = await toggleProviderCapabilityAction(
        tenantId,
        capabilityId,
        enabled,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function addWebhook() {
    if (!webhookEvent.trim() || !webhookUrl.trim()) return;
    startTransition(async () => {
      const result = await addProviderWebhookAction(tenantId, provider.id, {
        event: webhookEvent.trim(),
        url: webhookUrl.trim(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setWebhookEvent("");
      setWebhookUrl("");
      toast.success("Webhook added.");
      router.refresh();
    });
  }

  function removeWebhook(webhookId: string) {
    startTransition(async () => {
      const result = await deleteProviderWebhookAction(tenantId, webhookId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function resolveError(errorId: string) {
    startTransition(async () => {
      const result = await resolveProviderErrorAction(tenantId, errorId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectProviderAction(tenantId, provider.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Disconnected.");
      router.refresh();
    });
  }

  async function removeProvider() {
    if (
      !(await confirm({
        title: `Remove ${meta.name}?`,
        description: "Credentials and logs are kept for audit.",
        destructive: true,
      }))
    )
      return;
    startTransition(async () => {
      const result = await removeProviderAction(tenantId, provider.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Provider removed.");
      router.push(`/${tenantSlug}/admin/providers`);
    });
  }

  return (
    <>
      <Tabs defaultValue="connection">
        <TabsList className="mb-6">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------ Connection tab */}
        <TabsContent value="connection" className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Environment &amp; Authentication
              </h3>
              {canEdit && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={testConnection}
                  >
                    <PlugZap className="mr-1.5 size-4" />
                    Test Connection
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={saveConnection}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Environment</label>
                <Select
                  value={environment}
                  onValueChange={(v) => {
                    setEnvironment(v as typeof environment);
                    setBaseUrl(
                      v === "PRODUCTION" ? meta.productionUrl : meta.sandboxUrl,
                    );
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SANDBOX">Sandbox</SelectItem>
                    <SelectItem value="PRODUCTION">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Auth Type</label>
                <Select
                  value={authType}
                  onValueChange={(v) => setAuthType(v as typeof authType)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["OAUTH", "API_KEY", "SECRET", "CERTIFICATE"] as const
                    ).map((t) => (
                      <SelectItem key={t} value={t}>
                        {AUTH_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Base URL</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder={
                    environment === "PRODUCTION"
                      ? meta.productionUrl
                      : meta.sandboxUrl
                  }
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={autoReconnect}
                  onCheckedChange={(checked) =>
                    setAutoReconnect(checked === true)
                  }
                  disabled={!canEdit}
                />
                Automatically reconnect when tokens expire
              </label>
            </div>

            {connection?.tokenExpiresAt && (
              <p className="text-muted-foreground text-xs">
                Token expires{" "}
                {new Date(connection.tokenExpiresAt).toLocaleString()}
              </p>
            )}
          </section>

          <Separator />

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Credentials</h3>
              <p className="text-muted-foreground text-sm">
                Stored encrypted (AES-256-GCM). Values are never displayed after
                saving.
              </p>
            </div>

            {provider.credentials.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {provider.credentials.map((cred) => (
                  <li
                    key={cred.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm"
                  >
                    <KeyRound className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {CREDENTIAL_TYPE_LABELS[cred.type]}
                      </p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {cred.maskedValue}
                      </p>
                    </div>
                    {cred.expiresAt && (
                      <span className="text-muted-foreground text-xs">
                        Expires {new Date(cred.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive size-7"
                        disabled={isPending}
                        onClick={() => removeCredential(cred.id)}
                        aria-label="Delete credential"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canManage && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Type</label>
                  <Select
                    value={credType}
                    onValueChange={(v) =>
                      setCredType(v as ProviderCredentialType)
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meta.credentialTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {CREDENTIAL_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[200px] flex-1 space-y-1.5">
                  <label className="text-xs font-medium">Value</label>
                  <Input
                    type="password"
                    autoComplete="off"
                    value={credValue}
                    onChange={(e) => setCredValue(e.target.value)}
                    placeholder="Paste secret…"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Expires (optional)
                  </label>
                  <Input
                    type="date"
                    className="w-[150px]"
                    value={credExpiry}
                    onChange={(e) => setCredExpiry(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={isPending || !credValue.trim()}
                  onClick={saveCredential}
                >
                  Save Credential
                </Button>
              </div>
            )}
          </section>

          {(canManage || canDelete) && (
            <>
              <Separator />
              <section className="flex flex-wrap gap-2">
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={disconnect}
                  >
                    <Unplug className="mr-1.5 size-4" />
                    Disconnect
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={removeProvider}
                  >
                    <Trash2 className="mr-1.5 size-4" />
                    Remove Provider
                  </Button>
                )}
              </section>
            </>
          )}
        </TabsContent>

        {/* ---------------------------------------------- Capabilities tab */}
        <TabsContent value="capabilities">
          <ul className="divide-y rounded-lg border">
            {provider.capabilities.map((cap) => (
              <li
                key={cap.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-medium capitalize">
                  {cap.name.replace(/_/g, " ")}
                </span>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={cap.enabled}
                    disabled={!canEdit || isPending}
                    onCheckedChange={(checked) =>
                      toggleCapability(cap.id, checked === true)
                    }
                  />
                  {cap.enabled ? "Enabled" : "Disabled"}
                </label>
              </li>
            ))}
          </ul>
        </TabsContent>

        {/* -------------------------------------------------- Webhooks tab */}
        <TabsContent value="webhooks" className="space-y-4">
          {canManage && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Event</label>
                <Input
                  className="w-[180px]"
                  placeholder="booking.updated"
                  value={webhookEvent}
                  onChange={(e) => setWebhookEvent(e.target.value)}
                />
              </div>
              <div className="min-w-[220px] flex-1 space-y-1.5">
                <label className="text-xs font-medium">Callback URL</label>
                <Input
                  placeholder="https://…"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={
                  isPending || !webhookEvent.trim() || !webhookUrl.trim()
                }
                onClick={addWebhook}
              >
                Add Webhook
              </Button>
            </div>
          )}
          {provider.webhooks.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
              No webhooks registered.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {provider.webhooks.map((hook) => (
                <li
                  key={hook.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{hook.event}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {hook.url}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-7"
                      disabled={isPending}
                      onClick={() => removeWebhook(hook.id)}
                      aria-label="Delete webhook"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ------------------------------------------------------ Logs tab */}
        <TabsContent value="logs">
          {provider.logs.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
              No log entries yet.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border font-mono text-xs">
              {provider.logs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 px-4 py-2">
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  <span
                    className={`w-12 shrink-0 font-semibold ${LOG_LEVEL_CLASS[log.level]}`}
                  >
                    {log.level}
                  </span>
                  <span className="min-w-0 break-words">{log.message}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ------------------------------------------------ Monitoring tab */}
        <TabsContent value="monitoring" className="space-y-8">
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-xl font-semibold">
                {provider.health?.status === "HEALTHY" ? (
                  <CheckCircle2 className="size-5 text-emerald-500" />
                ) : provider.health?.status === "DOWN" ? (
                  <XCircle className="size-5 text-red-500" />
                ) : (
                  <Activity className="text-muted-foreground size-5" />
                )}
                {provider.health?.status.toLowerCase() ?? "unknown"}
              </p>
              <p className="text-muted-foreground text-xs">Health</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xl font-semibold tabular-nums">
                {provider.health?.latencyMs != null
                  ? `${provider.health.latencyMs}ms`
                  : "—"}
              </p>
              <p className="text-muted-foreground text-xs">Latency</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xl font-semibold tabular-nums">
                {provider.rateLimit?.remaining ?? "—"}
              </p>
              <p className="text-muted-foreground text-xs">
                Rate limit remaining
                {provider.rateLimit?.limitPerMinute
                  ? ` / ${provider.rateLimit.limitPerMinute}/min`
                  : ""}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xl font-semibold tabular-nums">
                {provider.errors.filter((e) => !e.resolved).length}
              </p>
              <p className="text-muted-foreground text-xs">Open errors</p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Synchronization</h3>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={runSync}
                >
                  <RefreshCw className="mr-1.5 size-4" />
                  Run Sync
                </Button>
              )}
            </div>
            {provider.syncs.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
                No syncs have run yet.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border text-sm">
                {provider.syncs.map((sync) => (
                  <li
                    key={sync.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        sync.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : sync.status === "FAILED"
                            ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {sync.status.toLowerCase()}
                    </span>
                    <span className="text-muted-foreground flex-1 text-xs">
                      {new Date(sync.startedAt).toLocaleString()}
                      {sync.error ? ` — ${sync.error}` : ""}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {sync.recordsProcessed} records
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Errors</h3>
            {provider.errors.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
                No errors recorded.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border text-sm">
                {provider.errors.map((error) => (
                  <li
                    key={error.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          error.resolved
                            ? "text-muted-foreground line-through"
                            : ""
                        }
                      >
                        {error.code ? `[${error.code}] ` : ""}
                        {error.message}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(error.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!error.resolved && canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => resolveError(error.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>
      </Tabs>
      {confirmDialog}
    </>
  );
}
