"use client";

import { useState, useTransition } from "react";

import { createPlanTripAction } from "@/features/leads/actions/plan-trip.action";
import { TRAVEL_STYLES } from "@/features/leads/schemas/plan-trip.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { Dictionary } from "@/shared/i18n/dictionary";

type Props = {
  tenantSlug: string;
  dict: Dictionary;
};

const STYLE_LABEL_KEY: Record<(typeof TRAVEL_STYLES)[number], keyof Dictionary["planTrip"]> = {
  LUXURY: "styleLuxury",
  FAMILY: "styleFamily",
  ADVENTURE: "styleAdventure",
  HONEYMOON: "styleHoneymoon",
  BUDGET: "styleBudget",
  CULTURAL: "styleCultural",
};

export function PlanTripForm({ tenantSlug, dict }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [travelStyle, setTravelStyle] = useState<string>("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createPlanTripAction(tenantSlug, {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        destination: String(form.get("destination") ?? ""),
        budget: Number(form.get("budget") ?? 0),
        currency: "USD",
        travelPeriod: String(form.get("travelPeriod") ?? ""),
        travelers: Number(form.get("travelers") ?? 1),
        travelStyle: travelStyle as (typeof TRAVEL_STYLES)[number],
        company: String(form.get("company") ?? ""),
      });

      if (!result.ok) {
        setError(result.error ?? dict.planTrip.genericError);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="font-medium">{dict.planTrip.successTitle}</p>
        <p className="text-muted-foreground mt-1 text-sm">{dict.planTrip.successBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot */}
      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="destination" className="text-sm font-medium">
          {dict.planTrip.destinationLabel}
        </label>
        <Input
          id="destination"
          name="destination"
          required
          maxLength={200}
          placeholder={dict.planTrip.destinationPlaceholder}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="budget" className="text-sm font-medium">
            {dict.planTrip.budgetLabel}
          </label>
          <Input id="budget" name="budget" type="number" min={1} required disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="travelers" className="text-sm font-medium">
            {dict.planTrip.travelersLabel}
          </label>
          <Input
            id="travelers"
            name="travelers"
            type="number"
            min={1}
            max={50}
            defaultValue={2}
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="travelPeriod" className="text-sm font-medium">
            {dict.planTrip.periodLabel}
          </label>
          <Input
            id="travelPeriod"
            name="travelPeriod"
            required
            maxLength={100}
            placeholder={dict.planTrip.periodPlaceholder}
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{dict.planTrip.styleLabel}</label>
          <Select value={travelStyle} onValueChange={setTravelStyle} disabled={isPending}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRAVEL_STYLES.map((style) => (
                <SelectItem key={style} value={style}>
                  {dict.planTrip[STYLE_LABEL_KEY[style]]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            {dict.planTrip.nameLabel}
          </label>
          <Input id="name" name="name" required maxLength={150} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            {dict.planTrip.emailLabel}
          </label>
          <Input id="email" name="email" type="email" required disabled={isPending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          {dict.planTrip.phoneLabel}
        </label>
        <Input id="phone" name="phone" maxLength={40} disabled={isPending} />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending || !travelStyle} className="w-full sm:w-auto">
        {isPending ? dict.planTrip.sending : dict.planTrip.submitButton}
      </Button>
    </form>
  );
}
