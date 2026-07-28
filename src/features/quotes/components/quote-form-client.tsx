"use client";

import { createQuoteAction, updateQuoteAction } from "@/features/quotes/actions/quote.action";
import { QuoteForm } from "@/features/quotes/components/quote-form";
import type { QuoteDetail } from "@/features/quotes/queries/get-quote.query";
import type {
  CustomerOption,
  PackageOption,
} from "@/features/bookings/queries/booking-options.query";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import type { QuoteFormInput } from "@/features/quotes/schemas/quote.schema";
import { type Locale } from "@/shared/i18n/dictionary";

type Props = {
  tenantId: string;
  tenantSlug: string;
  customers: CustomerOption[];
  packages: PackageOption[];
  members: MemberOption[];
  quote?: QuoteDetail;
  locale: Locale;
};

export function QuoteFormClient({
  tenantId,
  tenantSlug,
  customers,
  packages,
  members,
  quote,
  locale,
}: Props) {
  return (
    <QuoteForm
      mode={quote ? "edit" : "create"}
      tenantSlug={tenantSlug}
      quote={quote}
      customers={customers}
      packages={packages}
      members={members}
      onSubmit={(values: QuoteFormInput) =>
        quote
          ? updateQuoteAction(tenantId, quote.id, values)
          : createQuoteAction(tenantId, values)
      }
      locale={locale}
    />
  );
}
