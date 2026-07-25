export default function HomeLoading() {
  return (
    <div className="animate-pulse">
      <div className="bg-muted h-[420px] w-full sm:h-[520px]" />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-6 flex items-center justify-between">
          <div className="bg-muted h-6 w-40 rounded" />
          <div className="bg-muted h-4 w-16 rounded" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
    </div>
  );
}
