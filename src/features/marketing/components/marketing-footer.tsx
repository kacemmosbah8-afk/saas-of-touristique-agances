import Link from "next/link";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { MAIN_NAV_LINKS, LEGAL_LINKS } from "@/features/marketing/lib/nav-links";

const footerLinkClass =
  "text-muted-foreground hover:text-foreground text-sm transition-colors";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/60 border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1.5fr]">
        <div className="sm:col-span-2 md:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="bg-primary size-2.5 rounded-sm" aria-hidden />
            TravelOS
          </Link>
          <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
            {siteConfig.tagline}
          </p>
          {(siteConfig.social.twitter || siteConfig.social.linkedin) && (
            <div className="mt-4 flex gap-4">
              {siteConfig.social.twitter && (
                <a
                  href={siteConfig.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLinkClass}
                >
                  X / Twitter
                </a>
              )}
              {siteConfig.social.linkedin && (
                <a
                  href={siteConfig.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLinkClass}
                >
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium">Product</p>
          <ul className="mt-4 space-y-2.5">
            {MAIN_NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={footerLinkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium">Company</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/about" className={footerLinkClass}>
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className={footerLinkClass}>
                Contact
              </Link>
            </li>
            <li>
              <a href={`mailto:${siteConfig.supportEmail}`} className={footerLinkClass}>
                {siteConfig.supportEmail}
              </a>
            </li>
          </ul>
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
