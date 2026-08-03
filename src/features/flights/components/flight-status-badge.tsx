import { Badge } from "@/shared/components/ui/badge";
import { type Locale } from "@/shared/i18n/dictionary";
import { getFlightsDict } from "@/shared/i18n/admin-dictionary/flights";

const VARIANTS: Record<"DRAFT" | "PUBLISHED" | "ARCHIVED", "secondary" | "default" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
};

export function FlightStatusBadge({
  status,
  locale,
}: {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  locale: Locale;
}) {
  const dict = getFlightsDict(locale);
  const labels: Record<"DRAFT" | "PUBLISHED" | "ARCHIVED", string> = {
    DRAFT: dict.statusDraft,
    PUBLISHED: dict.statusPublished,
    ARCHIVED: dict.statusArchived,
  };
  return <Badge variant={VARIANTS[status]}>{labels[status]}</Badge>;
}
