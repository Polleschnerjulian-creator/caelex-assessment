"use client";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 py-10">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4 text-center md:text-left">
          {/* Left */}
          <div>
            <p className="text-[15px] font-medium text-white/60">Caelex</p>
            <p className="font-mono text-[11px] text-white/10 mt-1">
              EU Space Act Compliance Intelligence
            </p>
          </div>

          {/* Right */}
          <div className="font-mono text-[11px] text-white/10">© 2026</div>
        </div>

        {/* Bottom disclaimer */}
        <p className="font-mono text-[10px] text-white/[0.07] mt-8 text-center">
          Based on COM(2025) 335 final. This tool provides regulatory guidance,
          not legal advice. Consult qualified legal counsel for compliance
          decisions.
        </p>
      </div>
    </footer>
  );
}
