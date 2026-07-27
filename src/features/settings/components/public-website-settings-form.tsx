"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ProfileSettings } from "@/features/settings/schemas/settings.schema";
import { updateModuleSettingsAction } from "@/features/settings/actions/settings.action";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import { Textarea } from "@/shared/components/ui/textarea";
import { ListEditor } from "@/shared/components/data/list-editor";
import type { Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  tenantSlug: string;
  profile: ProfileSettings;
  canEdit: boolean;
  locale: Locale;
};

const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X / Twitter" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
] as const;

export function PublicWebsiteSettingsForm({ tenantId, tenantSlug, profile, canEdit, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const dict = getAdminDictionary(locale).settings;
  const common = getAdminDictionary(locale).common;

  const [tagline, setTagline] = useState(profile.tagline ?? "");
  const [description, setDescription] = useState(profile.description ?? "");
  const [taglineFr, setTaglineFr] = useState(profile.taglineFr ?? "");
  const [descriptionFr, setDescriptionFr] = useState(profile.descriptionFr ?? "");
  const [frenchEnabled, setFrenchEnabled] = useState(profile.frenchEnabled ?? false);
  const [contactEmail, setContactEmail] = useState(profile.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(profile.contactPhone ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [addressFr, setAddressFr] = useState(profile.addressFr ?? "");
  const [businessHours, setBusinessHours] = useState(profile.businessHours ?? "");
  const [businessHoursFr, setBusinessHoursFr] = useState(profile.businessHoursFr ?? "");
  const [socialLinks, setSocialLinks] = useState(profile.socialLinks);
  const [testimonials, setTestimonials] = useState(profile.testimonials ?? []);
  const [testimonialsFr, setTestimonialsFr] = useState(profile.testimonialsFr ?? []);

  function currentSettings(overrides: Partial<ProfileSettings>): ProfileSettings {
    return {
      tagline,
      description,
      taglineFr,
      descriptionFr,
      frenchEnabled,
      contactEmail,
      contactPhone,
      whatsapp,
      address,
      addressFr,
      businessHours,
      businessHoursFr,
      socialLinks,
      testimonials,
      testimonialsFr,
      ...overrides,
    };
  }

  function save() {
    startTransition(async () => {
      const result = await updateModuleSettingsAction(tenantId, {
        module: "profile",
        settings: currentSettings({}),
      });
      if (!result.ok) {
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      toast.success(common.changesSaved);
      router.refresh();
    });
  }

  // Renders the same relative path server and client on first paint (no
  // hydration mismatch), then upgrades to the full absolute URL once
  // mounted — `window.location.origin` doesn't exist during SSR, so
  // branching on `typeof window` here would make the server and the
  // client render different text on the very first pass.
  const [publicUrl, setPublicUrl] = useState(`/${tenantSlug}`);
  useEffect(() => {
    setPublicUrl(`${window.location.origin}/${tenantSlug}`);
  }, [tenantSlug]);

  return (
    <div className="space-y-8">
      <div className="bg-muted/40 rounded-lg border p-4 text-sm">
        <p className="font-medium">{dict.yourPublicWebsite}</p>
        <p className="text-muted-foreground mt-1">
          {dict.publicWebsiteIntro1}{" "}
          <a href={`/${tenantSlug}`} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
            {publicUrl}
          </a>{" "}
          {dict.publicWebsiteIntro2}
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{dict.aboutAgency}</h3>
          {canEdit && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={save}>
              {dict.savePublicSettings}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.tagline}</label>
            <Input
              value={tagline}
              maxLength={200}
              placeholder={dict.taglinePlaceholder}
              onChange={(e) => setTagline(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.description}</label>
            <Textarea
              value={description}
              maxLength={4000}
              rows={4}
              placeholder={dict.descriptionPlaceholder}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="frenchEnabled"
              checked={frenchEnabled}
              onCheckedChange={(checked) => setFrenchEnabled(checked === true)}
              disabled={!canEdit}
            />
            <label htmlFor="frenchEnabled" className="text-sm font-medium">
              {dict.enableFrench}
            </label>
          </div>
          {frenchEnabled && (
            <div className="border-border/70 space-y-4 rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground text-xs">{dict.frenchNote}</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{dict.taglineFr}</label>
                <Input
                  value={taglineFr}
                  maxLength={200}
                  placeholder={dict.taglineFrPlaceholder}
                  onChange={(e) => setTaglineFr(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{dict.descriptionFr}</label>
                <Textarea
                  value={descriptionFr}
                  maxLength={4000}
                  rows={4}
                  placeholder={dict.descriptionFrPlaceholder}
                  onChange={(e) => setDescriptionFr(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{dict.contactInfo}</h3>
          {canEdit && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={save}>
              {dict.savePublicSettings}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{dict.contactInfoIntro}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.contactEmail}</label>
            <Input
              type="email"
              value={contactEmail}
              placeholder="hello@youragency.com"
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.contactPhone}</label>
            <Input
              value={contactPhone}
              placeholder="+213 555 000 000"
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.whatsappNumber}</label>
            <Input
              value={whatsapp}
              placeholder="+213 555 000 000"
              onChange={(e) => setWhatsapp(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.businessHoursAr}</label>
            <Input
              value={businessHours}
              dir="rtl"
              placeholder="الإثنين–الجمعة 9 ص–6 م"
              onChange={(e) => setBusinessHours(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.businessHoursFr}</label>
            <Input
              value={businessHoursFr}
              placeholder="Lun–Ven 9h–18h"
              onChange={(e) => setBusinessHoursFr(e.target.value)}
              disabled={!canEdit}
            />
            <p className="text-muted-foreground text-xs">{dict.fallsBackToArabic}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.addressAr}</label>
            <Input
              value={address}
              dir="rtl"
              placeholder="١٢٣ شارع رئيسي، مدينتك"
              onChange={(e) => setAddress(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{dict.addressFr}</label>
            <Input
              value={addressFr}
              placeholder="123 Rue Principale, Votre Ville"
              onChange={(e) => setAddressFr(e.target.value)}
              disabled={!canEdit}
            />
            <p className="text-muted-foreground text-xs">{dict.fallsBackToArabic}</p>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{dict.socialLinks}</h3>
          {canEdit && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={save}>
              {dict.savePublicSettings}
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium">{label}</label>
              <Input
                value={socialLinks[key] ?? ""}
                placeholder={`https://${key}.com/youragency`}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{dict.testimonials}</h3>
          {canEdit && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={save}>
              {dict.savePublicSettings}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{dict.testimonialsIntro}</p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{dict.testimonialsAr}</label>
          <ListEditor
            value={testimonials}
            onChange={setTestimonials}
            placeholder='"رحلة رائعة، أنصح بها بشدة!" — سارة م.'
            maxItems={12}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{dict.testimonialsFr}</label>
          <ListEditor
            value={testimonialsFr}
            onChange={setTestimonialsFr}
            placeholder='"Voyage incroyable, je recommande !" — Sarah M.'
            maxItems={12}
            disabled={!canEdit}
          />
          <p className="text-muted-foreground text-xs">{dict.testimonialsFrNote}</p>
        </div>
      </section>
    </div>
  );
}
