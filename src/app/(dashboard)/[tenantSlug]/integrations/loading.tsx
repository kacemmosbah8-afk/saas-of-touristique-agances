import { CardGridSkeleton } from "@/shared/components/data/card-grid-skeleton";

export default function IntegrationsLoading() {
  return (
    <CardGridSkeleton
      count={3}
      cardClassName="h-64"
      gridClassName="lg:grid-cols-3"
      subtitleWidth="w-72"
      extraGrid={{ count: 6, cardClassName: "h-16", gridClassName: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" }}
    />
  );
}
