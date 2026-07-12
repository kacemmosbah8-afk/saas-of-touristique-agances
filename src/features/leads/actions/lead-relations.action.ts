"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import {
  leadNoteSchema,
  leadReminderSchema,
  type LeadNoteInput,
  type LeadReminderInput,
} from "@/features/leads/schemas/lead.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function addLeadNoteAction(
  tenantId: string,
  leadId: string,
  input: LeadNoteInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "lead", "update");
  const parsed = leadNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const lead = await db.lead.findFirst({ where: { id: leadId, tenantId }, select: { id: true } });
  if (!lead) return { ok: false, error: "Lead not found." };

  await db.leadNote.create({
    data: { tenantId, leadId, authorId: session.user.id, body: parsed.data.body },
  });
  await db.leadActivity.create({
    data: { tenantId, leadId, userId: session.user.id, type: "NOTE_ADDED", title: "Note added" },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "add-note",
    entity: "lead",
    entityId: leadId,
  });
  return { ok: true };
}

export async function deleteLeadNoteAction(
  tenantId: string,
  noteId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "lead", "update");
  try {
    await db.leadNote.delete({ where: { id: noteId, tenantId } });
  } catch {
    return { ok: false, error: "Note not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-note",
    entity: "lead",
    entityId: noteId,
  });
  return { ok: true };
}

export async function addLeadReminderAction(
  tenantId: string,
  leadId: string,
  input: LeadReminderInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "lead", "update");
  const parsed = leadReminderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const lead = await db.lead.findFirst({ where: { id: leadId, tenantId }, select: { id: true } });
  if (!lead) return { ok: false, error: "Lead not found." };

  await db.leadReminder.create({
    data: {
      tenantId,
      leadId,
      userId: session.user.id,
      title: parsed.data.title,
      dueAt: new Date(parsed.data.dueAt),
    },
  });
  await db.leadActivity.create({
    data: {
      tenantId,
      leadId,
      userId: session.user.id,
      type: "REMINDER",
      title: `Reminder set: ${parsed.data.title}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "add-reminder",
    entity: "lead",
    entityId: leadId,
  });
  return { ok: true };
}

export async function toggleLeadReminderAction(
  tenantId: string,
  reminderId: string,
  completed: boolean,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "lead", "update");
  try {
    await db.leadReminder.update({
      where: { id: reminderId, tenantId },
      data: { completed, completedAt: completed ? new Date() : null },
    });
  } catch {
    return { ok: false, error: "Reminder not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: completed ? "complete-reminder" : "reopen-reminder",
    entity: "lead",
    entityId: reminderId,
  });
  return { ok: true };
}

export async function deleteLeadReminderAction(
  tenantId: string,
  reminderId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "lead", "update");
  try {
    await db.leadReminder.delete({ where: { id: reminderId, tenantId } });
  } catch {
    return { ok: false, error: "Reminder not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-reminder",
    entity: "lead",
    entityId: reminderId,
  });
  return { ok: true };
}
