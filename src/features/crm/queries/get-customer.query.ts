import type {
  CommunicationPreference,
  CustomerActivityType,
  CustomerType,
  LeadSource,
  ResourceStatus,
} from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type CustomerContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
};

export type CustomerAddress = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  isPrimary: boolean;
};

export type CustomerNoteItem = {
  id: string;
  body: string;
  authorId: string;
  createdAt: Date;
};

export type CustomerTimelineItem = {
  id: string;
  type: CustomerActivityType;
  title: string;
  description: string | null;
  createdAt: Date;
};

export type CustomerStats = {
  notes: number;
  activities: number;
  leads: number;
  ageDays: number;
};

export type CustomerDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  type: CustomerType;
  status: ResourceStatus;
  leadSource: LeadSource | null;
  communicationPreference: CommunicationPreference;
  dateOfBirth: Date | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: Date | null;
  notes: string | null;
  companyId: string | null;
  companyName: string | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  tags: { id: string; name: string; color: string }[];
  customerNotes: CustomerNoteItem[];
  timeline: CustomerTimelineItem[];
  stats: CustomerStats;
};

export async function getCustomer(
  db: TenantDb,
  customerId: string,
): Promise<CustomerDetail | null> {
  const customer = await db.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    include: {
      company: { select: { name: true } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      addresses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      customerTags: { include: { tag: true } },
      customerNotes: { orderBy: { createdAt: "desc" }, take: 50 },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      _count: { select: { customerNotes: true, activities: true, leads: true } },
    },
  });

  if (!customer) return null;

  const ageDays = Math.floor(
    (Date.now() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    type: customer.type,
    status: customer.status,
    leadSource: customer.leadSource,
    communicationPreference: customer.communicationPreference,
    dateOfBirth: customer.dateOfBirth,
    nationality: customer.nationality,
    passportNumber: customer.passportNumber,
    passportExpiry: customer.passportExpiry,
    notes: customer.notes,
    companyId: customer.companyId,
    companyName: customer.company?.name ?? null,
    ownerId: customer.ownerId,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    contacts: customer.contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      role: c.role,
      isPrimary: c.isPrimary,
    })),
    addresses: customer.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      isPrimary: a.isPrimary,
    })),
    tags: customer.customerTags.map((ct) => ({
      id: ct.tag.id,
      name: ct.tag.name,
      color: ct.tag.color,
    })),
    customerNotes: customer.customerNotes.map((n) => ({
      id: n.id,
      body: n.body,
      authorId: n.authorId,
      createdAt: n.createdAt,
    })),
    timeline: customer.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      createdAt: a.createdAt,
    })),
    stats: {
      notes: customer._count.customerNotes,
      activities: customer._count.activities,
      leads: customer._count.leads,
      ageDays,
    },
  };
}
