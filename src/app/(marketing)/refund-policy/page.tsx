import type { Metadata } from "next";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { LEGAL_EFFECTIVE_DATE } from "@/features/marketing/lib/legal-constants";
import { LegalDocument } from "@/features/marketing/components/legal-document";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — TravelOS",
  description: "How refunds work for a TravelOS one-time license purchase.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  const { name, supportEmail } = siteConfig;

  return (
    <LegalDocument
      title="Refund & Cancellation Policy"
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      intro={
        <p>
          This policy explains how refunds work for a {name} license — the one-time fee your
          agency pays to use the platform. It does not cover the cancellation or refund terms
          your agency offers its own customers for their travel bookings; those are configured
          by your Workspace in the product itself and are entirely your agency&apos;s own policy
          toward your customers.
        </p>
      }
      sections={[
        {
          heading: "One-Time License",
          body: (
            <p>
              {name} is sold as a one-time license fee per agency, not a recurring subscription.
              There is no trial period, no recurring charge, and no self-service signup — access
              is set up directly with your agency at the time of purchase.
            </p>
          ),
        },
        {
          heading: "Refunds",
          body: (
            <p>
              If you believe you were charged in error — for example, a duplicate charge — contact
              us and we will review and correct it. Refund requests made shortly after purchase,
              before meaningful use of the Service has begun, are considered on a case-by-case
              basis; the license fee is otherwise non-refundable once access has been granted.
            </p>
          ),
        },
        {
          heading: "Billing Disputes",
          body: (
            <p>
              If you have a question about a charge, contact us before initiating a chargeback with
              your bank or card issuer — most questions can be resolved directly and faster that
              way.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              For refund or billing questions, contact{" "}
              <a href={`mailto:${supportEmail}`} className="text-foreground underline underline-offset-2">
                {supportEmail}
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
