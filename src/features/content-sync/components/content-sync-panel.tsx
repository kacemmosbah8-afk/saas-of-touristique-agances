"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag, MapPin, Building2, Globe2, RefreshCw, KeyRound } from "lucide-react";

import {
  updateContentSyncSettingsAction,
  triggerContentSyncNowAction,
} from "@/features/content-sync/actions/content-sync.action";
import type { ContentSyncStatus } from "@/features/content-sync/queries/content-sync.query";
import { CONTENT_SYNC_DATASETS, type ContentSyncDataset } from "@/features/content-sync/lib/types";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";

type Props = {
  tenantId: string;
  configured: boolean;
  canManage: boolean;
  status: ContentSyncStatus;
};

const DATASET_LABELS: Record<ContentSyncDataset, string> = {
  countries: "Countries",
  cities: "Cities",
  destinations: "Destinations",
  hotels: "Hotels (+ images, amenities)",
};

const COUNT_CARDS: { key: keyof ContentSyncStatus["counts"]; label: string; icon: typeof Flag }[] = [
  { key: "countries", label: "Countries", icon: Flag },
  { key: "cities", label: "Cities", icon: MapPin },
  { key: "destinations", label: "Destinations", icon: Globe2 },
  { key: "hotels", label: "Hotels", icon: Building2 },
];

export function ContentSyncPanel({ tenantId, configured, canManage, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(status.settings.enabled);
  const [intervalMinutes, setIntervalMinutes] = useState(status.settings.intervalMinutes);
  const [datasets, setDatasets] = useState<ContentSyncDataset[]>(status.settings.datasets);

  function toggleDataset(dataset: ContentSyncDataset, checked: boolean) {
    setDatasets((prev) => (checked ? [...prev, dataset] : prev.filter((d) => d !== dataset)));
  }

  function saveSettings() {
    const supported = datasets.filter((d) => !status.unsupportedDatasets.includes(d));
    if (supported.length === 0) {
      toast.error("Select at least one dataset to synchronize.");
      return;
    }
    startTransition(async () => {
      const result = await updateContentSyncSettingsAction(tenantId, {
        enabled,
        intervalMinutes,
        datasets: supported,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(enabled ? "Content sync enabled." : "Content sync settings saved.");
      router.refresh();
    });
  }

  function syncNow() {
    startTransition(async () => {
      const result = await triggerContentSyncNowAction(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Sync queued — it will run on the next automation tick.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Awaiting credentials</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              Connect this agency&rsquo;s TravelPayouts API token from the Integrations page (encrypted
              per workspace) before enabling the scheduler.
            </p>
          </div>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-4">
        {COUNT_CARDS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-lg border p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Icon className="size-3.5" />
              {label}
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{status.counts[key]}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Scheduled Synchronization</h2>
            <p className="text-muted-foreground text-xs">
              Local database is the only source the public website reads from — TravelPayouts is
              synced here, never called from a page directly.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked === true)}
            disabled={!canManage || !configured}
          />
          Enable automatic synchronization
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Interval (minutes)</label>
            <Input
              type="number"
              min={60}
              max={10_080}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value) || 60)}
              disabled={!canManage}
            />
            <p className="text-muted-foreground text-xs">Between 60 (1h) and 10,080 (7d).</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Datasets</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTENT_SYNC_DATASETS.map((dataset) => {
              const unsupported = status.unsupportedDatasets.includes(dataset);
              return (
                <label key={dataset} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={datasets.includes(dataset) && !unsupported}
                    onCheckedChange={(checked) => toggleDataset(dataset, checked === true)}
                    disabled={!canManage || unsupported}
                  />
                  <span className={unsupported ? "text-muted-foreground" : undefined}>
                    {DATASET_LABELS[dataset]}
                    {unsupported && " — unavailable (TravelPayouts discontinued Hotellook, its only hotel-content source, on 2025-10-20; no replacement is offered)"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" disabled={isPending} onClick={saveSettings}>
              {isPending ? "Saving…" : "Save Settings"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || !configured || status.hasPendingRun}
              onClick={syncNow}
            >
              <RefreshCw className="mr-1.5 size-4" />
              {status.hasPendingRun ? "Sync queued…" : "Sync Now"}
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Sync History</h2>
        {status.history.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
            No syncs have run yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b text-left">
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Started</th>
                  <th className="px-4 py-2.5 font-medium">Records</th>
                  <th className="px-4 py-2.5 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {status.history.map((sync) => (
                  <tr key={sync.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5">
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
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-xs">
                      {new Date(sync.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{sync.recordsProcessed}</td>
                    <td className="text-muted-foreground max-w-[240px] truncate px-4 py-2.5 text-xs">
                      {sync.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
