"use client";

import { useState } from "react";

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
          <label className="text-muted-foreground mb-1 block text-xs">First name</label>
          <Input value={draft.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Last name</label>
          <Input value={draft.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">Type</label>
            <Select
              value={draft.type}
              onValueChange={(v) => set("type", v as TravellerFormInput["type"])}
            >
              <SelectTrigger className="w-full">
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
            <label className="text-muted-foreground mb-1 block text-xs">Gender</label>
            <Select
              value={draft.gender}
              onValueChange={(v) => set("gender", v as TravellerFormInput["gender"])}
            >
              <SelectTrigger className="w-full">
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">Date of birth</label>
            <Input
              type="date"
              value={draft.dateOfBirth ?? ""}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">Nationality</label>
            <Input
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
              <label className="text-muted-foreground mb-1 block text-xs">Passport number</label>
              <Input
                value={draft.passportNumber ?? ""}
                onChange={(e) => set("passportNumber", e.target.value)}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Issuing country</label>
              <Input
                value={draft.passportIssuingCountry ?? ""}
                onChange={(e) => set("passportIssuingCountry", e.target.value)}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Issue date</label>
              <Input
                type="date"
                value={draft.passportIssueDate ?? ""}
                onChange={(e) => set("passportIssueDate", e.target.value)}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Expiry date</label>
              <Input
                type="date"
                value={draft.passportExpiry ?? ""}
                onChange={(e) => set("passportExpiry", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">Visa status</label>
            <Select
              value={draft.visaStatus}
              onValueChange={(v) => set("visaStatus", v as TravellerFormInput["visaStatus"])}
            >
              <SelectTrigger className="w-full">
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
            <label className="text-muted-foreground mb-1 block text-xs">Visa notes</label>
            <Input value={draft.visaNotes ?? ""} onChange={(e) => set("visaNotes", e.target.value)} />
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

        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <Input
            placeholder="Frequent flyer airline"
            value={draft.frequentFlyerAirline ?? ""}
            onChange={(e) => set("frequentFlyerAirline", e.target.value)}
          />
          <Input
            placeholder="Frequent flyer number"
            value={draft.frequentFlyerNumber ?? ""}
            onChange={(e) => set("frequentFlyerNumber", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-muted-foreground mb-1 block text-xs">Special requests</label>
          <Textarea
            className="min-h-[60px]"
            placeholder="Dietary, seating, accessibility…"
            value={draft.specialRequests ?? ""}
            onChange={(e) => set("specialRequests", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-muted-foreground mb-1 block text-xs">Medical notes</label>
          <Textarea
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
