"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag, MapPin, Building2, Sparkles, Plane, Send, RefreshCw } from "lucide-react";

import type { SyncHistoryItem } from "@/features/integrations/queries/logs.query";
import { runSyncAction } from "@/features/integrations/actions/sync.action";
import type { SyncDataset } from "@/features/integrations/schemas/integration.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const DATASETS: {
  dataset: SyncDataset;
  label: string;
  provider: string;
  description: string;
  icon: typeof Flag;
  needsDestination?: boolean;
}[] = [
  {
    dataset: "countries",
    label: "Countries",
    provider: "Hotelbeds",
    description: "Country codes and names from the content API.",
    icon: Flag,
  },
  {
    dataset: "destinations",
    label: "Cities / Destinations",
    provider: "Hotelbeds",
    description: "Destination zones imported as cities.",
    icon: MapPin,
  },
  {
    dataset: "hotels",
    label: "Hotels",
    provider: "Hotelbeds",
    description: "Hotel content imported into your hotel catalogue (batched).",
    icon: Building2,
    needsDestination: true,
  },
  {
    dataset: "amenities",
    label: "Amenities",
    provider: "Hotelbeds",
    description: "Hotel facility catalogue.",
    icon: Sparkles,
  },
  {
    dataset: "airports",
    label: "Airports",
    provider: "Duffel",
    description: "IATA airports with city, country, and coordinates.",
    icon: Plane,
  },
  {
    dataset: "airlines",
    label: "Airlines",
    provider: "Duffel",
    description: "IATA airlines with logos.",
    icon: Send,
  },
];

type Props = {
  tenantId: string;
  history: SyncHistoryItem[];
  canSync: boolean;
};

export function SyncManager({ tenantId, history, canSync }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState<SyncDataset | null>(null);
  const [hotelDestination, setHotelDestination] = useState("");

  function run(dataset: SyncDataset) {
    setRunning(dataset);
    startTransition(async () => {
      const result = await runSyncAction(tenantId, {
        dataset,
        destinationCode: dataset === "hotels" ? hotelDestination : "",
      });
      setRunning(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.detail} (${(result.data.durationMs / 1000).toFixed(1)}s)`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DATASETS.map(({ dataset, label, provider, description, icon: Icon, needsDestination }) => (
          <div key={dataset} className="flex flex-col rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Icon className="text-muted-foreground size-4" />
              <p className="font-medium">{label}</p>
              <span className="text-muted-foreground bg-muted ml-auto rounded-full px-2 py-0.5 text-xs">
                {provider}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 flex-1 text-sm">{description}</p>
            {needsDestination && (
              <Input
                placeholder="Destination code (optional, e.g. PMI)"
                className="mt-3 uppercase"
                value={hotelDestination}
                onChange={(e) => setHotelDestination(e.target.value.toUpperCase())}
              />
            )}
            {canSync && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                disabled={isPending}
                onClick={() => run(dataset)}
              >
                <RefreshCw
                  className={`mr-1.5 size-4 ${running === dataset ? "animate-spin" : ""}`}
                />
                {running === dataset ? "Syncing…" : "Sync Now"}
              </Button>
            )}
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Sync History</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
            No syncs have run yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b text-left">
                  <th className="px-4 py-2.5 font-medium">Provider</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Started</th>
                  <th className="px-4 py-2.5 font-medium">Records</th>
                  <th className="px-4 py-2.5 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sync) => (
                  <tr key={sync.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 capitalize">{sync.providerType.toLowerCase()}</td>
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
