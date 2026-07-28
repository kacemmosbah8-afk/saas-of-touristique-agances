"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  BellRing,
  CheckCircle2,
  Circle,
  Trash2,
} from "lucide-react";
import type { LeadStage } from "@prisma/client";

import type { LeadDetail } from "@/features/leads/queries/get-lead.query";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
} from "@/features/leads/schemas/lead.schema";
import {
  updateLeadAction,
  updateLeadStageAction,
  assignLeadAction,
  convertLeadAction,
} from "@/features/leads/actions/lead.action";
import {
  addLeadNoteAction,
  deleteLeadNoteAction,
  addLeadReminderAction,
  toggleLeadReminderAction,
  deleteLeadReminderAction,
} from "@/features/leads/actions/lead-relations.action";
import { LeadForm } from "@/features/leads/components/lead-form";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { EmptyState } from "@/shared/components/empty-state";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import type { Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

const NONE = "__none__";

type Props = {
  tenantId: string;
  tenantSlug: string;
  lead: LeadDetail;
  members: MemberOption[];
  canEdit: boolean;
  locale: Locale;
};

export function LeadDetailPanel({ tenantId, tenantSlug, lead, members, canEdit, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteDraft, setNoteDraft] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDue, setReminderDue] = useState("");
  const { confirm, confirmDialog } = useConfirm(locale);
  const dict = getAdminDictionary(locale).leads;

  const isConverted = !!lead.convertedAt;

  function moveStage(stage: LeadStage) {
    startTransition(async () => {
      const lostReason =
        stage === "LOST"
          ? (prompt(dict.lostReasonPrompt) ?? undefined)
          : undefined;
      const result = await updateLeadStageAction(tenantId, lead.id, { stage, lostReason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function assign(ownerId: string) {
    startTransition(async () => {
      const result = await assignLeadAction(tenantId, lead.id, {
        ownerId: ownerId === NONE ? "" : ownerId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.ownerUpdated);
      router.refresh();
    });
  }

  async function convert() {
    if (
      !(await confirm({
        title: dict.convertConfirmTitle,
        description: dict.convertConfirmBody,
      }))
    )
      return;
    startTransition(async () => {
      const result = await convertLeadAction(tenantId, lead.id, {});
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.leadConverted);
      router.push(`/${tenantSlug}/admin/customers/${result.data.customerId}`);
    });
  }

  function addNote() {
    const body = noteDraft.trim();
    if (!body) return;
    startTransition(async () => {
      const result = await addLeadNoteAction(tenantId, lead.id, { body });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNoteDraft("");
      router.refresh();
    });
  }

  function removeNote(noteId: string) {
    startTransition(async () => {
      const result = await deleteLeadNoteAction(tenantId, noteId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function addReminder() {
    if (!reminderTitle.trim() || !reminderDue) return;
    startTransition(async () => {
      const result = await addLeadReminderAction(tenantId, lead.id, {
        title: reminderTitle.trim(),
        dueAt: reminderDue,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setReminderTitle("");
      setReminderDue("");
      router.refresh();
    });
  }

  function toggleReminder(reminderId: string, completed: boolean) {
    startTransition(async () => {
      const result = await toggleLeadReminderAction(tenantId, reminderId, completed);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function removeReminder(reminderId: string) {
    startTransition(async () => {
      const result = await deleteLeadReminderAction(tenantId, reminderId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium uppercase">{dict.stage}</span>
            <Select
              value={lead.stage}
              onValueChange={(v) => moveStage(v as LeadStage)}
              disabled={isPending || isConverted}
            >
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium uppercase">{dict.owner}</span>
            <Select
              value={lead.ownerId ?? NONE}
              onValueChange={assign}
              disabled={isPending}
            >
              <SelectTrigger className="h-8 w-[170px]">
                <SelectValue placeholder={dict.unassigned} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{dict.unassigned}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isConverted ? (
            <Button size="sm" className="ms-auto" onClick={convert} disabled={isPending}>
              <ArrowRightLeft className="me-1.5 size-4" />
              {dict.convertToCustomer}
            </Button>
          ) : (
            lead.customerId && (
              <Link
                href={`/${tenantSlug}/admin/customers/${lead.customerId}`}
                className="text-primary ms-auto text-sm underline underline-offset-2"
              >
                {dict.viewCustomer} {lead.customerName ? `(${lead.customerName})` : ""}
              </Link>
            )
          )}
        </div>
      )}

      {lead.stage === "LOST" && lead.lostReason && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {dict.lostPrefix} {lead.lostReason}
        </p>
      )}

      <Tabs defaultValue="details">
        <TabsList className="mb-6">
          <TabsTrigger value="details">{dict.tabDetails}</TabsTrigger>
          <TabsTrigger value="notes">{dict.tabNotes}</TabsTrigger>
          <TabsTrigger value="reminders">{dict.tabReminders}</TabsTrigger>
          <TabsTrigger value="history">{dict.tabHistory}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {lead.source === "PLAN_MY_TRIP" && (
            <div className="bg-muted/40 space-y-1 rounded-lg border p-3 text-sm">
              <p className="text-xs font-medium tracking-wide uppercase">
                {dict.planMyTripAnswers}
              </p>
              {lead.tripDestination && (
                <p>
                  <span className="text-muted-foreground">{dict.destination}:</span>{" "}
                  {lead.tripDestination}
                </p>
              )}
              {lead.tripPeriod && (
                <p>
                  <span className="text-muted-foreground">{dict.travelPeriod}:</span>{" "}
                  {lead.tripPeriod}
                </p>
              )}
              {lead.tripTravelers != null && (
                <p>
                  <span className="text-muted-foreground">{dict.travelers}:</span> {lead.tripTravelers}
                </p>
              )}
              {lead.tripStyle && (
                <p>
                  <span className="text-muted-foreground">{dict.style}:</span> {lead.tripStyle}
                </p>
              )}
            </div>
          )}
          {canEdit ? (
            <LeadForm
              mode="edit"
              tenantSlug={tenantSlug}
              lead={lead}
              members={members}
              locale={locale}
              onSubmit={(values) => updateLeadAction(tenantId, lead.id, values)}
            />
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">{dict.contact}:</span> {lead.contactName}
              </p>
              {lead.email && (
                <p>
                  <span className="text-muted-foreground">{dict.email}:</span> {lead.email}
                </p>
              )}
              {lead.phone && (
                <p>
                  <span className="text-muted-foreground">{dict.phone}:</span> {lead.phone}
                </p>
              )}
              {lead.notes && <p className="whitespace-pre-wrap">{lead.notes}</p>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          {canEdit && (
            <div className="space-y-2">
              <Textarea
                placeholder={dict.writeNote}
                className="min-h-[80px]"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                disabled={isPending}
              />
              <Button size="sm" onClick={addNote} disabled={isPending || !noteDraft.trim()}>
                {dict.addNote}
              </Button>
            </div>
          )}
          {lead.leadNotes.length === 0 ? (
            <EmptyState title={dict.noNotesYet} className="rounded-lg py-8" />
          ) : (
            <ul className="space-y-3">
              {lead.leadNotes.map((note) => (
                <li key={note.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 text-sm whitespace-pre-wrap">{note.body}</p>
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive size-6 shrink-0"
                        disabled={isPending}
                        onClick={() => removeNote(note.id)}
                        aria-label={dict.deleteNote}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <Input
                  placeholder={dict.followUpPlaceholder}
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <Input
                type="datetime-local"
                className="w-[210px]"
                value={reminderDue}
                onChange={(e) => setReminderDue(e.target.value)}
                disabled={isPending}
              />
              <Button
                size="sm"
                onClick={addReminder}
                disabled={isPending || !reminderTitle.trim() || !reminderDue}
              >
                <BellRing className="me-1.5 size-4" />
                {dict.addReminder}
              </Button>
            </div>
          )}
          {lead.reminders.length === 0 ? (
            <EmptyState title={dict.noReminders} className="rounded-lg py-8" />
          ) : (
            <ul className="space-y-2">
              {lead.reminders.map((reminder) => {
                const overdue = !reminder.completed && new Date(reminder.dueAt) < new Date();
                return (
                  <li
                    key={reminder.id}
                    className="flex items-center gap-3 rounded-lg border px-4 py-2.5"
                  >
                    <button
                      type="button"
                      disabled={!canEdit || isPending}
                      onClick={() => toggleReminder(reminder.id, !reminder.completed)}
                      aria-label={reminder.completed ? dict.reopenReminder : dict.completeReminder}
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <Circle className="text-muted-foreground size-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${reminder.completed ? "text-muted-foreground line-through" : "font-medium"}`}
                      >
                        {reminder.title}
                      </p>
                      <p
                        className={`text-xs ${overdue ? "font-medium text-red-500" : "text-muted-foreground"}`}
                      >
                        {dict.due} {new Date(reminder.dueAt).toLocaleString()}
                        {overdue ? ` — ${dict.overdue}` : ""}
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive size-6"
                        disabled={isPending}
                        onClick={() => removeReminder(reminder.id)}
                        aria-label={dict.deleteReminder}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="history">
          {lead.history.length === 0 ? (
            <EmptyState title={dict.noHistoryYet} className="rounded-lg py-8" />
          ) : (
            <ul className="space-y-3">
              {lead.history.map((item) => (
                <li key={item.id} className="border-muted border-l-2 pl-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
      {confirmDialog}
    </div>
  );
}
