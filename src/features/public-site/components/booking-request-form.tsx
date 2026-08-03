"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createBookingRequestAction } from "@/features/booking-requests/actions/create-booking-request.action";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { interpolate, type Dictionary } from "@/shared/i18n/dictionary";

export type BookingRequestReference = {
  kind: "package" | "hotel" | "destination" | "activity" | "flight";
  slug: string;
  name: string;
};

/** Maps a reference's kind to its public listing route segment — same
 * segments `SiteHeader`'s nav links and the hero-route detection regex use. */
const KIND_TO_SEGMENT: Record<BookingRequestReference["kind"], string> = {
  package: "packages",
  hotel: "hotels",
  destination: "destinations",
  activity: "activities",
  flight: "flights",
};

/** Fields saved to the in-progress draft — everything the visitor types,
 * minus the honeypot (never worth restoring, and re-filling it defeats the
 * point of it being empty). */
const DRAFT_FIELDS = [
  "fullName",
  "email",
  "phone",
  "whatsapp",
  "adults",
  "children",
  "preferredDate",
  "returnDate",
  "notes",
] as const;

type Props = {
  tenantSlug: string;
  reference: BookingRequestReference;
  dict: Dictionary;
  /** Agency's own WhatsApp number, if set — offered as a faster alternative
   * once the request is sent. Never a TravelOS-owned fallback. */
  whatsapp?: string | null;
  /** Agency's own stated hours, if set — used to give a concrete-feeling
   * response window without inventing an SLA the agency never committed to. */
  businessHours?: string | null;
};

