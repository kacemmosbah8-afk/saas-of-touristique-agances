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

      <section className="mx-auto max-w-3xl px-6 pb-20 sm:pb-24">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="gap-4 shadow-none transition-shadow duration-200 hover:shadow-sm">
            <CardContent className="space-y-3">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <Mail className="size-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold">Support</p>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2 transition-colors"
                >
                  {siteConfig.supportEmail}
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-4 shadow-none transition-shadow duration-200 hover:shadow-sm">
            <CardContent className="space-y-3">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <MapPin className="size-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold">{siteConfig.companyLegalName}</p>
                <p className="text-muted-foreground text-sm">{siteConfig.companyAddress}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
