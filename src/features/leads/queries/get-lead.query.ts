import type { LeadActivityType, LeadSource, LeadStage } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type LeadNoteItem = {
  id: string;
  body: string;
  authorId: string;
  createdAt: Date;
};

export type LeadHistoryItem = {
  id: string;
  type: LeadActivityType;
  title: string;
  description: string | null;
  createdAt: Date;
};

export type LeadReminderItem = {
  id: string;
  title: string;
  dueAt: Date;
  completed: boolean;
};

export type LeadDetail = {
  id: string;
  title: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  source: LeadSource | null;
  ownerId: string | null;
  estimatedValue: number | null;
  currency: string;
  expectedCloseDate: Date | null;
  notes: string | null;
  tripDestination: string | null;
  tripTravelers: number | null;
  tripPeriod: string | null;
  tripStyle: string | null;
  customerId: string | null;
  customerName: string | null;
  convertedAt: Date | null;
  lostReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  leadNotes: LeadNoteItem[];
  history: LeadHistoryItem[];
  reminders: LeadReminderItem[];
};

export async function getLead(db: TenantDb, leadId: string): Promise<LeadDetail | null> {
  const lead = await db.lead.findFirst({
    where: { id: leadId, deletedAt: null },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      leadNotes: { orderBy: { createdAt: "desc" }, take: 50 },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      reminders: { orderBy: [{ completed: "asc" }, { dueAt: "asc" }], take: 50 },
    },
  });
  if (!lead) return null;

  return {
    id: lead.id,
    title: lead.title,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    stage: lead.stage,
    source: lead.source,
    ownerId: lead.ownerId,
    estimatedValue: toNumber(lead.estimatedValue),
    currency: lead.currency,
    expectedCloseDate: lead.expectedCloseDate,
    notes: lead.notes,
    tripDestination: lead.tripDestination,
    tripTravelers: lead.tripTravelers,
    tripPeriod: lead.tripPeriod,
    tripStyle: lead.tripStyle,
    customerId: lead.customerId,
    customerName: lead.customer
      ? `${lead.customer.firstName} ${lead.customer.lastName}`
      : null,
    convertedAt: lead.convertedAt,
    lostReason: lead.lostReason,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    leadNotes: lead.leadNotes.map((n) => ({
      id: n.id,
      body: n.body,
      authorId: n.authorId,
      createdAt: n.createdAt,
    })),
    history: lead.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      createdAt: a.createdAt,
    })),
    reminders: lead.reminders.map((r) => ({
      id: r.id,
      title: r.title,
      dueAt: r.dueAt,
      completed: r.completed,
    })),
  };
}
