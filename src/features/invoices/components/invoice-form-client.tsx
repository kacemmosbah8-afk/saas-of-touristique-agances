"use client";

import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/features/invoices/actions/invoice.action";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";
import type { InvoiceDetail } from "@/features/invoices/queries/get-invoice.query";
import type {
  CustomerOption,
  BookingOption,
} from "@/features/bookings/queries/booking-options.query";
import type { InvoiceFormInput } from "@/features/invoices/schemas/invoice.schema";

type Props = {
  tenantId: string;
  tenantSlug: string;
  customers: CustomerOption[];
  bookings: BookingOption[];
  invoice?: InvoiceDetail;
};

export function InvoiceFormClient({
  tenantId,
  tenantSlug,
  customers,
  bookings,
  invoice,
}: Props) {
  return (
    <InvoiceForm
      mode={invoice ? "edit" : "create"}
      tenantSlug={tenantSlug}
      invoice={invoice}
      customers={customers}
      bookings={bookings}
      onSubmit={(values: InvoiceFormInput) =>
        invoice
          ? updateInvoiceAction(tenantId, invoice.id, values)
          : createInvoiceAction(tenantId, values)
      }
    />
  );
}
