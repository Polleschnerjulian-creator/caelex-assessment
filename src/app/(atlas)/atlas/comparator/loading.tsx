export default function ComparatorLoading() {
  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-12 animate-pulse">
      <div className="h-7 w-36 bg-[var(--atlas-bg-inset)] rounded-lg mb-8" />
      <div className="h-10 w-full bg-[var(--atlas-bg-inset)] rounded-xl mb-6" />
      <div className="h-96 bg-[var(--atlas-bg-inset)] rounded-xl" />
    </div>
  );
}
