/**
 * Loading skeleton for card-grid pages (as opposed to `ListSkeleton`'s
 * table shape) — shared by every module whose loaded state is a grid of
 * cards rather than a list/table, so the grid geometry and header only
 * need to be tuned in one place.
 */
export function CardGridSkeleton({
  count = 6,
  cardClassName = "h-48",
  gridClassName = "sm:grid-cols-2 lg:grid-cols-3",
  subtitleWidth = "w-64",
  extraGrid,
}: {
  count?: number;
  cardClassName?: string;
  gridClassName?: string;
  subtitleWidth?: string;
  /** A second grid section below the main one, for pages with two distinct
   * skeleton regions (e.g. Integrations: provider cards + a smaller tile
   * grid) — kept optional rather than generalizing to an arbitrary list of
   * sections, since only one caller needs more than one grid. */
  extraGrid?: { count: number; cardClassName: string; gridClassName: string };
}) {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-6 w-40 rounded" />
        <div className={`bg-muted h-4 rounded ${subtitleWidth}`} />
      </div>
      <div className={`grid gap-4 ${gridClassName}`}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`bg-muted rounded-lg ${cardClassName}`} />
        ))}
      </div>
      {extraGrid && (
        <div className={`grid gap-4 ${extraGrid.gridClassName}`}>
          {Array.from({ length: extraGrid.count }, (_, i) => (
            <div key={i} className={`bg-muted rounded-lg ${extraGrid.cardClassName}`} />
          ))}
        </div>
      )}
    </div>
  );
}
