import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { LEGAL_EFFECTIVE_DATE } from "@/features/marketing/lib/legal-constants";
import { LegalDocument } from "@/features/marketing/components/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service — One One Tourism",
  description: "The terms that govern booking travel through One One Tourism.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const { name, companyLegalName, supportEmail } = siteConfig;

  return (
    <LegalDocument
      title="Terms of Service"
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      intro={
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the {name} website and
          any package, flight, hotel, or activity you request through it. {name} is operated by{" "}
          {companyLegalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By
          submitting a booking request or otherwise using this site, you agree to these Terms.
        </p>
      }
      sections={[
        {
          heading: "Booking Requests",
          body: (
            <p>
              Submitting a booking request through this website is an inquiry, not a confirmed
              reservation. No payment is collected at the time you submit a request. A member of
              our team will contact you to confirm final availability, pricing, and travel details
              before any booking or payment is finalized.
            </p>
          ),
        },
        {
          heading: "Pricing",
          body: (
            <p>
              Prices shown on this website are indicative and may change based on availability,
              travel dates, number of travelers, and supplier pricing at the time of confirmation.
              The final price is the one we confirm with you directly before you commit to a
              booking.
            </p>
          ),
        },
        {
          heading: "Third-Party Suppliers",
          body: (
            <p>
              Flights, hotels, transport, and activities are provided by independent third-party
              suppliers (airlines, hotels, and local operators). Those suppliers&apos; own
              conditions — including their cancellation, baggage, and check-in policies — apply to
              your booking in addition to these Terms. We act as your agent in arranging these
              services and are not the supplier of the underlying travel service itself.
            </p>
          ),
        },
        {
          heading: "Your Information",
          body: (
            <p>
              You&apos;re responsible for providing accurate traveler information (names, contact
              details, travel dates, and any document details a supplier requires, such as passport
              information). Delays or errors caused by inaccurate information you provided are your
              responsibility.
            </p>
          ),
        },
        {
          heading: "Cancellations & Changes",
          body: (
            <p>
              See our{" "}
              <Link href="/refund-policy" className="text-foreground underline underline-offset-2">
                Refund &amp; Cancellation Policy
              </Link>{" "}
              for how changes and cancellations are handled once a booking is confirmed.
            </p>
          ),
        },
        {
          heading: "Website Use",
          body: (
            <p>
              You agree not to use this website to violate applicable law, submit false
              information, or attempt to disrupt the site&apos;s normal operation.
            </p>
          ),
        },
        {
          heading: "Changes to These Terms",
          body: (
            <p>
              We may update these Terms from time to time; the effective date above reflects the
              latest revision. Continued use of the site after a change takes effect means you
              accept the revised Terms.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about these Terms can be sent to{" "}
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
