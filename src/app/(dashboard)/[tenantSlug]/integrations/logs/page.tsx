import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { listIntegrationLogs } from "@/features/integrations/queries/logs.query";
import { logsFiltersSchema } from "@/features/integrations/schemas/integration.schema";
import { LogsFilterBar } from "@/features/integrations/components/logs-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";

export const metadata = { title: "Integration Logs — TravelOS" };

const LEVEL_CLASS: Record<string, string> = {
  DEBUG: "text-muted-foreground",
  INFO: "text-foreground",
  WARN: "text-amber-600 dark:text-amber-400",
  ERROR: "text-red-600 dark:text-red-400",
};

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IntegrationLogsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "provider", "view");

  const filters = logsFiltersSchema.parse({
    provider: raw.provider,
    level: raw.level,
    page: raw.page,
  });

  const result = await listIntegrationLogs(db, filters);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/integrations`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Integrations
        </Link>
        <h1 className="text-xl font-semibold">Integration Logs</h1>
        <p className="text-muted-foreground text-sm">
          {result.total} log entr{result.total !== 1 ? "ies" : "y"} across Duffel, Hotelbeds, and
          Amadeus — API calls, response times, health checks, and sync runs.
        </p>
      </div>

      <Suspense>
        <LogsFilterBar />
      </Suspense>

      {result.logs.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          No log entries match your filters.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border font-mono text-xs">
          {result.logs.map((log) => (
            <li key={log.id} className="flex items-start gap-3 px-4 py-2">
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {new Date(log.createdAt).toLocaleString()}
              </span>
              <span className="text-muted-foreground w-20 shrink-0 capitalize">
                {log.providerType.toLowerCase()}
              </span>
              <span className={`w-12 shrink-0 font-semibold ${LEVEL_CLASS[log.level]}`}>
                {log.level}
              </span>
              <span className="min-w-0 break-words">{log.message}</span>
              {log.durationMs != null && (
                <span className="text-muted-foreground ml-auto shrink-0 tabular-nums">
                  {log.durationMs}ms
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <Suspense>
        <DataPagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          noun="entry"
          nounPlural="entries"
        />
      </Suspense>
    </div>
  );
}
