import { Badge } from "@/shared/components/ui/badge";

const STATUS_CONFIG: Record<
  "DRAFT" | "PUBLISHED" | "ARCHIVED",
  { label: string; variant: "secondary" | "default" | "outline" }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  PUBLISHED: { label: "Published", variant: "default" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export function PackageStatusBadge({
  status,
}: {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
