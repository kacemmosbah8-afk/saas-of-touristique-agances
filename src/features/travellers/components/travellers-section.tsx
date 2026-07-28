"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Star, Trash2 } from "lucide-react";

import {
  addTravellerAction,
  updateTravellerAction,
  removeTravellerAction,
  setPrimaryTravellerAction,
} from "@/features/travellers/actions/traveller.action";
import type { TravellerView } from "@/features/travellers/queries/booking-travellers.query";
import type { DocumentSummary } from "@/features/documents/queries/list-documents.query";
import {
  TRAVELLER_TYPE_LABELS,
  VISA_STATUS_LABELS,
  type TravellerFormInput,
} from "@/features/travellers/schemas/traveller.schema";
import {
  PASSPORT_CHECK_LABELS,
  isPassportProblem,
  isPassportWarning,
} from "@/features/travellers/lib/passport-validation";
import {
  TravellerForm,
  EMPTY_TRAVELLER,
  travellerToInput,
} from "@/features/travellers/components/traveller-form";
import { TravellerDocuments } from "@/features/travellers/components/traveller-documents";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type Props = {
  tenantId: string;
  bookingId: string;
  travellers: TravellerView[];
  /** Documents with ownerType "traveller", keyed by traveller id. */
  documentsByTraveller: Record<string, DocumentSummary[]>;
  editable: boolean;
};

export function TravellersSection({
  tenantId,
  bookingId,
  travellers,
  documentsByTraveller,
  editable,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function save(values: TravellerFormInput) {
    startTransition(async () => {
      const result = editingId
        ? await updateTravellerAction(tenantId, bookingId, editingId, values)
        : await addTravellerAction(tenantId, bookingId, values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "Traveller updated." : "Traveller added.");
      setAdding(false);
      setEditingId(null);
      router.refresh();
    });
  }

  function remove(travellerId: string) {
    startTransition(async () => {
      const result = await removeTravellerAction(tenantId, bookingId, travellerId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Traveller removed.");
      router.refresh();
    });
  }

  function setPrimary(travellerId: string) {
    startTransition(async () => {
      const result = await setPrimaryTravellerAction(tenantId, bookingId, travellerId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Primary traveller updated.");
      router.refresh();
    });
  }

  const editingTraveller = editingId ? travellers.find((t) => t.id === editingId) : undefined;

  return (
    <div className="space-y-3">
      {travellers.length === 0 && !adding && (
        <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
          No travellers on this booking yet.
        </p>
      )}

      {travellers.length > 0 && (
        <ul className="space-y-2">
          {travellers.map((t) => {
            const expanded = expandedId === t.id;
            const problem = isPassportProblem(t.passportCheck);
            const warning = isPassportWarning(t.passportCheck);
            return (
              <li key={t.id} className="rounded-lg border">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setExpandedId(expanded ? null : t.id)}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {t.firstName} {t.lastName}
                        {t.isPrimary && (
                          <Star
                            className="size-3.5 fill-amber-400 text-amber-400"
                            aria-label="Primary traveller"
                          />
                        )}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {TRAVELLER_TYPE_LABELS[t.type]}
                        {t.nationality ? ` · ${t.nationality}` : ""}
                        {` · Visa: ${VISA_STATUS_LABELS[t.visaStatus]}`}
                      </span>
                    </span>
                    {(problem || warning) && (
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          problem
                            ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                        )}
                      >
                        <AlertTriangle className="size-3" />
                        {PASSPORT_CHECK_LABELS[t.passportCheck]}
                      </span>
                    )}
                    {expanded ? (
                      <ChevronUp className="text-muted-foreground size-4 shrink-0" />
                    ) : (
                      <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                    )}
                  </button>

                  {editable && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      {!t.isPrimary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          disabled={isPending}
                          onClick={() => setPrimary(t.id)}
                        >
                          Make primary
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={isPending}
                        onClick={() => {
                          setEditingId(t.id);
                          setAdding(false);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-red-600 hover:text-red-700"
                        disabled={isPending}
                        onClick={() => remove(t.id)}
                        aria-label="Remove traveller"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {expanded && (
                  <div className="space-y-3 border-t px-3 py-3 text-sm">
                    <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      <Row label="Date of birth" value={formatDate(t.dateOfBirth)} />
                      <Row label="Gender" value={t.gender.toLowerCase()} />
                      <Row label="Passport" value={t.passportNumber ?? "—"} />
                      <Row
                        label="Passport expiry"
                        value={`${formatDate(t.passportExpiry)} (${PASSPORT_CHECK_LABELS[t.passportCheck]})`}
                      />
                      <Row
                        label="Emergency contact"
                        value={
                          t.emergencyContactName
                            ? `${t.emergencyContactName}${t.emergencyContactPhone ? ` · ${t.emergencyContactPhone}` : ""}${t.emergencyContactRelation ? ` (${t.emergencyContactRelation})` : ""}`
                            : "—"
                        }
                      />
                      <Row
                        label="Frequent flyer"
                        value={
                          t.frequentFlyerNumber
                            ? `${t.frequentFlyerAirline ?? ""} ${t.frequentFlyerNumber}`.trim()
                            : "—"
                        }
                      />
                      {t.visaNotes && <Row label="Visa notes" value={t.visaNotes} />}
                      {t.specialRequests && (
                        <Row label="Special requests" value={t.specialRequests} />
                      )}
                      {t.medicalNotes && <Row label="Medical notes" value={t.medicalNotes} />}
                    </dl>

                    <div>
                      <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                        Documents
                      </p>
                      <TravellerDocuments
                        tenantId={tenantId}
                        travellerId={t.id}
                        documents={documentsByTraveller[t.id] ?? []}
                        canEdit={editable}
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editable && (adding || editingTraveller) && (
        <TravellerForm
          key={editingId ?? "new"}
          initial={editingTraveller ? travellerToInput(editingTraveller) : EMPTY_TRAVELLER}
          submitLabel={editingTraveller ? "Save traveller" : "Add traveller"}
          busy={isPending}
          onSubmit={save}
          onCancel={() => {
            setAdding(false);
            setEditingId(null);
          }}
        />
      )}

      {editable && !adding && !editingId && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
        >
          <Plus className="mr-1.5 size-4" />
          Add traveller
        </Button>
      )}
    </div>
  );
}

function formatDate(date: Date | null): string {
  return date ? new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
