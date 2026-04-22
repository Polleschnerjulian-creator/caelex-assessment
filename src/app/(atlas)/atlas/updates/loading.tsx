export default function UpdatesLoading() {
  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-12 animate-pulse">
      <div className="h-7 w-48 bg-[var(--atlas-bg-inset)] rounded-lg mb-3" />
      <div className="h-4 w-72 bg-[var(--atlas-bg-inset)] rounded mb-10" />
      <div className="max-w-3xl space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-[var(--atlas-bg-inset)] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
