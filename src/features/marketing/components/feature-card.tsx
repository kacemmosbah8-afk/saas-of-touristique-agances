import type { LucideIcon } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
};

/**
 * The one card idiom every marketing grid (home highlights, /features,
 * /solutions) renders with: icon in a primary-tinted square, quiet border,
 * subtle hover lift — so the pages stay visually consistent by construction.
 */
export function FeatureCard({ icon: Icon, title, description }: Props) {
  return (
    <Card className="gap-4 shadow-none transition-shadow duration-200 hover:shadow-sm">
      <CardHeader className="gap-3">
        <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
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
