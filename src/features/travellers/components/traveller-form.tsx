"use client";

import { useId, useState } from "react";

import {
  TRAVELLER_TYPES,
  TRAVELLER_TYPE_LABELS,
  GENDERS,
  GENDER_LABELS,
  VISA_STATUSES,
  VISA_STATUS_LABELS,
  travellerFormSchema,
  type TravellerFormInput,
} from "@/features/travellers/schemas/traveller.schema";
import type { TravellerView } from "@/features/travellers/queries/booking-travellers.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { toast } from "sonner";

function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export const EMPTY_TRAVELLER: TravellerFormInput = {
  type: "ADULT",
  firstName: "",
  lastName: "",
  gender: "UNSPECIFIED",
  dateOfBirth: "",
  nationality: "",
  passportNumber: "",
  passportIssuingCountry: "",
  passportIssueDate: "",
  passportExpiry: "",
  visaStatus: "UNKNOWN",
  visaNotes: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  specialRequests: "",
  medicalNotes: "",
  frequentFlyerAirline: "",
  frequentFlyerNumber: "",
};

export function travellerToInput(t: TravellerView): TravellerFormInput {
  return {
    type: t.type,
    firstName: t.firstName,
    lastName: t.lastName,
    gender: t.gender,
    dateOfBirth: toDateInput(t.dateOfBirth),
    nationality: t.nationality ?? "",
    passportNumber: t.passportNumber ?? "",
    passportIssuingCountry: t.passportIssuingCountry ?? "",
    passportIssueDate: toDateInput(t.passportIssueDate),
    passportExpiry: toDateInput(t.passportExpiry),
    visaStatus: t.visaStatus,
    visaNotes: t.visaNotes ?? "",
    emergencyContactName: t.emergencyContactName ?? "",
    emergencyContactPhone: t.emergencyContactPhone ?? "",
    emergencyContactRelation: t.emergencyContactRelation ?? "",
    specialRequests: t.specialRequests ?? "",
    medicalNotes: t.medicalNotes ?? "",
    frequentFlyerAirline: t.frequentFlyerAirline ?? "",
    frequentFlyerNumber: t.frequentFlyerNumber ?? "",
  };
}

type Props = {
  initial: TravellerFormInput;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: TravellerFormInput) => void;
  onCancel: () => void;
};

/** Controlled draft form — the parent owns the server call. Field-level
 * validation happens against the shared Zod schema on submit. */
