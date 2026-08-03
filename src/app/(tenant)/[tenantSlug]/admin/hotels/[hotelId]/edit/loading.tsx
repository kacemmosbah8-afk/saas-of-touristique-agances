export default function EditHotelLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-4 w-20 rounded" />
        <div className="flex items-center gap-3">
          <div className="bg-muted h-7 w-64 rounded" />
          <div className="bg-muted h-5 w-20 rounded-full" />
        </div>
        <div className="bg-muted h-4 w-40 rounded" />
      </div>

      {/* Details / Media / Rooms tab bar */}
      <div className="bg-muted h-9 w-64 rounded-lg" />

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
