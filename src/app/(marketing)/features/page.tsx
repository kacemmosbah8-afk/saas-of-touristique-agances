import type { Metadata } from "next";

import { PageHero } from "@/features/marketing/components/page-hero";
import { FEATURES } from "@/features/marketing/lib/features-content";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";

export const metadata: Metadata = {
  title: "Features — TravelOS",
  description:
    "Everything TravelOS does for a travel agency: bookings, quotes, invoicing, live supplier search, CRM, team roles, and the automation running underneath it.",
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything your agency needs, in one operating system"
        description="TravelOS isn't a single tool bolted onto your existing process — it's the system of record for quotes, bookings, invoicing, suppliers, and your team."
      />

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="text-primary size-6" />
                <CardTitle className="mt-3">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