export function TravellerForm({ initial, submitLabel, busy, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<TravellerFormInput>(initial);
  // The form renders once per traveller being edited, so field ids must be
  // unique per instance for the label associations to stay correct.
  const uid = useId();

  function set<K extends keyof TravellerFormInput>(key: K, value: TravellerFormInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function submit() {
    const parsed = travellerFormSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid traveller.");
      return;
    }
    onSubmit(parsed.data);
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-first-name`} className="text-muted-foreground mb-1 block text-xs">
            First name
          </label>
          <Input
            id={`${uid}-first-name`}
            value={draft.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-last-name`} className="text-muted-foreground mb-1 block text-xs">
            Last name
          </label>
          <Input
            id={`${uid}-last-name`}
            value={draft.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-type`} className="text-muted-foreground mb-1 block text-xs">
              Type
            </label>
            <Select
              value={draft.type}
              onValueChange={(v) => set("type", v as TravellerFormInput["type"])}
            >
              <SelectTrigger id={`${uid}-type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAVELLER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRAVELLER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor={`${uid}-gender`} className="text-muted-foreground mb-1 block text-xs">
              Gender
            </label>
            <Select
              value={draft.gender}
              onValueChange={(v) => set("gender", v as TravellerFormInput["gender"])}
            >
              <SelectTrigger id={`${uid}-gender`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GENDER_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-dob`} className="text-muted-foreground mb-1 block text-xs">
              Date of birth
            </label>
            <Input
              id={`${uid}-dob`}
              type="date"
              value={draft.dateOfBirth ?? ""}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor={`${uid}-nationality`}
              className="text-muted-foreground mb-1 block text-xs"
            >
              Nationality
            </label>
            <Input
              id={`${uid}-nationality`}
              placeholder="e.g. Moroccan"
              value={draft.nationality ?? ""}
              onChange={(e) => set("nationality", e.target.value)}
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Passport
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${uid}-passport-number`}
                className="text-muted-foreground mb-1 block text-xs"
              >
                Passport number
              </label>
              <Input
                id={`${uid}-passport-number`}
                value={draft.passportNumber ?? ""}
                onChange={(e) => set("passportNumber", e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor={`${uid}-passport-country`}
                className="text-muted-foreground mb-1 block text-xs"
              >
                Issuing country
              </label>
              <Input
                id={`${uid}-passport-country`}
                value={draft.passportIssuingCountry ?? ""}
                onChange={(e) => set("passportIssuingCountry", e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor={`${uid}-passport-issued`}
                className="text-muted-foreground mb-1 block text-xs"
              >
                Issue date
              </label>
              <Input
                id={`${uid}-passport-issued`}
                type="date"
                value={draft.passportIssueDate ?? ""}
                onChange={(e) => set("passportIssueDate", e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor={`${uid}-passport-expiry`}
                className="text-muted-foreground mb-1 block text-xs"
              >
                Expiry date
              </label>
              <Input
                id={`${uid}-passport-expiry`}
                type="date"
                value={draft.passportExpiry ?? ""}
                onChange={(e) => set("passportExpiry", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:col-span-2">
          <div>
            <label htmlFor={`${uid}-visa-status`} className="text-muted-foreground mb-1 block text-xs">
              Visa status
            </label>
            <Select
              value={draft.visaStatus}
              onValueChange={(v) => set("visaStatus", v as TravellerFormInput["visaStatus"])}
            >
              <SelectTrigger id={`${uid}-visa-status`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISA_STATUSES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {VISA_STATUS_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor={`${uid}-visa-notes`} className="text-muted-foreground mb-1 block text-xs">
              Visa notes
            </label>
            <Input
              id={`${uid}-visa-notes`}
              value={draft.visaNotes ?? ""}
              onChange={(e) => set("visaNotes", e.target.value)}
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Emergency contact
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="Name"
              value={draft.emergencyContactName ?? ""}
              onChange={(e) => set("emergencyContactName", e.target.value)}
            />
            <Input
              placeholder="Phone"
              value={draft.emergencyContactPhone ?? ""}
              onChange={(e) => set("emergencyContactPhone", e.target.value)}
            />
            <Input
              placeholder="Relationship"
              value={draft.emergencyContactRelation ?? ""}
              onChange={(e) => set("emergencyContactRelation", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:col-span-2">
          <Input
            aria-label="Frequent flyer airline"
            placeholder="Frequent flyer airline"
            value={draft.frequentFlyerAirline ?? ""}
            onChange={(e) => set("frequentFlyerAirline", e.target.value)}
          />
          <Input
            aria-label="Frequent flyer number"
            placeholder="Frequent flyer number"
            value={draft.frequentFlyerNumber ?? ""}
            onChange={(e) => set("frequentFlyerNumber", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-requests`} className="text-muted-foreground mb-1 block text-xs">
            Special requests
          </label>
          <Textarea
            id={`${uid}-requests`}
            className="min-h-[60px]"
            placeholder="Dietary, seating, accessibility…"
            value={draft.specialRequests ?? ""}
            onChange={(e) => set("specialRequests", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-medical`} className="text-muted-foreground mb-1 block text-xs">
            Medical notes
          </label>
          <Textarea
            id={`${uid}-medical`}
            className="min-h-[60px]"
            value={draft.medicalNotes ?? ""}
            onChange={(e) => set("medicalNotes", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={submit}>
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
