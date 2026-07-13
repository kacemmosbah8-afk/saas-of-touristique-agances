import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";

import { siteConfig } from "@/features/marketing/lib/site-config";
import { PageHero } from "@/features/marketing/components/page-hero";
import { Card, CardContent } from "@/shared/components/ui/card";

export const metadata: Metadata = {
  title: "Contact — TravelOS",
  description: "Get in touch with the TravelOS team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Get in touch"
        description="Questions about TravelOS, a plan, or an existing account? Reach us directly — a real person reads every message."
      />

      <section className="mx-auto max-w-2xl px-6 pb-24">
        <Card>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="text-primary mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-medium">Support</p>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2"
                >
                  {siteConfig.supportEmail}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="text-primary mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-medium">{siteConfig.companyLegalName}</p>
                <p className="text-muted-foreground text-sm">{siteConfig.companyAddress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
