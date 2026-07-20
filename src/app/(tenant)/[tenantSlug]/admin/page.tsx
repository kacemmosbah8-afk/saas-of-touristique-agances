import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Bus,
  UserRound,
  Handshake,
  Ticket,
  MapPin,
  Package,
  Users,
  Filter,
} from "lucide-react";

import { requireTenantMembershipOrNotFound } from "@/shared/lib/permissions/guard";
import { prisma } from "@/shared/lib/db";

function StatTile({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card hover:border-primary/40 block rounded-xl border p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <Icon className="text-muted-foreground/70 size-4 shrink-0" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </Link>
  );
}

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requireTenantMembershipOrNotFound(tenant.id);

  const notDeleted = { deletedAt: null };
  const [customers, leads, packages, hotels, transport, guides, suppliers, activities, destinations] =
    await Promise.all([
      db.customer.count({ where: notDeleted }),
      db.lead.count({ where: { ...notDeleted, stage: { notIn: ["WON", "LOST"] } } }),
      db.package.count({ where: notDeleted }),
      db.hotel.count({ where: notDeleted }),
      db.transportProvider.count({ where: notDeleted }),
      db.guide.count({ where: notDeleted }),
      db.supplier.count({ where: notDeleted }),
      db.activity.count({ where: notDeleted }),
      db.destination.count({ where: notDeleted }),
    ]);

  const salesStats = [
    { label: "Customers", value: customers, icon: Users, href: `/${tenantSlug}/admin/customers` },
    { label: "Open Leads", value: leads, icon: Filter, href: `/${tenantSlug}/admin/leads` },
  ];

  const inventoryStats = [
    { label: "Packages", value: packages, icon: Package, href: `/${tenantSlug}/admin/packages` },
    { label: "Hotels", value: hotels, icon: Building2, href: `/${tenantSlug}/admin/hotels` },
    { label: "Transportation", value: transport, icon: Bus, href: `/${tenantSlug}/admin/transport` },
    { label: "Guides", value: guides, icon: UserRound, href: `/${tenantSlug}/admin/guides` },
    { label: "Suppliers", value: suppliers, icon: Handshake, href: `/${tenantSlug}/admin/suppliers` },
    { label: "Activities", value: activities, icon: Ticket, href: `/${tenantSlug}/admin/activities` },
    { label: "Destinations", value: destinations, icon: MapPin, href: `/${tenantSlug}/admin/destinations` },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to {tenant.name}</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as {membership.role.toLowerCase()}. Your supplier &amp; inventory catalogue.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Sales</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {salesStats.map((stat) => (
            <StatTile key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Inventory</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {inventoryStats.map((stat) => (
            <StatTile key={stat.label} {...stat} />
          ))}
        </div>
      </section>
    </div>
  );
}
