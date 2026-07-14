import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { PageHero } from "@/features/marketing/components/page-hero";
import { FeatureCard } from "@/features/marketing/components/feature-card";
import { FEATURES } from "@/features/marketing/lib/features-content";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "TravelOS — The Operating System for Travel Agencies",
  description:
    "TravelOS is the operating system travel agencies run their business on — bookings, quotes, invoicing, supplier integrations, and team collaboration in one platform.",
  alternates: { canonical: "/" },
};

const highlights = FEATURES.filter((f) => f.highlight);

// Grounded in shipped capability (live supplier search, quote→booking
// conversion, booking-linked invoicing) — storytelling, not roadmap.
const WORKFLOW = [
  {
    step: "01",
    title: "Quote from live inventory",
    description:
      "Search real flight and hotel availability through Duffel and Hotelbeds, combine it with your own packages, and send a priced quote from one screen.",
  },
  {
    step: "02",
    title: "Convert and confirm",
    description:
      "Turn an accepted quote into a booking, revalidate supplier pricing before you commit, and keep every line item, status, and policy on one record.",
  },
  {
    step: "03",
    title: "Invoice and reconcile",
    description:
      "Issue the invoice straight from the booking and track deposits, installments, payments, and refunds — the ledger stays in step with the trip.",
  },
];

export default function MarketingHomePage() {
  return (
    <>
      <PageHero
        size="lg"
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

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Everything an agency runs on
          </h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Not a booking widget with extras bolted on — the system of record for the whole
            operation.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="ghost">
            <Link href="/features">
              See everything TravelOS does
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      <section className="border-border/60 border-t">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              From first enquiry to paid invoice
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              One booking lifecycle, one record — nothing gets lost between a quote and the money
              that moved for it.
            </p>
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {WORKFLOW.map((item) => (
              <div key={item.step}>
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg text-sm font-semibold tabular-nums">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24">
        <div className="border-border/60 bg-muted/40 rounded-2xl border px-6 py-16 text-center sm:px-12">
          <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-balance">
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
