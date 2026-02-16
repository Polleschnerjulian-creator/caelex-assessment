export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-gray-200 dark:bg-[#1E293B] rounded-lg" />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-gray-200 dark:bg-[#1E293B] rounded-xl"
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-gray-200 dark:bg-[#1E293B] rounded-xl p-4 space-y-3">
        <div className="h-10 w-full bg-gray-300 dark:bg-[#334155] rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full bg-gray-300 dark:bg-[#334155] rounded"
          />
        ))}
      </div>
    </div>
  );
}
