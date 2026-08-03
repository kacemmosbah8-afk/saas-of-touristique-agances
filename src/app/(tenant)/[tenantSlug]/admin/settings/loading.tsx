export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-6 w-24 rounded" />
        <div className="bg-muted h-4 w-64 rounded" />
      </div>

      <div className="space-y-8">
        <div className="bg-muted/40 h-16 w-full rounded-lg border" />

        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-muted h-4 w-32 rounded" />
              <div className="bg-muted h-8 w-28 rounded-md" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((field) => (
                <div key={field} className="space-y-1.5">
                  <div className="bg-muted h-3 w-20 rounded" />
                  <div className="bg-muted h-9 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
