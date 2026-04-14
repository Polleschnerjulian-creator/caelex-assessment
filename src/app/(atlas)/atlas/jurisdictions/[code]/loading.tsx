export default function JurisdictionDetailLoading() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-12 animate-pulse">
      <div className="h-4 w-48 bg-gray-100 rounded mb-6" />
      <div className="h-9 w-64 bg-gray-100 rounded-lg mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
