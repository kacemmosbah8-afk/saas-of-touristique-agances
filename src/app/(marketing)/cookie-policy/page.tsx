import type { Metadata } from "next";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { LEGAL_EFFECTIVE_DATE } from "@/features/marketing/lib/legal-constants";
import { LegalDocument } from "@/features/marketing/components/legal-document";

export const metadata: Metadata = {
  title: "Cookie Policy — One To One",
  description: "How One To One uses cookies.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  const { name, supportEmail } = siteConfig;

  return (
    <LegalDocument
      title="Cookie Policy"
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      intro={<p>This policy explains how {name} uses cookies and similar technologies.</p>}
      sections={[
        {
          heading: "What Are Cookies",
          body: (
            <p>
              Cookies are small text files a website stores on your device to remember information
              between requests, such as keeping you signed in.
            </p>
          ),
        },
        {
          heading: "Cookies We Use",
          body: (
            <>
              <p>
                {name} currently uses only <strong>strictly necessary cookies</strong> — the kind
                required for the Service to function, primarily authentication session cookies that
                keep you signed in and protect against cross-site request forgery. We do not
                currently use third-party analytics, advertising, or tracking cookies.
              </p>
              <p>
                If that changes — for example, if we add product analytics in the future — we will
                update this policy and, where required by law, request your consent before setting
                any non-essential cookie.
              </p>
            </>
          ),
        },
        {
          heading: "Managing Cookies",
          body: (
            <p>
              Because {name} relies on strictly necessary cookies to keep you signed in, blocking
              them will prevent the Service from working correctly. Most browsers let you view,
              manage, and delete cookies through their settings if you want to control this at the
              browser level.
            </p>
          ),
        },
        {
          heading: "Changes to This Policy",
          body: (
            <p>
              We may update this Cookie Policy as the Service evolves. Material changes will be
              reflected by updating the effective date above.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about this Cookie Policy can be sent to{" "}
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
