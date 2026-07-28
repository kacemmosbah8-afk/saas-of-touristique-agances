import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchX } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requireTenantMembershipOrNotFound } from "@/shared/lib/permissions/guard";
import { globalSearch } from "@/features/search/queries/global-search.query";
import { GlobalSearchBox } from "@/features/search/components/global-search-box";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Search" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const { q } = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requireTenantMembershipOrNotFound(tenant.id);

  const query = (q ?? "").trim();
  const groups = query.length >= 2 ? await globalSearch(db, tenantSlug, query) : [];
  const totalResults = groups.reduce((sum, g) => sum + g.results.length, 0);
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).search;
  const nav = getAdminDictionary(locale).shell.nav;
  const typeLabels: Record<(typeof groups)[number]["type"], string> = {
    package: nav.packages,
    hotel: nav.hotels,
    activity: nav.activities,
    guide: nav.guides,
    supplier: nav.suppliers,
    destination: nav.destinations,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{dict.pageTitle}</h1>
        <p className="text-muted-foreground text-sm">{dict.pageSubtitle}</p>
      </div>

      <GlobalSearchBox tenantSlug={tenantSlug} defaultValue={query} autoFocus locale={locale} />

      {query.length < 2 ? (
        <p className="text-muted-foreground text-sm">{dict.typeToSearch}</p>
      ) : totalResults === 0 ? (
        <div className="border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <SearchX className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">{dict.noResults(query)}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.type}>
              <h2 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
                {typeLabels[group.type]}
              </h2>
              <div className="divide-y rounded-lg border">
                {group.results.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    className="hover:bg-muted/40 flex items-center justify-between px-4 py-3 transition-colors"
                  >
                    <span className="font-medium">{result.name}</span>
                    {result.subtitle && (
                      <span className="text-muted-foreground text-sm">{result.subtitle}</span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
