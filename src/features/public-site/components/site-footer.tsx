import Link from "next/link";
import { Mail, Phone, MessageCircle, MapPin, Clock, ExternalLink } from "lucide-react";

import type { ProfileSettings } from "@/features/settings/schemas/settings.schema";

type Props = {
  tenantSlug: string;
  agencyName: string;
  profile: ProfileSettings;
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
export function SiteFooter({ tenantSlug, agencyName, profile }: Props) {
  const socialEntries = Object.entries(profile.socialLinks ?? {}).filter(
    ([, url]) => url && url.trim().length > 0,
  );
  const hasContactInfo =
    profile.contactEmail || profile.contactPhone || profile.whatsapp || profile.address;

  return (
    <footer className="bg-muted/30 mt-16 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-2">
          <p className="font-semibold">{agencyName}</p>
          {profile.tagline && <p className="text-muted-foreground text-sm">{profile.tagline}</p>}
        </div>

        {hasContactInfo && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Contact</p>
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
            {profile.address && (
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="size-4 shrink-0" />
                {profile.address}
              </p>
            )}
            {profile.businessHours && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Clock className="size-4 shrink-0" />
                {profile.businessHours}
              </p>
            )}
          </div>
        )}

        {socialEntries.length > 0 && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Follow us</p>
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
            Get in touch
          </Link>
        </div>
      </div>
    </footer>
  );
}
