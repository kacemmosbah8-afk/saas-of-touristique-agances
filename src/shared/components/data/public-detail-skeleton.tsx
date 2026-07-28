/** Loading skeleton for public storefront detail pages (package/flight/hotel/activity/destination). */
export function PublicDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-10 sm:px-6">
      <div className="bg-muted mb-6 h-4 w-32 rounded" />
      <div className="bg-muted mb-6 aspect-[16/9] w-full rounded-xl" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="bg-muted h-7 w-64 rounded" />
          <div className="bg-muted h-4 w-40 rounded" />
        </div>
        <div className="bg-muted h-10 w-32 rounded-md" />
      </div>
      <div className="mt-8 space-y-2">
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-2/3 rounded" />
      </div>
    </div>
  );
}
