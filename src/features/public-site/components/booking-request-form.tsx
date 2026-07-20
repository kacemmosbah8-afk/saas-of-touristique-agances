"use client";

import { useState, useTransition } from "react";

import { createBookingRequestAction } from "@/features/booking-requests/actions/create-booking-request.action";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

export type BookingRequestReference = {
  kind: "package" | "hotel" | "destination" | "activity" | "flight";
  slug: string;
  name: string;
};

type Props = {
  tenantSlug: string;
  reference: BookingRequestReference;
};

export function BookingRequestForm({ tenantSlug, reference }: Props) {
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
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmittedReference(result.data.reference || "received");
    });
  }

  if (submittedReference) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="font-medium">Booking request sent!</p>
        <p className="text-muted-foreground mt-1 text-sm">
          We&apos;ve received your request for <strong>{reference.name}</strong> and will reach out
          shortly to confirm the details.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Requesting: <span className="text-foreground font-medium">{reference.name}</span>
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
            Full name
          </label>
          <Input id="fullName" name="fullName" required maxLength={150} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input id="email" name="email" type="email" required disabled={isPending} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input id="phone" name="phone" maxLength={40} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="whatsapp" className="text-sm font-medium">
            WhatsApp <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input id="whatsapp" name="whatsapp" maxLength={40} disabled={isPending} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="adults" className="text-sm font-medium">
            Adults
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
            Children
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
            Preferred travel date <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input id="preferredDate" name="preferredDate" type="date" disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="returnDate" className="text-sm font-medium">
            Return date <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input id="returnDate" name="returnDate" type="date" disabled={isPending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          placeholder="Anything else we should know?"
          disabled={isPending}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Sending…" : "Send Booking Request"}
      </Button>
    </form>
  );
}
