import Link from "next/link";
import type { Metadata } from "next";

import { PageHero } from "@/features/marketing/components/page-hero";
import { FEATURES } from "@/features/marketing/lib/features-content";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";

export const metadata: Metadata = {
  title: "TravelOS — The Operating System for Travel Agencies",
  description:
    "TravelOS is the operating system travel agencies run their business on — bookings, quotes, invoicing, supplier integrations, and team collaboration in one platform.",
  alternates: { canonical: "/" },
};

const highlights = FEATURES.filter((f) => f.highlight);

export default function MarketingHomePage() {
  return (
    <>
      <PageHero
        eyebrow="Built for travel agencies"
        title="The Operating System for Travel Agencies"
        description="Quotes, bookings, invoicing, live supplier search, and your whole team — in one platform, not six disconnected tools."
      >
        <Button asChild size="lg">
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pricing">See pricing</Link>
        </Button>
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((feature) => (
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
        <div className="mt-10 text-center">
          <Button asChild variant="ghost">
            <Link href="/features">See everything TravelOS does →</Link>
          </Button>
        </div>
      </section>

      <section className="border-border/60 border-t">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Run your agency on one platform, not a patchwork of spreadsheets and inboxes.
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            TravelOS connects your suppliers, your customer records, and your finances so nothing
            gets lost between a quote and a paid, confirmed booking.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
