/** Loading skeleton for public storefront list pages (packages, flights, hotels, activities, destinations). */
export function PublicGridSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-2">
        <div className="bg-muted h-7 w-48 rounded" />
        <div className="bg-muted h-4 w-32 rounded" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="overflow-hidden rounded-xl border">
            <div className="bg-muted aspect-[4/3] w-full" />
            <div className="space-y-2 p-4">
              <div className="bg-muted h-4 w-3/4 rounded" />
              <div className="bg-muted h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
