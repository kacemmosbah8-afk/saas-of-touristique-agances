import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";

import type { InvoiceDetail as InvoiceDetailData } from "@/features/invoices/queries/get-invoice.query";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { InvoiceStatusActions } from "@/features/invoices/components/invoice-status-actions";
import { InvoiceItemsEditor } from "@/features/invoices/components/invoice-items-editor";
import { PaymentHistory } from "@/features/invoices/components/payment-history";
import { CreditNotesSection } from "@/features/invoices/components/credit-notes-section";
import { InstallmentPlanSection } from "@/features/invoices/components/installment-plan-section";
import {
  canEditItems,
  canRecordPayment,
  canIssueCreditNote,
} from "@/features/invoices/lib/invoice-status";

type Props = {
  tenantId: string;
  tenantSlug: string;
  invoice: InvoiceDetailData;
  canEdit: boolean;
  canManage: boolean;
  canCreatePayment: boolean;
  canManagePayment: boolean;
};

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(date: Date | null): string {
  return date ? new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

export function InvoiceDetail({
  tenantId,
  tenantSlug,
  invoice,
  canEdit,
  canManage,
  canCreatePayment,
  canManagePayment,
}: Props) {
  const editable = canEdit && canEditItems(invoice.status);
  const open = canRecordPayment(invoice.status);
  const paidShare =
    invoice.balance.amountOwed > 0
      ? Math.min(100, Math.round((invoice.balance.netPaid / invoice.balance.amountOwed) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/invoices`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Invoices
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tabular-nums">{invoice.reference}</h1>
          <InvoiceStatusBadge status={invoice.status} overdue={invoice.overdue} />
        </div>
        <p className="text-muted-foreground text-sm">
          {invoice.customerName}
          {invoice.bookingReference ? (
            <>
              {" · from "}
              <Link
                href={`/${tenantSlug}/bookings/${invoice.bookingId}`}
                className="inline-flex items-center gap-0.5 hover:underline"
              >
                {invoice.bookingReference}
                <ExternalLink className="size-3" />
              </Link>
            </>
          ) : null}
        </p>
      </div>

      {invoice.status === "VOID" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
          <p className="font-medium text-red-800 dark:text-red-300">
            Voided on {formatDate(invoice.voidedAt)}
            {invoice.voidReason ? ` — ${invoice.voidReason}` : ""}
          </p>
        </div>
      )}

      {invoice.overdue && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
          <p className="font-medium text-red-800 dark:text-red-300">
            Payment was due {formatDate(invoice.dueDate)} —{" "}
            {money(invoice.balance.balanceDue, invoice.currency)} still outstanding.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-2 text-sm font-medium">Line items</h2>
            <InvoiceItemsEditor
              tenantId={tenantId}
              invoiceId={invoice.id}
              items={invoice.items}
              currency={invoice.currency}
              editable={editable}
            />
          </section>

          <section className="rounded-lg border p-4">
            <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
              <Row label="Subtotal" value={money(invoice.subtotal, invoice.currency)} />
              <Row label="Discount" value={`− ${money(invoice.discount, invoice.currency)}`} />
              <Row label="Tax" value={money(invoice.tax, invoice.currency)} />
              <div className="border-t pt-1.5">
                <Row label="Total" value={money(invoice.total, invoice.currency)} strong />
              </div>
              {invoice.amountCredited > 0 && (
                <Row
                  label="Credited"
                  value={`− ${money(invoice.amountCredited, invoice.currency)}`}
                />
              )}
              <Row label="Paid" value={`− ${money(invoice.balance.netPaid, invoice.currency)}`} />
              <div className="border-t pt-1.5">
                <Row
                  label="Balance due"
                  value={money(invoice.balance.balanceDue, invoice.currency)}
                  strong
                />
              </div>
            </dl>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">Payments</h2>
            <PaymentHistory
              tenantId={tenantId}
              invoiceId={invoice.id}
              currency={invoice.currency}
              payments={invoice.payments}
              installments={invoice.installmentPlan?.installments ?? []}
              balanceDue={invoice.balance.balanceDue}
              canRecord={open}
              canCreatePayment={canCreatePayment}
              canManagePayment={canManagePayment}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">Credit notes</h2>
            <CreditNotesSection
              tenantId={tenantId}
              invoiceId={invoice.id}
              currency={invoice.currency}
              creditNotes={invoice.creditNotes}
              canIssue={canManage && canIssueCreditNote(invoice.status)}
            />
          </section>

          {(invoice.notes || invoice.terms || invoice.internalNotes) && (
            <section className="space-y-3">
              {invoice.notes && (
                <div>
                  <h2 className="mb-1 text-sm font-medium">Customer-facing notes</h2>
                  <p className="text-muted-foreground rounded-lg border p-3 text-sm whitespace-pre-wrap">
                    {invoice.notes}
                  </p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h2 className="mb-1 text-sm font-medium">Payment terms</h2>
                  <p className="text-muted-foreground rounded-lg border p-3 text-sm whitespace-pre-wrap">
                    {invoice.terms}
                  </p>
                </div>
              )}
              {invoice.internalNotes && (
                <div>
                  <h2 className="mb-1 text-sm font-medium">Internal notes</h2>
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm whitespace-pre-wrap">
                    {invoice.internalNotes}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Balance</h2>
            <p className="text-2xl font-semibold tabular-nums">
              {money(invoice.balance.balanceDue, invoice.currency)}
            </p>
            <p className="text-muted-foreground text-xs">outstanding</p>
            {invoice.balance.amountOwed > 0 && (
              <div className="mt-3">
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${paidShare}%` }}
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{paidShare}% collected</p>
              </div>
            )}
            <dl className="mt-3 space-y-1.5 border-t pt-3 text-sm">
              <Row label="Collected" value={money(invoice.balance.netPaid, invoice.currency)} />
              {invoice.amountRefunded > 0 && (
                <Row
                  label="Refunded"
                  value={money(invoice.amountRefunded, invoice.currency)}
                />
              )}
              {invoice.amountCredited > 0 && (
                <Row
                  label="Credited"
                  value={money(invoice.amountCredited, invoice.currency)}
                />
              )}
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Details</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Issued" value={formatDate(invoice.issuedAt)} />
              <Row label="Due" value={formatDate(invoice.dueDate)} />
              {invoice.paidAt && <Row label="Paid" value={formatDate(invoice.paidAt)} />}
              <Row label="Created" value={formatDate(invoice.createdAt)} />
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Actions</h2>
            <InvoiceStatusActions
              tenantId={tenantId}
              invoiceId={invoice.id}
              status={invoice.status}
              nothingNetPaid={invoice.balance.netPaid === 0}
              canEdit={canEdit}
              canManage={canManage}
            />
            {canEdit && canEditItems(invoice.status) && (
              <Link
                href={`/${tenantSlug}/invoices/${invoice.id}/edit`}
                className="text-muted-foreground hover:text-foreground mt-3 block text-sm underline"
              >
                Edit invoice header
              </Link>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">Payment plan</h2>
            <InstallmentPlanSection
              tenantId={tenantId}
              invoiceId={invoice.id}
              currency={invoice.currency}
              plan={invoice.installmentPlan}
              canManagePlan={canEdit && open}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">Timeline</h2>
            <ol className="space-y-2">
              {invoice.activities.map((a) => (
                <li key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">{a.title}</p>
                  {a.description && (
                    <p className="text-muted-foreground text-xs">{a.description}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
