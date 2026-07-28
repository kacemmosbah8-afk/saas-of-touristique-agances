/** Generic list-page loading skeleton shared by every module's loading.tsx. */
export function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="bg-muted h-6 w-28 rounded" />
          <div className="bg-muted h-4 w-40 rounded" />
        </div>
        <div className="bg-muted h-8 w-32 rounded-md" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="bg-muted h-9 min-w-[200px] flex-1 rounded-md" />
        <div className="bg-muted h-9 w-36 rounded-md" />
        <div className="bg-muted h-9 w-40 rounded-md" />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/40 h-11 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-t px-4 py-3">
            <div className="bg-muted size-10 shrink-0 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="bg-muted h-4 w-48 rounded" />
              <div className="bg-muted h-3 w-24 rounded" />
            </div>
            <div className="bg-muted h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
