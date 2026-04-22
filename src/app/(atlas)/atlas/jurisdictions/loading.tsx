export default function JurisdictionsLoading() {
  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-12 animate-pulse">
      <div className="h-7 w-44 bg-[var(--atlas-bg-inset)] rounded-lg mb-8" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--atlas-bg-inset)] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
