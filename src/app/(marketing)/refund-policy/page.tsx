import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { TRIAL_LENGTH_DAYS } from "@/features/billing/lib/status";
import { LEGAL_EFFECTIVE_DATE } from "@/features/marketing/lib/legal-constants";
import { LegalDocument } from "@/features/marketing/components/legal-document";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — TravelOS",
  description: "How subscription billing, cancellation, and refunds work for TravelOS.",
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
          This policy explains how cancellation and refunds work for a {name} subscription — the
          fee your Workspace pays us to use the platform. It does not cover the cancellation or
          refund terms your agency offers its own customers for their travel bookings; those are
          configured by each Workspace in the product itself and are entirely your agency&apos;s
          own policy toward your customers.
        </p>
      }
      sections={[
        {
          heading: "Free Trial",
          body: (
            <p>
              Every new Workspace starts on a {TRIAL_LENGTH_DAYS}-day free trial. No payment
              information is required to start a trial, and you will not be charged unless you
              actively choose to activate a paid plan.
            </p>
          ),
        },
        {
          heading: "Subscription Cancellation",
          body: (
            <p>
              A Workspace Owner can cancel a paid subscription at any time from the Workspace&apos;s
              billing settings. Cancelling stops future billing; it does not automatically delete
              your Workspace&apos;s data, which remains subject to our{" "}
              <Link href="/privacy" className="text-foreground underline underline-offset-2">
                Privacy Policy
              </Link>
              &apos;s retention terms.
            </p>
          ),
        },
        {
          heading: "Refunds",
          body: (
            <p>
              Subscription fees are billed in advance for the billing period selected and are
              generally non-refundable for the remainder of a billing period once charged. If you
              believe you were charged in error — for example, a duplicate charge or a charge after
              you cancelled — contact us and we will review and correct it. We consider refund
              requests made shortly after a new charge on a case-by-case basis.
            </p>
          ),
        },
        {
          heading: "Downgrades & Seat Changes",
          body: (
            <p>
              You can change plans at any time from your Workspace&apos;s billing settings. A
              downgrade that would put your Workspace over the new plan&apos;s seat limit requires
              explicit confirmation before it takes effect — no seats or team members are removed
              automatically. Plan changes take effect immediately; we do not currently prorate the
              difference for a change made mid-billing-period.
            </p>
          ),
        },
        {
          heading: "Billing Disputes",
          body: (
            <p>
              If you have a question about a charge, contact us before initiating a chargeback with
              your bank or card issuer — most billing questions can be resolved directly and faster
              that way.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              For billing or cancellation questions, contact{" "}
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
