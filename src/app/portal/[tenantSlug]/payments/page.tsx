import { CreditCard, Receipt, Wallet } from "lucide-react";

import { requirePortalSession } from "@/features/portal/lib/guard";
import { getPortalPaymentsOverview } from "@/features/portal/queries/payments.query";
import { formatDate, formatMoney } from "@/features/portal/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";

export const metadata = { title: "Payments" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function PortalPaymentsPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const ctx = await requirePortalSession(tenantSlug);

  const overview = await getPortalPaymentsOverview(ctx.db, ctx.tenantId, ctx.customerId);
  const settled = overview.totalOutstanding <= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm">Across all your bookings with {ctx.tenantName}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
              <Wallet className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Total paid</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(overview.totalPaid, overview.currency)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                settled
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              }`}
            >
              <CreditCard className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Outstanding balance</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatMoney(overview.totalOutstanding, overview.currency)}
              </p>
              {settled && <p className="text-xs text-emerald-600 dark:text-emerald-400">All settled — thank you</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {overview.payments.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payments recorded yet"
          description="Payments you make will be listed here, each tied to its invoice."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {overview.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.reference}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatDate(p.receivedAt)} · Invoice {p.invoiceReference}
                      {p.bookingReference ? ` · ${p.bookingReference}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-right font-medium tabular-nums">{formatMoney(p.amount, p.currency)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-center text-xs">
        Online payment isn&apos;t available yet — {ctx.tenantName} will share payment instructions directly.
      </p>
    </div>
  );
}
