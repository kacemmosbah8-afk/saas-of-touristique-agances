import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import {
  getCustomerOptions,
  getBookingOptions,
} from "@/features/bookings/queries/booking-options.query";
import { InvoiceFormClient } from "@/features/invoices/components/invoice-form-client";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "New Invoice — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewInvoicePage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "invoice", "create");

  const [customers, bookings] = await Promise.all([
    getCustomerOptions(db),
    getBookingOptions(db),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/invoices`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Invoices
        </Link>
        <h1 className="text-xl font-semibold">New Invoice</h1>
        <p className="text-muted-foreground text-sm">
          Create the invoice header, then add line items on the invoice page. Tip: generating an
          invoice from a booking copies its lines automatically.
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm">
          <p className="text-muted-foreground">
            You need at least one customer before creating an invoice.
          </p>
          <Link href={`/${tenantSlug}/customers/new`} className="mt-3 inline-block">
            <Button size="sm">Add a customer</Button>
          </Link>
        </div>
      ) : (
        <InvoiceFormClient
          tenantId={tenant.id}
          tenantSlug={tenantSlug}
          customers={customers}
          bookings={bookings}
        />
      )}
    </div>
  );
}
