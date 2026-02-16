export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 bg-gray-200 dark:bg-[#1E293B] rounded-lg" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-[#1E293B] rounded-lg" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 bg-gray-200 dark:bg-[#1E293B] rounded-xl"
          />
        ))}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-[#1E293B] rounded-xl" />
        <div className="h-96 bg-gray-200 dark:bg-[#1E293B] rounded-xl" />
      </div>
    </div>
  );
}
