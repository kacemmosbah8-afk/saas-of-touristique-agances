import type { Metadata } from "next";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { LEGAL_EFFECTIVE_DATE } from "@/features/marketing/lib/legal-constants";
import { LegalDocument } from "@/features/marketing/components/legal-document";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — One One Tourism",
  description: "How cancellations and refunds work for trips booked through One One Tourism.",
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
          This policy explains how cancellations and refunds work for packages, flights, hotels,
          and activities booked through {name}. It applies once a booking has been confirmed with
          you directly — submitting a booking request on the website is never itself a charge.
        </p>
      }
      sections={[
        {
          heading: "Before Confirmation",
          body: (
            <p>
              A booking request submitted through this website is an inquiry only. No payment is
              taken and no cancellation fee applies until we&apos;ve confirmed final availability,
              pricing, and travel details with you and you&apos;ve agreed to proceed.
            </p>
          ),
        },
        {
          heading: "After Confirmation",
          body: (
            <p>
              Once a booking is confirmed, cancellation and change terms depend on the specific
              suppliers involved (airline, hotel, or activity operator) — each may have its own
              refundability, change fees, and deadlines, which we&apos;ll communicate to you at the
              time of confirmation. Where a supplier allows a refund, we pass it on to you, less
              any non-recoverable fees the supplier itself withholds.
            </p>
          ),
        },
        {
          heading: "Our Service Fee",
          body: (
            <p>
              Where applicable, our own service fee for arranging a booking is disclosed to you
              before confirmation and is separate from supplier cancellation terms.
            </p>
          ),
        },
        {
          heading: "How to Request a Cancellation",
          body: (
            <p>
              Contact us as early as possible — by phone, WhatsApp, or email — so we can act before
              supplier deadlines pass. Earlier requests generally mean lower fees and better refund
              odds.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              For cancellation or refund questions, contact{" "}
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
