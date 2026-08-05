"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import type { CustomerNoteItem } from "@/features/crm/queries/get-customer.query";
import {
  addCustomerNoteAction,
  deleteCustomerNoteAction,
} from "@/features/crm/actions/customer-relations.action";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  customerId: string;
  notes: CustomerNoteItem[];
  canEdit: boolean;
  locale: Locale;
};

export function CustomerNotes({ tenantId, customerId, notes, canEdit, locale }: Props) {
  const dict = getAdminDictionary(locale).customers.notes;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const { confirm, confirmDialog } = useConfirm(locale);

  function addNote() {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const result = await addCustomerNoteAction(tenantId, customerId, { body });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft("");
      toast.success(dict.added);
      router.refresh();
    });
  }

  async function removeNote(noteId: string) {
    if (!(await confirm({ title: common.confirmDeleteTitle, destructive: true }))) return;
    startTransition(async () => {
      const result = await deleteCustomerNoteAction(tenantId, noteId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-2">
          <Textarea
            placeholder={dict.writeNote}
            className="min-h-[80px]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isPending}
          />
          <Button size="sm" onClick={addNote} disabled={isPending || !draft.trim()}>
            {isPending ? dict.saving : dict.addNote}
          </Button>
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState title={dict.noNotesYet} className="rounded-lg py-8" />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
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
                    aria-label={dict.deleteNoteAria}
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
      {confirmDialog}
    </div>
  );
}
