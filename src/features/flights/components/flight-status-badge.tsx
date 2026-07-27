import { Badge } from "@/shared/components/ui/badge";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

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
  const dict = getAdminDictionary(locale).flights;
  const labels: Record<"DRAFT" | "PUBLISHED" | "ARCHIVED", string> = {
    DRAFT: dict.statusDraft,
    PUBLISHED: dict.statusPublished,
    ARCHIVED: dict.statusArchived,
  };
  return <Badge variant={VARIANTS[status]}>{labels[status]}</Badge>;
}
