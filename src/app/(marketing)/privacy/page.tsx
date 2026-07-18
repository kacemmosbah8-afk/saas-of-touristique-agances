import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { LEGAL_EFFECTIVE_DATE } from "@/features/marketing/lib/legal-constants";
import { LegalDocument } from "@/features/marketing/components/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy — TravelOS",
  description: "How TravelOS collects, uses, and protects information.",
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
          &ldquo;us&rdquo;) collects, uses, and shares information when you use {name} (&ldquo;the
          Service&rdquo;). It covers both information about you as a user of the Service, and, at a
          high level, our role as a data processor for the customer data your Workspace stores.
        </p>
      }
      sections={[
        {
          heading: "Information We Collect",
          body: (
            <>
              <p>
                <strong>Account information.</strong> Name, email address, and authentication
                details when you create an account or sign in.
              </p>
              <p>
                <strong>Workspace &amp; Customer Data.</strong> Information you or your team enter
                into the Service on behalf of your travel agency — including your own customers&apos;
                and travellers&apos; names, contact details, passport information you choose to
                store, booking records, and communications sent through the Service.
                For this data, your Workspace is the data controller and {name} acts as a data
                processor on your instructions.
              </p>
              <p>
                <strong>Usage data.</strong> Information about how the Service is used, such as
                pages visited, actions taken, and log data (IP address, browser type, timestamps),
                collected for security, reliability, and product improvement.
              </p>
              <p>
                <strong>Cookies.</strong> See our{" "}
                <Link href="/cookie-policy" className="text-foreground underline underline-offset-2">
                  Cookie Policy
                </Link>{" "}
                for details on the cookies the Service uses.
              </p>
            </>
          ),
        },
        {
          heading: "How We Use Information",
          body: (
            <p>
              We use information to provide and maintain the Service, authenticate users and
              enforce access controls within a Workspace, process your license fee, send
              transactional communications (such as invitations and booking confirmations you or
              the Service trigger), maintain security and prevent abuse, and understand how the
              Service is used so we can improve it. We do not sell personal information.
            </p>
          ),
        },
        {
          heading: "How We Share Information",
          body: (
            <>
              <p>We share information only as needed to operate the Service, including with:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Infrastructure and hosting providers that run the Service.</li>
                <li>
                  An email delivery provider, to send transactional messages you or your Workspace
                  trigger (such as team invitations and booking notifications).
                </li>
                <li>
                  Travel suppliers you or your team choose to search or book through, limited to
                  what&apos;s needed to complete that search or booking request.
                </li>
                <li>A payment provider, to process the one-time license fee.</li>
                <li>Professional advisors or authorities, where required by law.</li>
              </ul>
              <p>We do not share Customer Data with third parties for their own marketing purposes.</p>
            </>
          ),
        },
        {
          heading: "Data Retention",
          body: (
            <p>
              We retain account and Workspace data for as long as the Workspace remains active, and
              for a reasonable period afterward to comply with legal, tax, and audit obligations or
              to resolve disputes. Data associated with a Workspace is deleted or anonymized after
              account closure, except where we are required to retain it by law.
            </p>
          ),
        },
        {
          heading: "Your Rights",
          body: (
            <p>
              Depending on where you are located, you may have rights to access, correct, export, or
              delete your personal information, or to object to or restrict certain processing. If
              your data was submitted to the Service by a travel agency using {name} (for example,
              as one of their customers or travellers), please contact that agency directly, as they
              control that data. For requests about your own account, contact us using the details
              below.
            </p>
          ),
        },
        {
          heading: "Data Security",
          body: (
            <p>
              We use technical and organizational measures designed to protect information against
              unauthorized access, alteration, disclosure, or destruction, including per-Workspace
              data isolation, encryption of sensitive stored credentials, and role-based access
              controls. No method of transmission or storage is completely secure, and we cannot
              guarantee absolute security.
            </p>
          ),
        },
        {
          heading: "International Data Transfers",
          body: (
            <p>
              Information may be processed in countries other than your own. Where required, we rely
              on appropriate safeguards for such transfers as recognized under applicable data
              protection law.
            </p>
          ),
        },
        {
          heading: "Children's Privacy",
          body: (
            <p>
              The Service is intended for business use by travel agencies and their staff, and is
              not directed to children. We do not knowingly collect personal information directly
              from children.
            </p>
          ),
        },
        {
          heading: "Changes to This Policy",
          body: (
            <p>
              We may update this Privacy Policy from time to time. Material changes will be reflected
              by updating the effective date above.
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
