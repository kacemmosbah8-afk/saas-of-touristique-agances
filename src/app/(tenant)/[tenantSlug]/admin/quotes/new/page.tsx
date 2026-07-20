import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import {
  getCustomerOptions,
  getPackageOptions,
} from "@/features/bookings/queries/booking-options.query";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { QuoteFormClient } from "@/features/quotes/components/quote-form-client";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "New Quote — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewQuotePage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "quote", "create");

  const [customers, packages, members] = await Promise.all([
    getCustomerOptions(db),
    getPackageOptions(db),
    getMemberOptions(tenant.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/quotes`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Quotes
        </Link>
        <h1 className="text-xl font-semibold">New Quote</h1>
        <p className="text-muted-foreground text-sm">
          Create the quote header, then add line items — priced automatically from your inventory —
          on the quote page.
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm">
          <p className="text-muted-foreground">
            You need at least one customer before creating a quote.
          </p>
          <Link href={`/${tenantSlug}/admin/customers/new`} className="mt-3 inline-block">
            <Button size="sm">Add a customer</Button>
          </Link>
        </div>
      ) : (
        <QuoteFormClient
          tenantId={tenant.id}
          tenantSlug={tenantSlug}
          customers={customers}
          packages={packages}
          members={members}
        />
      )}
    </div>
  );
}
