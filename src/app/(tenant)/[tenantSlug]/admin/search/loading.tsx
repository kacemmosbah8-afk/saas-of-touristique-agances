export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-6 w-24 rounded" />
        <div className="bg-muted h-4 w-48 rounded" />
      </div>

      <div className="bg-muted h-10 w-full rounded-md" />

      <div className="space-y-6">
        {[1, 2].map((group) => (
          <section key={group} className="space-y-2">
            <div className="bg-muted h-3 w-20 rounded" />
            <div className="divide-y rounded-lg border">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center justify-between px-4 py-3">
                  <div className="bg-muted h-4 w-40 rounded" />
                  <div className="bg-muted h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
