import Link from "next/link";
import { Mail, Phone, MessageCircle, MapPin, Clock, ExternalLink } from "lucide-react";

import type { ProfileSettings } from "@/features/settings/schemas/settings.schema";
import type { Dictionary, Locale } from "@/shared/i18n/dictionary";
import { localize } from "@/shared/lib/i18n/localize";

type Props = {
  tenantSlug: string;
  agencyName: string;
  profile: ProfileSettings;
  dict: Dictionary;
  locale: Locale;
};

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/**
 * Every contact channel here is conditional — an agency that hasn't filled
 * in a field yet simply doesn't show that row. Nothing falls back to a
 * TravelOS-owned placeholder value.
 */
export function SiteFooter({ tenantSlug, agencyName, profile, dict, locale }: Props) {
  const socialEntries = Object.entries(profile.socialLinks ?? {}).filter(
    ([, url]) => url && url.trim().length > 0,
  );
  const hasContactInfo =
    profile.contactEmail || profile.contactPhone || profile.whatsapp || profile.address;
  const tagline = localize(locale, profile.tagline ?? "", profile.taglineFr);
  const address = localize(locale, profile.address ?? "", profile.addressFr);
  const businessHours = localize(locale, profile.businessHours ?? "", profile.businessHoursFr);

  return (
    <footer className="bg-muted/30 mt-16 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-2">
          <p className="font-serif text-xl font-semibold tracking-tight">{agencyName}</p>
          {tagline && <p className="text-muted-foreground text-sm italic">{tagline}</p>}
        </div>

        {hasContactInfo && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">{dict.nav.contact}</p>
            {profile.contactEmail && (
              <a
                href={`mailto:${profile.contactEmail}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Mail className="size-4 shrink-0" />
                {profile.contactEmail}
              </a>
            )}
            {profile.contactPhone && (
              <a
                href={`tel:${profile.contactPhone}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Phone className="size-4 shrink-0" />
                {profile.contactPhone}
              </a>
            )}
            {profile.whatsapp && (
              <a
                href={`https://wa.me/${profile.whatsapp.replace(/[^\d+]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <MessageCircle className="size-4 shrink-0" />
                WhatsApp
              </a>
            )}
            {address && (
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="size-4 shrink-0" />
                {address}
              </p>
            )}
            {businessHours && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Clock className="size-4 shrink-0" />
                {businessHours}
              </p>
            )}
          </div>
        )}

        {socialEntries.length > 0 && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">{dict.footer.followUs}</p>
            <div className="flex flex-col gap-2">
              {socialEntries.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                >
                  <ExternalLink className="size-4 shrink-0" />
                  {SOCIAL_LABELS[platform] ?? platform}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t">
        <div className="text-muted-foreground mx-auto max-w-6xl px-4 py-4 text-xs sm:px-6">
          © {new Date().getFullYear()} {agencyName}.{" "}
          <Link href={`/${tenantSlug}/contact`} className="hover:text-foreground underline underline-offset-2">
            {dict.footer.getInTouch}
          </Link>
        </div>
      </div>
    </footer>
  );
}