export function BookingRequestForm({ tenantSlug, reference, dict, whatsapp, businessHours }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);
  const listingHref = `/${tenantSlug}/${KIND_TO_SEGMENT[reference.kind]}`;
  const itemHref = `${listingHref}/${reference.slug}`;
  const formRef = useRef<HTMLFormElement>(null);
  // Scoped to this exact offer so a draft for one package never bleeds into
  // another. sessionStorage (not localStorage) so it clears itself once the
  // tab closes rather than lingering indefinitely on a shared/kiosk device.
  const draftKey = `travelos:booking-draft:${tenantSlug}:${reference.kind}:${reference.slug}`;
  const todayIso = new Date().toISOString().slice(0, 10);
  // Mirrors the preferredDate input's value so returnDate's `min` can track
  // it live — kept outside DRAFT_FIELDS/handleDraftChange since it's derived
  // UX state, not a value that goes into the submitted form data itself.
  const [preferredDateValue, setPreferredDateValue] = useState("");

  // Refills the form from a saved draft — e.g. the visitor followed "Back to
  // [offer]" to double-check something, or just hit the browser back button,
  // and returned here. Without this the whole form silently resets, so any
  // partly-typed request has to be retyped from scratch (`travelos-projects`
  // feedback, 2026-07-29). Runs post-mount only, via direct DOM writes
  // rather than defaultValue, so there's no SSR/client hydration mismatch.
  useEffect(() => {
    const raw = sessionStorage.getItem(draftKey);
    if (!raw || !formRef.current) return;
    let draft: Record<string, string>;
    try {
      draft = JSON.parse(raw);
    } catch {
      return;
    }
    for (const field of DRAFT_FIELDS) {
      const el = formRef.current.elements.namedItem(field);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (draft[field] !== undefined) el.value = draft[field];
      }
    }
    // The direct DOM write above bypasses React state, so without this,
    // returnDate's `min` would stay stuck at today even after a later
    // preferredDate was just restored.
    if (draft.preferredDate) setPreferredDateValue(draft.preferredDate);
  }, [draftKey]);

  function handleDraftChange(e: React.FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    const draft: Record<string, string> = {};
    for (const field of DRAFT_FIELDS) draft[field] = String(form.get(field) ?? "");
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createBookingRequestAction(tenantSlug, {
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        whatsapp: String(form.get("whatsapp") ?? ""),
        adults: Number(form.get("adults") ?? 1),
        children: Number(form.get("children") ?? 0),
        preferredDate: String(form.get("preferredDate") ?? ""),
        returnDate: String(form.get("returnDate") ?? ""),
        productType: reference.kind.toUpperCase() as
          | "PACKAGE"
          | "HOTEL"
          | "DESTINATION"
          | "ACTIVITY"
          | "FLIGHT",
        productSlug: reference.slug,
        notes: String(form.get("notes") ?? ""),
        company: String(form.get("hp_check") ?? ""),
      });

      if (!result.ok) {
        setError(result.error ?? dict.booking.genericError);
        return;
      }
      sessionStorage.removeItem(draftKey);
      setSubmittedReference(result.data.reference || "received");
    });
  }

  if (submittedReference) {
    const whatsappHref = whatsapp
      ? `https://wa.me/${whatsapp.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(
          `${reference.name} — ${submittedReference}`,
        )}`
      : null;

    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="font-medium">{dict.booking.successTitle}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {interpolate(dict.booking.successBody, { name: reference.name })}
        </p>
        <p className="mt-3 text-sm">
          {dict.booking.referenceLabel}{" "}
          <span className="font-mono font-medium">{submittedReference}</span>
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {businessHours
            ? `${dict.booking.responseWithHours} ${businessHours}.`
            : dict.booking.responseGeneric}
        </p>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1ebe57]"
          >
            {dict.booking.whatsappFaster}
          </a>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link href={itemHref}>
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
              {interpolate(dict.booking.backToItem, { name: reference.name })}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={listingHref}>{dict.booking.browseMore}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/${tenantSlug}`}>{dict.nav.home}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleDraftChange} className="space-y-4">
      <Link
        href={itemHref}
        className="hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {interpolate(dict.booking.backToItem, { name: reference.name })}
      </Link>

      <p className="text-muted-foreground text-sm">
        {dict.booking.requesting} <span className="text-foreground font-medium">{reference.name}</span>
      </p>

      {/* Honeypot — `display: none`, which real browser/extension autofill
          reliably skips. An earlier version used zero-size/opacity clipping
          instead specifically so bots that skip `display:none` couldn't
          detect it either — but that same trick let real autofill /
          password-manager extensions fill it too, silently discarding real
          visitors' submissions (the field being fillable at all, not its
          name, is what triggered it). Reliability for real visitors matters
          more here than defeating that narrower class of bot. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this field blank
          <input name="hp_check" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-sm font-medium">
            {dict.booking.fullName}
          </label>
          <Input id="fullName" name="fullName" required maxLength={150} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            {dict.booking.email} <span className="text-muted-foreground font-normal">{dict.booking.optionalTag}</span>
          </label>
          <Input id="email" name="email" type="email" disabled={isPending} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            {dict.booking.phone}
          </label>
          <Input id="phone" name="phone" required maxLength={40} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="whatsapp" className="text-sm font-medium">
            {dict.booking.whatsapp}
          </label>
          <Input id="whatsapp" name="whatsapp" required maxLength={40} disabled={isPending} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="adults" className="text-sm font-medium">
            {dict.booking.adults}
          </label>
          <Input
            id="adults"
            name="adults"
            type="number"
            min={1}
            max={50}
            defaultValue={1}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="children" className="text-sm font-medium">
            {dict.booking.children}
          </label>
          <Input
            id="children"
            name="children"
            type="number"
            min={0}
            max={50}
            defaultValue={0}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="preferredDate" className="text-sm font-medium">
            {dict.booking.preferredDate} <span className="text-muted-foreground font-normal">{dict.booking.optionalTag}</span>
          </label>
          <Input
            id="preferredDate"
            name="preferredDate"
            type="date"
            min={todayIso}
            onChange={(e) => setPreferredDateValue(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="returnDate" className="text-sm font-medium">
            {dict.booking.returnDate} <span className="text-muted-foreground font-normal">{dict.booking.optionalTag}</span>
          </label>
          <Input
            id="returnDate"
            name="returnDate"
            type="date"
            min={preferredDateValue || todayIso}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          {dict.booking.notes} <span className="text-muted-foreground font-normal">{dict.booking.optionalTag}</span>
        </label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          placeholder={dict.booking.notesPlaceholder}
          disabled={isPending}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? dict.booking.sending : dict.booking.sendButton}
      </Button>
      <p className="text-muted-foreground text-xs">{dict.booking.noPaymentFormNote}</p>
    </form>
  );
}
