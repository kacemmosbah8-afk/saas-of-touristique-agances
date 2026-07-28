/** Loading skeleton for simple public storefront form pages (book, contact). */
export function PublicFormSkeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-4 py-12 sm:px-6">
      <div className="bg-muted mb-2 h-7 w-56 rounded" />
      <div className="bg-muted mb-8 h-4 w-72 rounded" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-muted h-10 w-full rounded-md" />
        ))}
        <div className="bg-muted h-24 w-full rounded-md" />
        <div className="bg-muted h-10 w-40 rounded-md" />
      </div>
    </div>
  );
}
