import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getQuote } from "@/features/quotes/queries/get-quote.query";
import {
  getCustomerOptions,
  getPackageOptions,
} from "@/features/bookings/queries/booking-options.query";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { QuoteFormClient } from "@/features/quotes/components/quote-form-client";
import { canEditItems } from "@/features/quotes/lib/quote-status";

export const metadata = { title: "Edit Quote — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; quoteId: string }> };

export default async function EditQuotePage({ params }: PageProps) {
  const { tenantSlug, quoteId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "quote", "update");

  const [quote, customers, packages, members] = await Promise.all([
    getQuote(db, tenant.id, quoteId),
    getCustomerOptions(db),
    getPackageOptions(db),
    getMemberOptions(tenant.id),
  ]);
  if (!quote) notFound();
  // A decided/converted quote's header is locked — send the user back to detail.
  if (!canEditItems(quote.status)) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/quotes/${quote.id}`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          {quote.reference}
        </Link>
        <h1 className="text-xl font-semibold">Edit Quote</h1>
      </div>

      <QuoteFormClient
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        customers={customers}
        packages={packages}
        members={members}
        quote={quote}
      />
    </div>
  );
}
