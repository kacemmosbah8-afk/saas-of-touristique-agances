import { notFound } from "next/navigation";

import { getCachedTenant } from "@/shared/lib/db";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";
import { SiteHeader } from "@/features/public-site/components/site-header";
import { SiteFooter } from "@/features/public-site/components/site-footer";
import { defaultLocale, localeDir, getDictionary } from "@/shared/i18n/dictionary";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";

/**
 * The agency's public storefront — the default, unauthenticated experience
 * at `/[tenantSlug]`. Lives in the `(public)` route group specifically so
 * it's a true sibling of `[tenantSlug]/admin`, not an ancestor of it — this
 * layout previously sat directly under `[tenantSlug]/`, which meant every
 * `/admin` page was also nested inside it and got wrapped in the public
 * SiteHeader/SiteFooter chrome (and this route's own
 * homepage `loading.tsx` as the Suspense fallback) despite the doc comment
 * here always having claimed sibling status. Only caught by an actual
 * browser sign-in test, not by `tsc`/build, since both layouts type-check
 * and compile fine independently of how they nest. `admin` carries its own
 * session-gated layout; this one never requires a session. Everything
 * rendered here (name, logo, contact info) comes from the tenant's own
 * data — there is no TravelOS-branded fallback.
 *
 * `dir`/`lang` are set here, scoped to this subtree only, rather than on
 * the root `<html>` (shared by the marketing site, dashboard, and portal,
 * none of which are translated) — the App Router only allows one root
 * layout to own `<html>`, but `dir` cascades to descendants for both the
 * Unicode bidi algorithm and CSS logical properties, so setting it on this
 * wrapper is sufficient without touching anything outside the storefront.
 *
 * Locale is per-visitor (a cookie set by `LanguageSwitcher`, read via
 * `getVisitorLocale`), Arabic by default — not per-URL. See that module's
 * doc comment for the SEO trade-off of that choice.
 */
export default async function PublicSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const [profile, cookieLocale] = await Promise.all([
    getAgencyProfile(tenant.id),
    getVisitorLocale(),
  ]);
  // A visitor's cookie can outlive the agency's own choice — e.g. French was
  // enabled, a visitor switched, then the agency turned it back off. Without
  // this override they'd keep seeing French with no way to switch back.
  const locale = profile.frenchEnabled ? cookieLocale : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div dir={localeDir[locale]} lang={locale} className="flex min-h-screen flex-col">
      <SiteHeader
        tenantSlug={tenantSlug}
        agencyName={tenant.name}
        dict={dict}
        locale={locale}
        frenchEnabled={profile.frenchEnabled}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter tenantSlug={tenantSlug} agencyName={tenant.name} profile={profile} dict={dict} locale={locale} />
    </div>
  );
}
