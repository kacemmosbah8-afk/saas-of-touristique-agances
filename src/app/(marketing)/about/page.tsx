import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/features/marketing/components/page-hero";

export const metadata: Metadata = {
  title: "About — TravelOS",
  description: "Why TravelOS exists and what it's built to do for travel agencies.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Why we&apos;re building TravelOS"
        description="One system of record for the booking lifecycle — built around how agencies actually operate."
        image={{ src: "/images/marketing/hero-cologne.jpg", alt: "Cologne Cathedral spires silhouetted against a warm sunset sky" }}
      />

      <section className="mx-auto max-w-3xl px-6 pb-20 sm:pb-24">
        <div className="space-y-6 text-base leading-relaxed">
          <p>
            Travel agencies run on a patchwork: a spreadsheet for quotes, a separate inbox for
            supplier confirmations, and no single place that ties a customer&apos;s trip together.
            TravelOS exists to close that gap — one system of record for the whole booking
            lifecycle, from a customer&apos;s first quote to a supplier-confirmed reservation.
          </p>
          <p>
            We built TravelOS around the way agencies actually operate: multiple team members with
            different responsibilities and real supplier relationships that need live pricing and
            availability. That shows up directly in the product — explicit, per-role permissions
            instead of one shared login, and live searches against real supplier systems instead
            of stale cached inventory.
          </p>
          <p>
            TravelOS is under active development. We&apos;d rather ship something real and keep
            building in the open than promise features that don&apos;t exist yet — if you want to
            know exactly what&apos;s live today, the{" "}
            <Link href="/features" className="text-foreground underline underline-offset-2">
              Features
            </Link>{" "}
            page reflects what&apos;s actually in the product, not a roadmap.
          </p>
        </div>
      </section>
    </>
  );
}
