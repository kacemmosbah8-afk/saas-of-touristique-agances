import { CardGridSkeleton } from "@/shared/components/data/card-grid-skeleton";

export default function ProvidersLoading() {
  return <CardGridSkeleton count={6} cardClassName="h-48" gridClassName="sm:grid-cols-2 lg:grid-cols-3" />;
}
