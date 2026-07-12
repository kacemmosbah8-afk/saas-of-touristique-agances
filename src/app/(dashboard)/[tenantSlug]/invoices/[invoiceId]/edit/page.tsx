import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getInvoice } from "@/features/invoices/queries/get-invoice.query";
import {
  getCustomerOptions,
  getBookingOptions,
} from "@/features/bookings/queries/booking-options.query";
import { InvoiceFormClient } from "@/features/invoices/components/invoice-form-client";
import { canEditItems } from "@/features/invoices/lib/invoice-status";

export const metadata = { title: "Edit Invoice — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; invoiceId: string }> };

export default async function EditInvoicePage({ params }: PageProps) {
  const { tenantSlug, invoiceId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "invoice", "update");

  const [invoice, customers, bookings] = await Promise.all([
    getInvoice(db, tenant.id, invoiceId),
    getCustomerOptions(db),
    getBookingOptions(db),
  ]);
  if (!invoice) notFound();
  // An issued invoice's header is locked — send the user back to detail.
  if (!canEditItems(invoice.status)) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/invoices/${invoice.id}`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          {invoice.reference}
        </Link>
        <h1 className="text-xl font-semibold">Edit Invoice</h1>
      </div>

      <InvoiceFormClient
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        customers={customers}
        bookings={bookings}
        invoice={invoice}
      />
    </div>
  );
}
