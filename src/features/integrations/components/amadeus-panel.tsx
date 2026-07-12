"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Globe, KeyRound, Search } from "lucide-react";

import type { AirportDto } from "@/features/integrations/lib/dto";
import { searchAmadeusLocationsAction } from "@/features/integrations/actions/amadeus.action";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Props = {
  tenantId: string;
  configured: boolean;
};

const SERVICES = [
  { name: "OAuth2 authentication", status: "Implemented — client-credentials flow with token caching" },
  { name: "Airport & city lookup", status: "Implemented — /v1/reference-data/locations" },
  { name: "Flight offer search", status: "Implemented — /v2/shopping/flight-offers" },
  { name: "Hotel offers", status: "Planned — arrives with the booking milestone" },
];

export function AmadeusPanel({ tenantId, configured }: Props) {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<AirportDto[]>([]);

  function search() {
    if (query.trim().length < 2) return;
    startTransition(async () => {
      const result = await searchAmadeusLocationsAction(tenantId, { query: query.trim() });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLocations(result.data.result);
      if (result.data.result.length === 0) toast.info("No locations matched.");
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
              The full Amadeus integration is implemented and will activate automatically once{" "}
              <code className="font-mono text-xs">AMADEUS_CLIENT_ID</code> and{" "}
              <code className="font-mono text-xs">AMADEUS_CLIENT_SECRET</code> are added to the
              environment. No placeholder credentials are used.
            </p>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium">Prepared Services</h2>
        <ul className="divide-y rounded-lg border text-sm">
          {SERVICES.map((service) => (
            <li key={service.name} className="flex items-center gap-3 px-4 py-2.5">
              <Globe className="text-muted-foreground size-4 shrink-0" />
              <span className="flex-1 font-medium">{service.name}</span>
              <span className="text-muted-foreground text-xs">{service.status}</span>
            </li>
          ))}
        </ul>
      </section>

      {configured && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Location Search</h2>
          <div className="flex max-w-md gap-2">
            <Input
              placeholder="City or airport…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
            />
            <Button variant="outline" disabled={isPending} onClick={search}>
              <Search className="mr-1.5 size-4" />
              {isPending ? "Searching…" : "Search"}
            </Button>
          </div>
          {locations.length > 0 && (
            <ul className="divide-y rounded-lg border text-sm">
              {locations.map((location, i) => (
                <li key={`${location.iataCode}-${i}`} className="flex items-center gap-3 px-4 py-2">
                  <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-semibold">
                    {location.iataCode}
                  </span>
                  <span className="flex-1">{location.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {[location.cityName, location.countryCode].filter(Boolean).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
