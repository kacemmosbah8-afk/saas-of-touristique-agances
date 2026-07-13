import Link from "next/link";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { MAIN_NAV_LINKS, LEGAL_LINKS } from "@/features/marketing/lib/nav-links";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/60 border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <p className="text-lg font-semibold tracking-tight">TravelOS</p>
          <p className="text-muted-foreground mt-2 max-w-xs text-sm">{siteConfig.tagline}</p>
          {(siteConfig.social.twitter || siteConfig.social.linkedin) && (
            <div className="mt-4 flex gap-4">
              {siteConfig.social.twitter && (
                <a
                  href={siteConfig.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  X / Twitter
                </a>
              )}
              {siteConfig.social.linkedin && (
                <a
                  href={siteConfig.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold">Product</p>
          <ul className="mt-3 space-y-2">
            {MAIN_NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Company</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/about" className="text-muted-foreground hover:text-foreground text-sm">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-muted-foreground hover:text-foreground text-sm">
                Contact
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                {siteConfig.supportEmail}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Legal</p>
          <ul className="mt-3 space-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-border/60 border-t px-6 py-6">
        <p className="text-muted-foreground mx-auto max-w-6xl text-xs">
          © {year} {siteConfig.companyLegalName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
