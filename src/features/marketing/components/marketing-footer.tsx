import Link from "next/link";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { LEGAL_LINKS } from "@/features/marketing/lib/nav-links";
import { Logo } from "@/shared/components/brand/logo";

const footerLinkClass =
  "text-muted-foreground hover:text-foreground text-sm transition-colors";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/60 border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 font-serif text-lg font-semibold tracking-tight">
            <Logo size={36} />
            {siteConfig.name}
          </Link>
          <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
            {siteConfig.tagline}
          </p>
          <a href={`mailto:${siteConfig.supportEmail}`} className={`${footerLinkClass} mt-4 block`}>
            {siteConfig.supportEmail}
          </a>
        </div>

        <div>
          <p className="text-sm font-medium">Legal</p>
          <ul className="mt-4 space-y-2.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={footerLinkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-border/60 border-t px-6 py-6">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs">
          <p>
            © {year} {siteConfig.companyLegalName}. All rights reserved.
          </p>
          <p>{siteConfig.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
