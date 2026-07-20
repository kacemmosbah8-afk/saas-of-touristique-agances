import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { FlightFormClient } from "@/features/flights/components/flight-form-client";

export const metadata = { title: "New Flight — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewFlightPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  await requirePermissionOrNotFound(tenant.id, "flight", "create");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/flights`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Flights
        </Link>
        <h1 className="text-xl font-semibold">New Flight</h1>
        <p className="text-muted-foreground text-sm">
          Add a new route. You can publish it once it&apos;s ready.
        </p>
      </div>

      <FlightFormClient tenantId={tenant.id} tenantSlug={tenantSlug} />
    </div>
  );
}
