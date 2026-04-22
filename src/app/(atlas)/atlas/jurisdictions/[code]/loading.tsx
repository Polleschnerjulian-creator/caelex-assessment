export default function JurisdictionDetailLoading() {
  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-12 animate-pulse">
      <div className="h-4 w-48 bg-[var(--atlas-bg-inset)] rounded mb-6" />
      <div className="h-9 w-64 bg-[var(--atlas-bg-inset)] rounded-lg mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-[var(--atlas-bg-inset)] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
