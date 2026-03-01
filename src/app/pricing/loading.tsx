export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-black py-20">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 animate-pulse">
        <div className="text-center space-y-4 mb-16">
          <div className="h-12 w-64 mx-auto bg-white/[0.06] rounded-lg" />
          <div className="h-5 w-96 mx-auto bg-white/[0.04] rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[500px] bg-white/[0.04] border border-white/[0.08] rounded-xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
