export default function EditPackageLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="bg-muted h-4 w-24 rounded" />
        <div className="flex items-center gap-3">
          <div className="bg-muted h-7 w-64 rounded" />
          <div className="bg-muted h-5 w-20 rounded-full" />
        </div>
        <div className="bg-muted h-4 w-40 rounded" />
      </div>

      <div className="bg-muted h-9 w-72 rounded-lg" />

      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="bg-muted h-4 w-24 rounded" />
            <div className="bg-muted h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
