import Link from "next/link";
import type { Metadata } from "next";

import { PageHero } from "@/features/marketing/components/page-hero";
import { FeatureCard } from "@/features/marketing/components/feature-card";
import { FEATURES } from "@/features/marketing/lib/features-content";
import { Button } from "@/shared/components/ui/button";

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

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/contact">Request a demo</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
