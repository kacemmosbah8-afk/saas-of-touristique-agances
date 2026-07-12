import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Bus, UserRound, Handshake, Ticket, MapPin, Package } from "lucide-react";

import { requireTenantMembershipOrNotFound } from "@/shared/lib/permissions/guard";
import { prisma } from "@/shared/lib/db";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

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
  const [packages, hotels, transport, guides, suppliers, activities, destinations] =
    await Promise.all([
      db.package.count({ where: notDeleted }),
      db.hotel.count({ where: notDeleted }),
      db.transportProvider.count({ where: notDeleted }),
      db.guide.count({ where: notDeleted }),
      db.supplier.count({ where: notDeleted }),
      db.activity.count({ where: notDeleted }),
      db.destination.count({ where: notDeleted }),
    ]);

  const stats = [
    { label: "Packages", value: packages, icon: Package, href: `/${tenantSlug}/packages` },
    { label: "Hotels", value: hotels, icon: Building2, href: `/${tenantSlug}/hotels` },
    { label: "Transportation", value: transport, icon: Bus, href: `/${tenantSlug}/transport` },
    { label: "Guides", value: guides, icon: UserRound, href: `/${tenantSlug}/guides` },
    { label: "Suppliers", value: suppliers, icon: Handshake, href: `/${tenantSlug}/suppliers` },
    { label: "Activities", value: activities, icon: Ticket, href: `/${tenantSlug}/activities` },
    { label: "Destinations", value: destinations, icon: MapPin, href: `/${tenantSlug}/destinations` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome to {tenant.name}</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as {membership.role.toLowerCase()}. Your supplier &amp; inventory catalogue.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
                  <CardDescription>{label}</CardDescription>
                </div>
                <Icon className="text-muted-foreground size-5 shrink-0" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
