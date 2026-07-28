"use client";

import { useState, useTransition } from "react";

import { createPublicInquiryAction } from "@/features/leads/actions/public-inquiry.action";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import type { Dictionary } from "@/shared/i18n/dictionary";

export type InquiryReference = {
  kind: "package" | "hotel" | "destination" | "activity" | "flight";
  slug: string;
  name: string;
};

type Props = {
  tenantSlug: string;
  reference?: InquiryReference | null;
  dict: Dictionary;
  whatsapp?: string | null;
  businessHours?: string | null;
};

export function InquiryForm({ tenantSlug, reference, dict, whatsapp, businessHours }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createPublicInquiryAction(tenantSlug, {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        message: String(form.get("message") ?? ""),
        packageSlug: reference?.kind === "package" ? reference.slug : "",
        hotelSlug: reference?.kind === "hotel" ? reference.slug : "",
        destinationSlug: reference?.kind === "destination" ? reference.slug : "",
        activitySlug: reference?.kind === "activity" ? reference.slug : "",
        flightSlug: reference?.kind === "flight" ? reference.slug : "",
        company: String(form.get("hp_check") ?? ""),
      });

      if (!result.ok) {
        setError(result.error ?? dict.contact.genericError);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    const whatsappHref = whatsapp
      ? `https://wa.me/${whatsapp.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(
          reference?.name ?? "",
        )}`
      : null;

    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="font-medium">{dict.contact.successTitle}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {dict.contact.successBody}{" "}
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
      {reference && (
        <p className="text-muted-foreground text-sm">
          {dict.contact.regarding} <span className="text-foreground font-medium">{reference.name}</span>
        </p>
      )}

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
          <label htmlFor="name" className="text-sm font-medium">
            {dict.contact.name}
          </label>
          <Input id="name" name="name" required maxLength={150} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            {dict.contact.email}
          </label>
          <Input id="email" name="email" type="email" required disabled={isPending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          {dict.contact.phone} <span className="text-muted-foreground font-normal">{dict.booking.optionalTag}</span>
        </label>
        <Input id="phone" name="phone" maxLength={40} disabled={isPending} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium">
          {dict.contact.message}
        </label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
          placeholder={dict.contact.messagePlaceholder}
          disabled={isPending}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? dict.contact.sending : dict.contact.sendButton}
      </Button>
    </form>
  );
}
