export default function ModuleLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-gray-200 dark:bg-[#1E293B] rounded-lg" />
        <div className="h-8 w-72 bg-gray-200 dark:bg-[#1E293B] rounded-lg" />
      </div>
      <div className="h-4 w-96 bg-gray-200 dark:bg-[#1E293B] rounded" />

      {/* Progress bar skeleton */}
      <div className="h-2 w-full bg-gray-200 dark:bg-[#1E293B] rounded-full" />

      {/* Requirement cards */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-200 dark:bg-[#1E293B] rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
