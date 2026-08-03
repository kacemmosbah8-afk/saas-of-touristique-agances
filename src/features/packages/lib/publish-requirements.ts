/**
 * A package is a customer-facing "program" — publishing one with no price,
 * no duration, no photos, or an empty itinerary is a broken listing, not a
 * lighter one. This is the single source of truth for what "complete
 * enough to publish" means, checked by `updatePackageStatusAction` before
 * any transition to PUBLISHED.
 */
export type PackagePublishInput = {
  sellingPrice: number | null;
  duration: number | null;
  coverImageUrl: string | null;
  imageCount: number;
  activityCount: number;
};

export function getMissingPublishRequirements(pkg: PackagePublishInput): string[] {
  const missing: string[] = [];
  if (pkg.sellingPrice == null) missing.push("a price");
  if (pkg.duration == null) missing.push("a duration");
  if (pkg.coverImageUrl == null && pkg.imageCount === 0) missing.push("at least one picture");
  if (pkg.activityCount === 0) missing.push("at least one itinerary activity");
  return missing;
}
