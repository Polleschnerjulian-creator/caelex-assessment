"use client";

export default function LogoConcepts() {
  return (
    <div className="min-h-screen bg-black py-16 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 block mb-4">
            Brand Identity
          </span>
          <h1 className="text-[28px] font-light text-white mb-4">
            Caelex Icon Concepts
          </h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-16">
          {/* Icon 1: Orbital C */}
          <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl p-6">
            <span className="font-mono text-[9px] text-white/40 block mb-4">
              01 — Orbital C
            </span>
            <div className="flex justify-center mb-4">
              <svg viewBox="0 0 64 64" className="w-16 h-16">
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeDasharray="120 31"
                  strokeDashoffset="-15"
                  strokeLinecap="round"
                />
                <circle cx="52" cy="22" r="4" fill="white" />
              </svg>
            </div>
            <p className="text-[10px] text-white/50 text-center">
              Offenes C mit Satellit
            </p>
          </div>

          {/* Icon 2: Soft Square */}
          <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl p-6">
            <span className="font-mono text-[9px] text-white/40 block mb-4">
              02 — Soft Square
            </span>
            <div className="flex justify-center mb-4">
              <svg viewBox="0 0 64 64" className="w-16 h-16">
                <path
                  d="M 48 16 L 20 16 Q 12 16 12 24 L 12 40 Q 12 48 20 48 L 48 48"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="48" cy="16" r="4" fill="white" />
              </svg>
            </div>
            <p className="text-[10px] text-white/50 text-center">
              Modern & approachable
            </p>
          </div>

          {/* Icon 3: Pure Orbit */}
          <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl p-6">
            <span className="font-mono text-[9px] text-white/40 block mb-4">
              03 — Pure Orbit
            </span>
            <div className="flex justify-center mb-4">
              <svg viewBox="0 0 64 64" className="w-16 h-16">
                <ellipse
                  cx="32"
                  cy="32"
                  rx="26"
                  ry="12"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  transform="rotate(-25 32 32)"
                />
                <circle cx="32" cy="32" r="8" fill="white" />
                <circle cx="54" cy="24" r="3.5" fill="white" />
              </svg>
            </div>
            <p className="text-[10px] text-white/50 text-center">
              Klassisch Space
            </p>
          </div>

          {/* Icon 4: Precision */}
          <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl p-6">
            <span className="font-mono text-[9px] text-white/40 block mb-4">
              04 — Precision
            </span>
            <div className="flex justify-center mb-4">
              <svg viewBox="0 0 64 64" className="w-16 h-16">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray="140 24"
                  strokeDashoffset="12"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="16"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.5"
                />
                <circle cx="32" cy="32" r="5" fill="white" />
              </svg>
            </div>
            <p className="text-[10px] text-white/50 text-center">
              Target / Präzision
            </p>
          </div>

          {/* Icon 5: Hex Frame */}
          <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl p-6">
            <span className="font-mono text-[9px] text-white/40 block mb-4">
              05 — Hex Frame
            </span>
            <div className="flex justify-center mb-4">
              <svg viewBox="0 0 64 64" className="w-16 h-16">
                <path
                  d="M 32 6 L 54 18 L 54 46 L 32 58 L 10 46 L 10 18 Z"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.3"
                />
                <path
                  d="M 42 22 A 14 14 0 1 0 42 42"
                  fill="none"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-[10px] text-white/50 text-center">
              Tech / Stabilität
            </p>
          </div>

          {/* Icon 6: Stacked Arcs */}
          <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl p-6">
            <span className="font-mono text-[9px] text-white/40 block mb-4">
              06 — Stacked
            </span>
            <div className="flex justify-center mb-4">
              <svg viewBox="0 0 64 64" className="w-16 h-16">
                <path
                  d="M 12 32 A 20 20 0 0 1 52 32"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M 18 38 A 14 14 0 0 1 46 38"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M 24 44 A 8 8 0 0 1 40 44"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.3"
                />
                <circle cx="32" cy="52" r="3" fill="white" />
              </svg>
            </div>
            <p className="text-[10px] text-white/50 text-center">
              Multi-Layer Compliance
            </p>
          </div>
        </div>

        {/* Combinations */}
        <h2 className="text-[18px] font-light text-white mb-6 text-center">
          Mit Wordmark
        </h2>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="bg-white/[0.05] border border-white/[0.12] rounded-xl p-8">
            <div className="flex items-center gap-4 justify-center">
              <svg viewBox="0 0 64 64" className="w-10 h-10">
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeDasharray="120 31"
                  strokeDashoffset="-15"
                  strokeLinecap="round"
                />
                <circle cx="52" cy="22" r="4" fill="white" />
              </svg>
              <span className="text-white text-[24px] font-light tracking-[-0.02em]">
                caelex
              </span>
            </div>
          </div>
          <div className="bg-white/[0.05] border border-white/[0.12] rounded-xl p-8">
            <div className="flex items-center gap-4 justify-center">
              <svg viewBox="0 0 64 64" className="w-10 h-10">
                <path
                  d="M 48 16 L 20 16 Q 12 16 12 24 L 12 40 Q 12 48 20 48 L 48 48"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="48" cy="16" r="4" fill="white" />
              </svg>
              <span className="text-white text-[24px] font-light tracking-[-0.02em]">
                caelex
              </span>
            </div>
          </div>
        </div>

        {/* Size test */}
        <h2 className="text-[18px] font-light text-white mb-6 text-center">
          Größentest
        </h2>
        <div className="flex items-end justify-center gap-6 flex-wrap mb-16">
          {[16, 24, 32, 48, 64].map((size) => (
            <div key={size} className="text-center">
              <div className="bg-white/[0.08] rounded p-2 inline-block mb-1">
                <svg viewBox="0 0 64 64" style={{ width: size, height: size }}>
                  <circle
                    cx="32"
                    cy="32"
                    r="24"
                    fill="none"
                    stroke="white"
                    strokeWidth="5"
                    strokeDasharray="120 31"
                    strokeDashoffset="-15"
                    strokeLinecap="round"
                  />
                  <circle cx="52" cy="22" r="5" fill="white" />
                </svg>
              </div>
              <span className="block font-mono text-[9px] text-white/40">
                {size}px
              </span>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-2xl p-8 max-w-xl mx-auto text-center">
          <span className="font-mono text-[10px] text-white/50 block mb-3">
            Empfehlung
          </span>
          <h3 className="text-[18px] text-white mb-4">
            Orbital C oder Soft Square
          </h3>
          <div className="flex justify-center gap-8 mb-4">
            <svg viewBox="0 0 64 64" className="w-14 h-14">
              <circle
                cx="32"
                cy="32"
                r="24"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeDasharray="120 31"
                strokeDashoffset="-15"
                strokeLinecap="round"
              />
              <circle cx="52" cy="22" r="4" fill="white" />
            </svg>
            <svg viewBox="0 0 64 64" className="w-14 h-14">
              <path
                d="M 48 16 L 20 16 Q 12 16 12 24 L 12 40 Q 12 48 20 48 L 48 48"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="48" cy="16" r="4" fill="white" />
            </svg>
          </div>
          <p className="text-[13px] text-white/60">
            Beide skalieren perfekt, sind einprägsam und professionell.
          </p>
        </div>
      </div>
    </div>
  );
}
