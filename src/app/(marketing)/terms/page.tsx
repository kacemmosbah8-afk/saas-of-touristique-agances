import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { LEGAL_EFFECTIVE_DATE } from "@/features/marketing/lib/legal-constants";
import { LegalDocument } from "@/features/marketing/components/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service — TravelOS",
  description: "The terms that govern use of TravelOS.",
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
          These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of {name}, the
          software platform operated by {companyLegalName} (&ldquo;{name}&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By creating an account, accessing, or using{" "}
          {name}, you agree to be bound by these Terms. If you are agreeing on behalf of an
          organization, you represent that you have authority to bind that organization, and
          &ldquo;you&rdquo; refers to both you and that organization.
        </p>
      }
      sections={[
        {
          heading: "The Service",
          body: (
            <p>
              {name} is a multi-tenant software platform that helps travel agencies manage quotes,
              bookings, invoicing, supplier connections, and related business operations
              (&ldquo;the Service&rdquo;). Each customer operates within its own isolated workspace
              (&ldquo;Workspace&rdquo;). We may add, change, or remove features of the Service at
              any time; we will not materially reduce the core functionality of a paid plan during
              an active billing period without notice.
            </p>
          ),
        },
        {
          heading: "Accounts & Workspaces",
          body: (
            <>
              <p>
                You must provide accurate information when creating an account and keep your
                credentials confidential. You are responsible for all activity that occurs under
                your account and within your Workspace, including activity by teammates you invite.
              </p>
              <p>
                Access within a Workspace is controlled by roles (such as Owner, Admin, Agent,
                Accountant, and Read-only) that determine what each team member can view or change.
                The Workspace Owner is responsible for assigning roles appropriately and for all
                actions taken by users with access to the Workspace.
              </p>
            </>
          ),
        },
        {
          heading: "Subscriptions, Trials & Billing",
          body: (
            <>
              <p>
                Paid plans are billed on a subscription basis as described on our{" "}
                <Link href="/pricing" className="text-foreground underline underline-offset-2">
                  Pricing
                </Link>{" "}
                page. New Workspaces begin on a free trial; no payment is collected until you
                actively choose to activate a paid plan. Fees are billed in advance for the billing
                period selected and, except as described in our{" "}
                <Link href="/refund-policy" className="text-foreground underline underline-offset-2">
                  Refund &amp; Cancellation Policy
                </Link>
                , are non-refundable.
              </p>
              <p>
                We may work with third-party payment providers to process subscription payments.
                Your use of a payment provider is also subject to that provider&apos;s own terms.
                We do not store your full payment card details ourselves.
              </p>
            </>
          ),
        },
        {
          heading: "Your Data",
          body: (
            <>
              <p>
                You retain all rights to the data you or your team submit to the Service, including
                customer records, booking details, and traveller information (&ldquo;Customer
                Data&rdquo;). You grant us a limited license to host, process, and display Customer
                Data solely to provide and support the Service.
              </p>
              <p>
                You are responsible for ensuring you have the right to submit any personal data
                (including your own customers&apos; and travellers&apos; data) into the Service, and
                for complying with applicable data protection law in how you collect and use it.
                See our{" "}
                <Link href="/privacy" className="text-foreground underline underline-offset-2">
                  Privacy Policy
                </Link>{" "}
                for how we handle data.
              </p>
            </>
          ),
        },
        {
          heading: "Third-Party Suppliers & Integrations",
          body: (
            <p>
              The Service can connect to third-party travel suppliers and providers (for example,
              flight and hotel inventory sources) to search availability and, where you choose to
              use it, request supplier bookings on your behalf. Those suppliers are independent
              from {name}, and any booking, fare, availability, or cancellation terms they offer are
              between you (or your customer) and that supplier. We are not a party to, and are not
              responsible for, the fulfillment of third-party supplier bookings.
            </p>
          ),
        },
        {
          heading: "Acceptable Use",
          body: (
            <p>
              You agree not to use the Service to violate applicable law, infringe another
              party&apos;s rights, transmit malicious code, attempt to gain unauthorized access to
              any part of the Service or another Workspace&apos;s data, or interfere with the
              Service&apos;s normal operation, including through excessive automated requests.
            </p>
          ),
        },
        {
          heading: "Intellectual Property",
          body: (
            <p>
              {name}, its logo, and the software underlying the Service are owned by{" "}
              {companyLegalName} and protected by intellectual property law. These Terms do not
              grant you any right to use our trademarks or branding without prior written consent.
            </p>
          ),
        },
        {
          heading: "Termination",
          body: (
            <p>
              You may stop using the Service and cancel your subscription at any time as described
              in our{" "}
              <Link href="/refund-policy" className="text-foreground underline underline-offset-2">
                Refund &amp; Cancellation Policy
              </Link>
              . We may suspend or terminate access to the Service for a Workspace that materially
              breaches these Terms, fails to pay applicable fees, or where required by law, with
              notice where reasonably practicable.
            </p>
          ),
        },
        {
          heading: "Disclaimers & Limitation of Liability",
          body: (
            <p>
              The Service is provided &ldquo;as is&rdquo; without warranties of any kind, express or
              implied, to the maximum extent permitted by law. To the maximum extent permitted by
              law, {companyLegalName} will not be liable for indirect, incidental, special,
              consequential, or punitive damages, or for lost profits or revenue, arising from your
              use of the Service. Nothing in these Terms limits liability that cannot be limited
              under applicable law.
            </p>
          ),
        },
        {
          heading: "Governing Law",
          body: (
            <p>
              These Terms are governed by the laws of the jurisdiction in which{" "}
              {companyLegalName} is registered, without regard to conflict-of-law principles,
              except where applicable consumer protection law requires otherwise.
            </p>
          ),
        },
        {
          heading: "Changes to These Terms",
          body: (
            <p>
              We may update these Terms from time to time. If we make material changes, we will
              update the effective date above and, where appropriate, notify Workspace Owners.
              Continued use of the Service after changes take effect constitutes acceptance of the
              revised Terms.
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
