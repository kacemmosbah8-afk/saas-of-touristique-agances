import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";

import type { QuoteDetail as QuoteDetailData } from "@/features/quotes/queries/get-quote.query";
import type { PricingCatalog } from "@/features/quotes/queries/pricing-catalog.query";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { QuoteStatusActions } from "@/features/quotes/components/quote-status-actions";
import { QuoteItemsEditor } from "@/features/quotes/components/quote-items-editor";
import { canEditItems } from "@/features/quotes/lib/quote-status";

type Props = {
  tenantId: string;
  tenantSlug: string;
  quote: QuoteDetailData;
  members: MemberOption[];
  catalog: PricingCatalog;
  canEdit: boolean;
  canConvertToBooking: boolean;
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

export function QuoteDetail({
  tenantId,
  tenantSlug,
  quote,
  members,
  catalog,
  canEdit,
  canConvertToBooking,
}: Props) {
  const ownerName = members.find((m) => m.userId === quote.ownerId)?.name ?? null;
  const editable = canEdit && canEditItems(quote.status);
  const expired =
    quote.validUntil != null &&
    new Date(quote.validUntil).getTime() < Date.now() &&
    (quote.status === "DRAFT" || quote.status === "SENT");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/quotes`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Quotes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tabular-nums">{quote.reference}</h1>
          <QuoteStatusBadge status={quote.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {quote.customerName}
          {quote.packageName ? ` · ${quote.packageName}` : ""}
        </p>
      </div>

      {quote.status === "CONVERTED" && quote.convertedBookingId && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm dark:border-violet-900 dark:bg-violet-950">
          <p className="flex items-center gap-1.5 font-medium text-violet-800 dark:text-violet-300">
            Converted to a booking on {formatDate(quote.convertedAt)}
            <Link
              href={`/${tenantSlug}/admin/bookings/${quote.convertedBookingId}`}
              className="inline-flex items-center gap-1 underline"
            >
              View booking
              <ExternalLink className="size-3.5" />
            </Link>
          </p>
        </div>
      )}

      {quote.status === "DECLINED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
          <p className="font-medium text-red-800 dark:text-red-300">
            Declined on {formatDate(quote.declinedAt)}
          </p>
        </div>
      )}

      {expired && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            This quote passed its validity date ({formatDate(quote.validUntil)}). Mark it expired or
            revise and re-send.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-2 text-sm font-medium">Line items</h2>
            <QuoteItemsEditor
              tenantId={tenantId}
              quoteId={quote.id}
              items={quote.items}
              currency={quote.currency}
              catalog={catalog}
              editable={editable}
            />
          </section>

          <section className="rounded-lg border p-4">
            <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
              <Row label="Subtotal" value={money(quote.subtotal, quote.currency)} />
              <Row label="Discount" value={`− ${money(quote.discount, quote.currency)}`} />
              <Row label="Tax" value={money(quote.tax, quote.currency)} />
              <div className="border-t pt-1.5">
                <Row label="Total" value={money(quote.total, quote.currency)} strong />
              </div>
            </dl>
          </section>

          {(quote.notes || quote.terms || quote.internalNotes) && (
            <section className="space-y-3">
              {quote.notes && (
                <div>
                  <h2 className="mb-1 text-sm font-medium">Customer-facing notes</h2>
                  <p className="text-muted-foreground rounded-lg border p-3 text-sm whitespace-pre-wrap">
                    {quote.notes}
                  </p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <h2 className="mb-1 text-sm font-medium">Terms &amp; conditions</h2>
                  <p className="text-muted-foreground rounded-lg border p-3 text-sm whitespace-pre-wrap">
                    {quote.terms}
                  </p>
                </div>
              )}
              {quote.internalNotes && (
                <div>
                  <h2 className="mb-1 text-sm font-medium">Internal notes</h2>
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm whitespace-pre-wrap">
                    {quote.internalNotes}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Details</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Valid until" value={formatDate(quote.validUntil)} />
              <Row label="Travel start" value={formatDate(quote.travelStartDate)} />
              <Row label="Travel end" value={formatDate(quote.travelEndDate)} />
              <Row
                label="Travellers"
                value={`${quote.adults} adult(s), ${quote.children} child(ren)`}
              />
              <Row label="Agent" value={ownerName ?? "Unassigned"} />
              <Row label="Created" value={formatDate(quote.createdAt)} />
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Status</h2>
            {canEdit ? (
              <QuoteStatusActions
                tenantId={tenantId}
                tenantSlug={tenantSlug}
                quoteId={quote.id}
                status={quote.status}
                ownerId={quote.ownerId}
                members={members}
                canEdit={canEdit}
                canConvertToBooking={canConvertToBooking}
              />
            ) : (
              <QuoteStatusBadge status={quote.status} />
            )}
          </section>

          {canEdit && canEditItems(quote.status) && (
            <section>
              <Link
                href={`/${tenantSlug}/admin/quotes/${quote.id}/edit`}
                className="text-muted-foreground hover:text-foreground text-sm underline"
              >
                Edit quote header
              </Link>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-sm font-medium">Timeline</h2>
            <ol className="space-y-2">
              {quote.activities.map((a) => (
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
