import type { LeadSource, LeadStage, Prisma } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { paginate, pageMeta, toNumber } from "@/shared/lib/list-query";
import type { ListLeadsFilters } from "@/features/leads/schemas/lead.schema";

export type LeadSummary = {
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
  customerId: string | null;
  tripDestination: string | null;
  tripTravelers: number | null;
  tripPeriod: string | null;
  tripStyle: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LeadListResult = {
  leads: LeadSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

function buildWhere(filters: ListLeadsFilters): Prisma.LeadWhereInput {
  const { search, stage, owner, source } = filters;
  return {
    deletedAt: null,
    ...(stage && stage !== "all" ? { stage } : {}),
    ...(owner ? { ownerId: owner } : {}),
    ...(source && source !== "all" ? { source } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { contactName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapLead(l: {
  id: string;
  title: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  source: LeadSource | null;
  ownerId: string | null;
  estimatedValue: Prisma.Decimal | null;
  currency: string;
  expectedCloseDate: Date | null;
  customerId: string | null;
  tripDestination: string | null;
  tripTravelers: number | null;
  tripPeriod: string | null;
  tripStyle: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LeadSummary {
  return {
    id: l.id,
    title: l.title,
    contactName: l.contactName,
    email: l.email,
    phone: l.phone,
    stage: l.stage,
    source: l.source,
    ownerId: l.ownerId,
    estimatedValue: toNumber(l.estimatedValue),
    currency: l.currency,
    expectedCloseDate: l.expectedCloseDate,
    customerId: l.customerId,
    tripDestination: l.tripDestination,
    tripTravelers: l.tripTravelers,
    tripPeriod: l.tripPeriod,
    tripStyle: l.tripStyle,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

const LEAD_SELECT = {
  id: true,
  title: true,
  contactName: true,
  email: true,
  phone: true,
  stage: true,
  source: true,
  ownerId: true,
  estimatedValue: true,
  currency: true,
  expectedCloseDate: true,
  customerId: true,
  tripDestination: true,
  tripTravelers: true,
  tripPeriod: true,
  tripStyle: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listLeads(
  db: TenantDb,
  filters: ListLeadsFilters = {},
): Promise<LeadListResult> {
  const { sort } = filters;
  const { page, skip, take } = paginate(filters.page);
  const where = buildWhere(filters);

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "name_asc"
        ? { title: "asc" as const }
        : sort === "name_desc"
          ? { title: "desc" as const }
          : { createdAt: "desc" as const };

  const [leads, total] = await Promise.all([
    db.lead.findMany({ where, select: LEAD_SELECT, orderBy, skip, take }),
    db.lead.count({ where }),
  ]);

  return { leads: leads.map(mapLead), ...pageMeta(total, page) };
}

export type PipelineStats = {
  byStage: Record<LeadStage, { count: number; value: number }>;
  openCount: number;
  openValue: number;
  wonCount: number;
  lostCount: number;
  overdueReminders: number;
};

/** All non-deleted leads (capped) grouped for the pipeline board + stats. */
export async function getLeadPipeline(
  db: TenantDb,
  filters: ListLeadsFilters = {},
): Promise<{ leads: LeadSummary[]; stats: PipelineStats }> {
  const where = buildWhere(filters);

  const [leads, overdueReminders] = await Promise.all([
    db.lead.findMany({
      where,
      select: LEAD_SELECT,
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    db.leadReminder.count({
      where: { completed: false, dueAt: { lt: new Date() }, lead: { deletedAt: null } },
    }),
  ]);

  const byStage = {} as PipelineStats["byStage"];
  for (const stage of [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "PROPOSAL",
    "NEGOTIATION",
    "WON",
    "LOST",
  ] as LeadStage[]) {
    byStage[stage] = { count: 0, value: 0 };
  }

  const mapped = leads.map(mapLead);
  for (const lead of mapped) {
    byStage[lead.stage].count += 1;
    byStage[lead.stage].value += lead.estimatedValue ?? 0;
  }

  const openStages: LeadStage[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];
  const openCount = openStages.reduce((sum, s) => sum + byStage[s].count, 0);
  const openValue = openStages.reduce((sum, s) => sum + byStage[s].value, 0);

  return {
    leads: mapped,
    stats: {
      byStage,
      openCount,
      openValue,
      wonCount: byStage.WON.count,
      lostCount: byStage.LOST.count,
      overdueReminders,
    },
  };
}
