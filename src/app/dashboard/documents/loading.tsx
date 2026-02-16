export default function DocumentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 dark:bg-[#1E293B] rounded-lg" />
        <div className="h-10 w-36 bg-gray-200 dark:bg-[#1E293B] rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-24 bg-gray-200 dark:bg-[#1E293B] rounded-lg"
          />
        ))}
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-gray-200 dark:bg-[#1E293B] rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
