export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-12 animate-pulse">
      <div className="h-7 w-32 bg-[var(--atlas-bg-inset)] rounded-lg mb-8" />
      <div className="max-w-2xl space-y-4">
        <div className="h-40 bg-[var(--atlas-bg-inset)] rounded-xl" />
        <div className="h-32 bg-[var(--atlas-bg-inset)] rounded-xl" />
      </div>
    </div>
  );
}
