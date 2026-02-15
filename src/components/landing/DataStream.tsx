"use client";

const fragments = [
  "Art. 4 — Authorization requirements",
  "Annex II — Environmental footprint",
  "Art. 18 — Debris mitigation obligations",
  "Art. 27 — Cybersecurity standards",
  "Art. 31 — Data governance framework",
  "Art. 45 — Insurance requirements",
  "Art. 52 — Spectrum coordination",
  "Art. 67 — Penalties and enforcement",
  "Art. 8 — Registration procedures",
  "Art. 39 — Liability provisions",
];

export default function DataStream() {
  return (
    <section
      className="relative h-[30vh] bg-black overflow-hidden"
      aria-hidden="true"
    >
      {/* Top fade gradient */}
      <div
        className="absolute inset-x-0 top-0 h-[30%] z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, #000 0%, transparent 100%)",
        }}
      />

      {/* Bottom fade gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-[30%] z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #000 0%, transparent 100%)",
        }}
      />

      {/* Floating text fragments */}
      {fragments.map((fragment, index) => {
        // Scattered positions across width
        const leftPositions = [5, 15, 25, 35, 45, 55, 65, 75, 85, 12];
        const left = `${leftPositions[index % leftPositions.length]}%`;
        // Duration varies between 18-30s
        const duration = 18 + ((index * 1.3) % 12);
        // Staggered delays
        const delay = -(index / fragments.length) * duration;

        return (
          <div
            key={index}
            className="absolute font-mono text-[12px] text-white/[0.04] whitespace-nowrap"
            style={{
              left,
              animation: `float-up ${duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          >
            {fragment}
          </div>
        );
      })}

      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(100%);
            top: 100%;
          }
          100% {
            transform: translateY(-100%);
            top: 0%;
          }
        }
      `}</style>
    </section>
  );
}
