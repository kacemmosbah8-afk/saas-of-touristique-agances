import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { TRIAL_LENGTH_DAYS } from "@/features/billing/lib/status";
import { PageHero } from "@/features/marketing/components/page-hero";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

export const metadata: Metadata = {
  title: "Pricing — TravelOS",
  description: "Simple, transparent pricing for travel agencies of every size — start free, upgrade as your team grows.",
  alternates: { canonical: "/pricing" },
};

// Reflects live Plan rows, not a build-time snapshot — a plan or price
// change should show up without waiting for a redeploy.
export const dynamic = "force-dynamic";

const FEATURE_LABELS: Record<string, string> = {
  core: "Bookings, quotes & invoicing",
  supplier_execution: "Live supplier execution (Duffel)",
  priority_support: "Priority support",
};

// Presentation-only descriptors keyed by plan code — the catalog itself
// (names, prices, seats, features) still comes straight from the database.
const PLAN_TAGLINES: Record<string, string> = {
  starter: "For solo agents and small teams getting organized.",
  professional: "For agencies that book directly with live suppliers.",
  enterprise: "For large teams that need unlimited seats and priority support.",
};

function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default async function PricingPage() {
  // Real plan catalog, not duplicated marketing copy — see features/billing.
  // The trial plan is every signup's automatic starting state, not a
  // separately-chosen tier, so it's excluded from the pricing grid itself.
  const plans = await prisma.plan.findMany({
    where: { active: true, code: { not: "trial" } },
    orderBy: { priceAmount: "asc" },
  });

  // Visually anchor one plan: "professional" when present, otherwise the
  // middle tier by price. A recommendation, not a fabricated popularity claim.
  const highlightedCode = plans.some((p) => p.code === "professional")
    ? "professional"
    : plans[Math.floor((plans.length - 1) / 2)]?.code;

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple, transparent pricing"
        description={`Every plan starts with a ${TRIAL_LENGTH_DAYS}-day free trial. No credit card required to get started.`}
      />

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const highlighted = plan.code === highlightedCode;
            return (
              <Card
                key={plan.code}
                className={cn(
                  "flex flex-col gap-4 transition-shadow duration-200",
                  highlighted
                    ? "ring-primary border-primary/40 shadow-sm ring-1"
                    : "shadow-none hover:shadow-sm",
                )}
              >
                <CardHeader className="gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {highlighted && (
                      <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                  {PLAN_TAGLINES[plan.code] && (
                    <p className="text-muted-foreground text-sm">{PLAN_TAGLINES[plan.code]}</p>
                  )}
                  <p className="mt-3 text-4xl font-semibold tracking-tight">
                    {formatPrice(Number(plan.priceAmount), plan.priceCurrency)}
                    {Number(plan.priceAmount) > 0 && (
                      <span className="text-muted-foreground text-base font-normal">
                        {" "}
                        / {plan.billingInterval === "YEAR" ? "year" : "month"}
                      </span>
                    )}
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2.5 text-sm">
                    <li className="flex items-start gap-2.5">
                      <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>
                        {plan.seatLimit == null ? "Unlimited seats" : `Up to ${plan.seatLimit} seats`}
                      </span>
                    </li>
                    {plan.features.map((key) => (
                      <li key={key} className="flex items-start gap-2.5">
                        <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                        <span>{FEATURE_LABELS[key] ?? key}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant={highlighted ? "default" : "outline"}>
                    <Link href="/sign-up">Start free trial</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <p className="text-muted-foreground mt-10 text-center text-sm">
          Need a custom deal or a plan activated for your team without entering payment details?{" "}
          <Link href="/contact" className="text-foreground underline underline-offset-2">
            Contact us
          </Link>
          .
        </p>
      </section>
    </>
  );
}
