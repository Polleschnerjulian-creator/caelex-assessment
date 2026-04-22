export default function AtlasLoading() {
  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-12 animate-pulse">
      {/* Greeting skeleton */}
      <div className="h-8 w-48 bg-[var(--atlas-bg-inset)] rounded-lg mb-10" />
      {/* Search bar skeleton */}
      <div className="h-16 w-full bg-[var(--atlas-bg-inset)] rounded-lg mb-14" />
      {/* Quick access skeleton */}
      <div className="flex gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-5 w-20 bg-[var(--atlas-bg-inset)] rounded"
          />
        ))}
      </div>
    </div>
  );
}
