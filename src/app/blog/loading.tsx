export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-black py-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 animate-pulse">
        <div className="space-y-4 mb-16">
          <div className="h-12 w-80 bg-white/[0.06] rounded-lg" />
          <div className="h-5 w-[500px] max-w-full bg-white/[0.04] rounded-lg" />
        </div>
        <div className="flex gap-2 mb-12">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-white/[0.06] rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-white/[0.04] border border-white/[0.08] rounded-xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
