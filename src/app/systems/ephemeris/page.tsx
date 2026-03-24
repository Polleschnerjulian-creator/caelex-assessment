import { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import {
  Satellite,
  TrendingUp,
  Wind,
  Network,
  CloudLightning,
  Trophy,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Ephemeris — Caelex",
  description:
    "Model every satellite as a living digital twin. Compute the compliance future — for every regulation, every satellite, every day of the next five years.",
};

const features = [
  {
    icon: Satellite,
    title: "Digital Twin",
    description:
      "Each satellite modeled with real orbital parameters from CelesTrak and ESA DISCOS. Physics-accurate, regulation-aware.",
  },
  {
    icon: TrendingUp,
    title: "Compliance Forecasting",
    description:
      "Predicts exactly when satellites will breach regulatory thresholds — fuel, debris risk, passivation — days or years in advance.",
  },
  {
    icon: Wind,
    title: "Orbital Decay Modeling",
    description:
      "Physics-based atmospheric drag model using NOAA F10.7 solar flux data. Accurate deorbit timeline predictions for every orbit.",
  },
  {
    icon: Network,
    title: "Fleet Intelligence",
    description:
      "Cross-satellite correlation analysis with weakest-link detection. Understand your fleet's aggregate compliance exposure at a glance.",
  },
  {
    icon: CloudLightning,
    title: "Space Weather Integration",
    description:
      "NOAA Kp index, geomagnetic storm alerts, and solar cycle predictions woven directly into forecast models.",
  },
  {
    icon: Trophy,
    title: "Benchmark & Ranking",
    description:
      "Compare your fleet's compliance trajectory against industry averages. Identify where you lead and where you lag.",
  },
];

const dataSources = [
  {
    name: "CelesTrak",
    desc: "TLE orbital elements — updated every 6 hours",
  },
  {
    name: "ESA DISCOS",
    desc: "European space object catalog & debris database",
  },
  {
    name: "NOAA SWPC",
    desc: "Solar flux F10.7, Kp index, geomagnetic alerts",
  },
  {
    name: "COSPAR/IADC",
    desc: "Debris mitigation guidelines & protected regions",
  },
];

export default function EphemerisPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <Navigation theme="light" />

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Gradient mesh environment */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(14, 165, 233, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(14, 165, 233, 0.03) 0%, transparent 50%)
            `,
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Orbit arc decoration */}
        <div className="absolute right-0 top-0 w-[600px] h-[600px] opacity-[0.04] pointer-events-none">
          <svg viewBox="0 0 600 600" fill="none" className="w-full h-full">
            <ellipse
              cx="600"
              cy="300"
              rx="350"
              ry="200"
              stroke="#0EA5E9"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
            <ellipse
              cx="600"
              cy="300"
              rx="440"
              ry="260"
              stroke="#0EA5E9"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
          </svg>
        </div>

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-4">
            Caelex Ephemeris
          </p>
          <h1 className="font-display text-[clamp(2.5rem,5vw,3rem)] font-bold tracking-[-0.015em] text-zinc-50 leading-[1.1] max-w-3xl">
            Predictive compliance intelligence
          </h1>
          <p className="font-body text-[16px] text-zinc-400 mt-5 max-w-2xl leading-relaxed">
            Model every satellite as a living digital twin. Compute the
            compliance future — for every regulation, every satellite, every day
            of the next five years.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-8 md:gap-12 mt-10">
            {[
              { value: "5-Year", label: "Compliance Horizon" },
              { value: "9", label: "Modules Per Satellite" },
              { value: "Live", label: "CelesTrak · ESA DISCOS" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex items-center gap-8 md:gap-12"
              >
                {i > 0 && (
                  <div className="w-px h-8 bg-white/10 hidden md:block mr-0" />
                )}
                <div>
                  <p className="font-mono text-[22px] font-medium text-zinc-50 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="font-body text-[11px] text-zinc-500 uppercase tracking-wider mt-0.5">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-10">
            <Link
              href="/assessment"
              className="inline-flex items-center h-[40px] px-5 bg-sky-500 text-white text-[14px] font-body font-medium rounded-[6px] hover:bg-sky-600 transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(14,165,233,0.25)] hover:-translate-y-px"
            >
              Start Assessment
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center h-[40px] px-5 bg-white/[0.06] backdrop-blur-sm text-white text-[14px] font-body font-medium rounded-[6px] border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.18] transition-all duration-150"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Concept callout strip */}
      <section className="py-8 bg-[#18181B]/50 border-y border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-16">
            <div className="flex-1">
              <p className="font-body text-[13px] text-zinc-500 leading-relaxed">
                <span className="text-zinc-300 font-medium">
                  The old question:
                </span>{" "}
                &ldquo;Are we compliant today?&rdquo;
              </p>
            </div>
            <div className="w-px h-6 bg-white/10 hidden md:block" />
            <div className="flex-1">
              <p className="font-body text-[13px] text-zinc-500 leading-relaxed">
                <span className="text-sky-400 font-medium">
                  The Ephemeris question:
                </span>{" "}
                &ldquo;When will we first breach a threshold — and for which
                regulation?&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Glass environment */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at 70% 30%, rgba(14, 165, 233, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse at 30% 70%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)
            `,
          }}
        />

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-3">
            Capabilities
          </p>
          <h2 className="font-display text-[clamp(1.5rem,3vw,1.875rem)] font-medium tracking-[-0.01em] text-zinc-50 mb-3 max-w-xl">
            Predictive compliance intelligence, built on orbital physics
          </h2>
          <p className="font-body text-[14px] text-zinc-400 mb-12 max-w-2xl leading-relaxed">
            Ephemeris fuses real TLE data, solar weather feeds, and regulatory
            thresholds into a single deterministic compliance timeline.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative p-6 rounded-[14px] border border-white/[0.08] transition-all duration-200 hover:-translate-y-px hover:border-sky-500/20"
                style={{
                  background: "rgba(39, 39, 42, 0.55)",
                  backdropFilter: "blur(20px) saturate(1.2)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <div className="w-10 h-10 rounded-[10px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="font-display text-[16px] font-medium text-zinc-100 mb-2">
                  {f.title}
                </h3>
                <p className="font-body text-[14px] text-zinc-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-16 md:py-20 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-3">
            Data Sources
          </p>
          <h2 className="font-display text-[clamp(1.25rem,2.5vw,1.5rem)] font-medium tracking-[-0.01em] text-zinc-50 mb-4">
            Real-time orbital and environmental data
          </h2>
          <p className="font-body text-[14px] text-zinc-400 leading-relaxed mb-8 max-w-2xl">
            Ephemeris ingests live feeds from authoritative space data providers
            — no synthetic inputs, no approximations.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dataSources.map((src) => (
              <div
                key={src.name}
                className="p-5 rounded-[14px] border border-white/[0.08]"
                style={{
                  background: "rgba(39, 39, 42, 0.55)",
                  backdropFilter: "blur(20px) saturate(1.2)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <p className="font-display text-[14px] font-medium text-zinc-100 mb-1">
                  {src.name}
                </p>
                <p className="font-body text-[12px] text-zinc-500 leading-relaxed">
                  {src.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Forecast stats */}
      <section className="py-12 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "1,825", label: "Forecast Days" },
              { value: "9", label: "Compliance Modules" },
              { value: "6h", label: "TLE Refresh Cycle" },
              { value: "24/7", label: "Space Weather Feed" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-mono text-[clamp(1.5rem,3vw,2.25rem)] font-medium text-zinc-100 tracking-tight">
                  {stat.value}
                </p>
                <p className="font-body text-[12px] text-zinc-500 uppercase tracking-wider mt-1 font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-center">
          <h2 className="font-display text-[24px] font-medium text-zinc-50 mb-4 tracking-[-0.01em]">
            See your compliance future
          </h2>
          <p className="font-body text-[14px] text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
            Run your first satellite through Ephemeris in minutes. Get a 5-year
            compliance forecast with zero integration required.
          </p>
          <Link
            href="/assessment"
            className="inline-flex items-center h-[40px] px-6 bg-sky-500 text-white text-[14px] font-body font-medium rounded-[6px] hover:bg-sky-600 transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(14,165,233,0.25)]"
          >
            Start Free Assessment
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <p className="font-body text-[12px] text-zinc-600">© 2026 Caelex</p>
          <div className="flex items-center gap-6">
            {[
              { href: "/legal/privacy", label: "Privacy" },
              { href: "/legal/terms", label: "Terms" },
              { href: "/legal/impressum", label: "Impressum" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
