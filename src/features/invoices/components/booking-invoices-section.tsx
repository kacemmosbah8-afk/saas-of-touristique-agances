"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Receipt } from "lucide-react";

import { generateInvoiceFromBookingAction } from "@/features/invoices/actions/invoice.action";
import type { BookingInvoiceView } from "@/features/invoices/queries/booking-invoices.query";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { Button } from "@/shared/components/ui/button";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

type Props = {
  tenantId: string;
  tenantSlug: string;
  bookingId: string;
  invoices: BookingInvoiceView[];
  canCreateInvoice: boolean;
};

/** The invoices generated from a booking + the generate button — closes the
 * Quote → Booking → Invoice funnel from the booking detail page. */
export function BookingInvoicesSection({
  tenantId,
  tenantSlug,
  bookingId,
  invoices,
  canCreateInvoice,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateInvoiceFromBookingAction(tenantId, bookingId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft invoice generated.");
      router.push(`/${tenantSlug}/invoices/${result.data.invoiceId}`);
    });
  }

  return (
    <div className="space-y-3">
      {invoices.length > 0 && (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <Link
                  href={`/${tenantSlug}/invoices/${inv.id}`}
                  className="font-medium tabular-nums hover:underline"
                >
                  {inv.reference}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {money(inv.total, inv.currency)}
                  {inv.balanceDue > 0 && inv.status !== "DRAFT" && inv.status !== "VOID"
                    ? ` · ${money(inv.balanceDue, inv.currency)} due`
                    : ""}
                </p>
              </div>
              <InvoiceStatusBadge status={inv.status} />
            </li>
          ))}
        </ul>
      )}

      {invoices.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed py-4 text-center text-xs">
          No invoices for this booking yet.
        </p>
      )}

      {canCreateInvoice && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={generate}>
          <Receipt className="mr-1.5 size-4" />
          Generate invoice
        </Button>
      )}
    </div>
  );
}
