"use client";

import { useState, useTransition } from "react";

import { createPublicInquiryAction } from "@/features/leads/actions/public-inquiry.action";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

export type InquiryReference = {
  kind: "package" | "hotel" | "destination" | "activity" | "flight";
  slug: string;
  name: string;
};

type Props = {
  tenantSlug: string;
  reference?: InquiryReference | null;
};

export function InquiryForm({ tenantSlug, reference }: Props) {
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
        company: String(form.get("company") ?? ""),
      });

      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="font-medium">Thanks for reaching out!</p>
        <p className="text-muted-foreground mt-1 text-sm">
          We&apos;ve received your message and will get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {reference && (
        <p className="text-muted-foreground text-sm">
          Regarding: <span className="text-foreground font-medium">{reference.name}</span>
        </p>
      )}

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
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input id="name" name="name" required maxLength={150} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input id="email" name="email" type="email" required disabled={isPending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input id="phone" name="phone" maxLength={40} disabled={isPending} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
          placeholder="Tell us what you're looking for…"
          disabled={isPending}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Sending…" : "Send Inquiry"}
      </Button>
    </form>
  );
}
