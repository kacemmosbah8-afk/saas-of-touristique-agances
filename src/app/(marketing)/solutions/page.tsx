import type { Metadata } from "next";
import { Building2, Users2, Globe2, Briefcase } from "lucide-react";

import { PageHero } from "@/features/marketing/components/page-hero";
import { FeatureCard } from "@/features/marketing/components/feature-card";

export const metadata: Metadata = {
  title: "Solutions — TravelOS",
  description: "How TravelOS fits independent agencies, multi-branch agencies, tour operators, and corporate travel teams.",
  alternates: { canonical: "/solutions" },
};

const SOLUTIONS = [
  {
    icon: Users2,
    title: "Independent travel agencies",
    description:
      "Replace a patchwork of spreadsheets and email threads with one place to build quotes, book with real suppliers, and get paid — without hiring an ops team to run it.",
  },
  {
    icon: Building2,
    title: "Multi-branch & franchise agencies",
    description:
      "Give every branch its own isolated workspace while keeping consistent roles, permissions, and processes across the group. One platform, many agencies, no shared spreadsheet risk.",
  },
  {
    icon: Globe2,
    title: "Tour operators",
    description:
      "Manage packages, itineraries, and inventory alongside live flight and hotel search — so a custom itinerary and a supplier-sourced flight live in the same booking record.",
  },
  {
    icon: Briefcase,
    title: "Corporate travel management",
    description:
      "Role-based access (Owner, Admin, Agent, Accountant, Read-only) and a full invoicing and payment ledger make it straightforward to separate booking work from financial oversight.",
  },
];

export default function SolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Solutions"
        title="Built for how travel businesses actually operate"
        description="Whether you're a solo agent or run branches across a region, TravelOS adapts to your team structure without you having to adapt to it."
        image={{ src: "/images/marketing/hero-bora-bora.jpg", alt: "Palm trees framing a dramatic sunset over Bora Bora's mountain silhouette" }}
      />

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {SOLUTIONS.map((solution, index) => (
            <FeatureCard key={solution.title} {...solution} index={index} />
          ))}
        </div>
      </section>
    </>
  );
}
