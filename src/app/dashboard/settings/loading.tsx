export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 dark:bg-[#1E293B] rounded-lg" />

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 p-6 bg-gray-200 dark:bg-[#1E293B] rounded-xl"
        >
          <div className="h-6 w-48 bg-gray-300 dark:bg-[#334155] rounded" />
          <div className="space-y-3">
            <div className="h-10 w-full bg-gray-300 dark:bg-[#334155] rounded-lg" />
            <div className="h-10 w-full bg-gray-300 dark:bg-[#334155] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
