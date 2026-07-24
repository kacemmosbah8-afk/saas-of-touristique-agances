"use client";

import { useState, useTransition } from "react";

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
        company: String(form.get("company") ?? ""),
      });

      if (!result.ok) {
        setError(result.error ?? dict.booking.genericError);
        return;
      }
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
            className="text-primary mt-4 inline-block text-sm font-medium hover:underline"
          >
            {dict.booking.whatsappFaster}
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {dict.booking.requesting} <span className="text-foreground font-medium">{reference.name}</span>
      </p>

      {/* Honeypot — hidden from real visitors via zero-size clipping, not
          `type="hidden"`, so form-filling bots that read layout still find
          and fill it. */}
      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
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
            {dict.booking.email}
          </label>
          <Input id="email" name="email" type="email" required disabled={isPending} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            {dict.booking.phone} <span className="text-muted-foreground font-normal">{dict.booking.optionalTag}</span>
          </label>
          <Input id="phone" name="phone" maxLength={40} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="whatsapp" className="text-sm font-medium">
            {dict.booking.whatsapp} <span className="text-muted-foreground font-normal">{dict.booking.optionalTag}</span>
          </label>
          <Input id="whatsapp" name="whatsapp" maxLength={40} disabled={isPending} />
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
          <Input id="preferredDate" name="preferredDate" type="date" disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="returnDate" className="text-sm font-medium">
            {dict.booking.returnDate} <span className="text-muted-foreground font-normal">{dict.booking.optionalTag}</span>
          </label>
          <Input id="returnDate" name="returnDate" type="date" disabled={isPending} />
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
