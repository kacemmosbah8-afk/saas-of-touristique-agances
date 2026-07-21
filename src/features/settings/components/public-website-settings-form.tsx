"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ProfileSettings } from "@/features/settings/schemas/settings.schema";
import { updateModuleSettingsAction } from "@/features/settings/actions/settings.action";
import { useImageUpload } from "@/shared/lib/storage/use-image-upload";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";

type Props = {
  tenantId: string;
  tenantSlug: string;
  profile: ProfileSettings;
  canEdit: boolean;
};

const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X / Twitter" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
] as const;

export function PublicWebsiteSettingsForm({ tenantId, tenantSlug, profile, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [tagline, setTagline] = useState(profile.tagline ?? "");
  const [description, setDescription] = useState(profile.description ?? "");
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(profile.primaryColor ?? "");
  const [contactEmail, setContactEmail] = useState(profile.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(profile.contactPhone ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [businessHours, setBusinessHours] = useState(profile.businessHours ?? "");
  const [socialLinks, setSocialLinks] = useState(profile.socialLinks);

  const { startUpload, isUploading } = useImageUpload("tenant-logo", {
    onUploadComplete: (files) => {
      const file = files[0];
      if (!file) return;
      setLogoUrl(file.url);
      startTransition(async () => {
        const result = await updateModuleSettingsAction(tenantId, {
          module: "profile",
          settings: currentSettings({ logoUrl: file.url }),
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Logo updated.");
        router.refresh();
      });
    },
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  function currentSettings(overrides: Partial<ProfileSettings>): ProfileSettings {
    return {
      tagline,
      description,
      logoUrl,
      primaryColor,
      contactEmail,
      contactPhone,
      whatsapp,
      address,
      businessHours,
      socialLinks,
      ...overrides,
    };
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startUpload([file]);
  }

  function handleLogoDragOver(e: React.DragEvent) {
    if (!canEdit || isUploading) return;
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleLogoDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleLogoDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (!canEdit || isUploading) return;
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) startUpload([file]);
  }

  function handleRemoveLogo() {
    setLogoUrl("");
    startTransition(async () => {
      const result = await updateModuleSettingsAction(tenantId, {
        module: "profile",
        settings: currentSettings({ logoUrl: "" }),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Logo removed.");
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      const result = await updateModuleSettingsAction(tenantId, {
        module: "profile",
        settings: currentSettings({}),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("Public website settings saved.");
      router.refresh();
    });
  }

  const isLoading = isUploading || isPending;
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/${tenantSlug}` : `/${tenantSlug}`;

  return (
    <div className="space-y-8">
      <div className="bg-muted/40 rounded-lg border p-4 text-sm">
        <p className="font-medium">Your public website</p>
        <p className="text-muted-foreground mt-1">
          Anyone can visit{" "}
          <a href={`/${tenantSlug}`} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
            {publicUrl}
          </a>{" "}
          without signing in. Everything below controls what they see — nothing on the public
          site is hardcoded, so an empty field here simply doesn&apos;t appear there.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Logo</h3>
        </div>
        <div className="flex items-center gap-4">
          <div
            onDragOver={handleLogoDragOver}
            onDragLeave={handleLogoDragLeave}
            onDrop={handleLogoDrop}
            onClick={() => canEdit && inputRef.current?.click()}
            className={cn(
              "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors",
              canEdit && "cursor-pointer",
              isDragOver ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt="Agency logo" fill className="object-contain p-2" sizes="80px" />
            ) : (
              <ImagePlus className="text-muted-foreground/60 size-6" />
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="mr-1.5 size-4" />
                {logoUrl ? "Replace" : "Upload"}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={isLoading}
                  onClick={handleRemoveLogo}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleLogoChange}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">About the Agency</h3>
          {canEdit && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={save}>
              Save
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tagline</label>
            <Input
              value={tagline}
              maxLength={200}
              placeholder="e.g. Your journey, our passion"
              onChange={(e) => setTagline(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              maxLength={4000}
              rows={4}
              placeholder="Tell visitors who you are and what you offer."
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Brand color</label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                className="h-9 w-14 p-1"
                value={primaryColor || "#0ea5e9"}
                onChange={(e) => setPrimaryColor(e.target.value)}
                disabled={!canEdit}
              />
              <Input
                value={primaryColor}
                placeholder="#0ea5e9"
                onChange={(e) => setPrimaryColor(e.target.value)}
                disabled={!canEdit}
                className="max-w-40"
              />
            </div>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Contact Information</h3>
          {canEdit && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={save}>
              Save
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Shown on the public site and used on inquiry/booking confirmations. Leave a field blank
          to hide it — nothing here defaults to TravelOS&apos;s own contact details.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contact email</label>
            <Input
              type="email"
              value={contactEmail}
              placeholder="hello@youragency.com"
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contact phone</label>
            <Input
              value={contactPhone}
              placeholder="+1 555 000 0000"
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">WhatsApp number</label>
            <Input
              value={whatsapp}
              placeholder="+1 555 000 0000"
              onChange={(e) => setWhatsapp(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Business hours</label>
            <Input
              value={businessHours}
              placeholder="Mon–Fri 9am–6pm"
              onChange={(e) => setBusinessHours(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              value={address}
              placeholder="123 Main St, Your City"
              onChange={(e) => setAddress(e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Social Links</h3>
          {canEdit && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={save}>
              Save
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
    </div>
  );
}
