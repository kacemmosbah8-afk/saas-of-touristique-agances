import type { LucideIcon } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Alternates the icon accent between the primary terracotta and the
   *  secondary sage — pass the grid position so a `.map()` reads as
   *  deliberate variety rather than one flat color repeated N times. */
  index?: number;
};

const ICON_ACCENTS = [
  "bg-primary/10 text-primary",
  "bg-brand-sage/10 text-brand-sage",
] as const;

/**
 * The one card idiom every marketing grid (home highlights, /features,
 * /solutions) renders with: icon in a tinted square, quiet border,
 * subtle hover lift — so the pages stay visually consistent by construction.
 */
export function FeatureCard({ icon: Icon, title, description, index = 0 }: Props) {
  return (
    <Card className="gap-4 shadow-none transition-shadow duration-200 hover:shadow-sm">
      <CardHeader className="gap-3">
        <div
          className={`flex size-10 items-center justify-center rounded-lg ${ICON_ACCENTS[index % ICON_ACCENTS.length]}`}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
