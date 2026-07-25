import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { LEGAL_EFFECTIVE_DATE } from "@/features/marketing/lib/legal-constants";
import { LegalDocument } from "@/features/marketing/components/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy — One To One",
  description: "How One To One collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const { name, companyLegalName, supportEmail } = siteConfig;

  return (
    <LegalDocument
      title="Privacy Policy"
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      intro={
        <p>
          This Privacy Policy explains how {companyLegalName} (&ldquo;{name}&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) collects, uses, and protects your information when you visit this
          website or submit a booking request.
        </p>
      }
      sections={[
        {
          heading: "Information We Collect",
          body: (
            <>
              <p>
                <strong>Booking request information.</strong> Your name, email, phone number,
                number of travelers, preferred travel dates, and any notes you provide when you
                request a package, flight, hotel, or activity.
              </p>
              <p>
                <strong>Communications.</strong> Messages you send us through the contact form or
                WhatsApp, and our replies.
              </p>
              <p>
                <strong>Usage data.</strong> Basic technical information about how the site is
                used (pages visited, browser type, approximate location) for security and to
                understand what our visitors are interested in.
              </p>
              <p>
                <strong>Cookies.</strong> See our{" "}
                <Link href="/cookie-policy" className="text-foreground underline underline-offset-2">
                  Cookie Policy
                </Link>{" "}
                for details on the cookies this site uses.
              </p>
            </>
          ),
        },
        {
          heading: "How We Use Your Information",
          body: (
            <p>
              We use your information to respond to booking requests and inquiries, confirm
              availability and pricing with our suppliers on your behalf, communicate with you
              about your trip, and improve our website and offerings. We do not sell your personal
              information.
            </p>
          ),
        },
        {
          heading: "How We Share Information",
          body: (
            <>
              <p>We share information only as needed to arrange your trip, including with:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Airlines, hotels, and other travel suppliers, limited to what&apos;s needed to
                  confirm your booking.
                </li>
                <li>Our website hosting and email providers, who help us operate this site.</li>
                <li>Authorities, where required by law.</li>
              </ul>
              <p>We do not share your information with third parties for their own marketing.</p>
            </>
          ),
        },
        {
          heading: "Data Retention",
          body: (
            <p>
              We keep booking and inquiry records for as long as reasonably needed to provide our
              service and meet legal, tax, or accounting obligations, after which we delete or
              anonymize it.
            </p>
          ),
        },
        {
          heading: "Your Rights",
          body: (
            <p>
              You may ask us to access, correct, or delete the personal information we hold about
              you by contacting us using the details below.
            </p>
          ),
        },
        {
          heading: "Data Security",
          body: (
            <p>
              We use reasonable technical and organizational measures to protect your information
              against unauthorized access, alteration, or disclosure. No method of transmission or
              storage is completely secure, and we cannot guarantee absolute security.
            </p>
          ),
        },
        {
          heading: "Changes to This Policy",
          body: (
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              reflected by updating the effective date above.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about this Privacy Policy can be sent to{" "}
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
