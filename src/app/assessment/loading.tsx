export default function AssessmentLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0B] py-20">
      <div className="max-w-4xl mx-auto px-4 animate-pulse">
        <div className="text-center space-y-4 mb-12">
          <div className="h-10 w-80 mx-auto bg-gray-200 dark:bg-[#1E293B] rounded-lg" />
          <div className="h-5 w-96 mx-auto bg-gray-200 dark:bg-[#1E293B] rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-200 dark:bg-[#1E293B] rounded-xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
