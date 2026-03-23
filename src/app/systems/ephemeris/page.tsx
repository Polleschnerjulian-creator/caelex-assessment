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

export default function EphemerisPage() {
  return (
    <div className="min-h-screen">
      <Navigation theme="light" />

      {/* Hero */}
      <section className="relative bg-[#050A18] pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Orbit arc decoration */}
        <div className="absolute right-0 top-0 w-[600px] h-[600px] opacity-[0.04] pointer-events-none">
          <svg viewBox="0 0 600 600" fill="none" className="w-full h-full">
            <ellipse
              cx="600"
              cy="300"
              rx="350"
              ry="200"
              stroke="#10B981"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
            <ellipse
              cx="600"
              cy="300"
              rx="440"
              ry="260"
              stroke="#10B981"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
          </svg>
        </div>

        <div className="relative max-w-[1200px] mx-auto px-6 md:px-12">
          <p className="text-emerald-400 text-[13px] font-medium uppercase tracking-[0.2em] mb-4">
            Caelex Ephemeris
          </p>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.03em] text-white leading-[1.1] max-w-3xl">
            Ephemeris
          </h1>
          <p className="text-[17px] text-white/60 mt-5 max-w-2xl leading-relaxed">
            Model every satellite as a living digital twin. Compute the
            compliance future — for every regulation, every satellite, every day
            of the next five years.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-8 md:gap-12 mt-10">
            <div>
              <p className="text-[22px] font-light text-white">
                5-Year Forecast
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                Compliance Horizon
              </p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            <div>
              <p className="text-[22px] font-light text-white">
                9 Compliance Modules
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                Per Satellite
              </p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            <div>
              <p className="text-[22px] font-light text-white">
                Live Orbital Data
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                CelesTrak · ESA DISCOS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-10">
            <Link
              href="/assessment"
              className="inline-flex items-center h-12 px-7 bg-emerald-500 text-white text-[14px] font-medium rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Start Assessment
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center h-12 px-7 border border-white/20 text-white text-[14px] font-medium rounded-lg hover:bg-white/5 transition-colors"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Concept callout */}
      <section className="py-12 bg-[#0D1526] border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-16">
            <div className="flex-1">
              <p className="text-[13px] text-white/50 leading-relaxed">
                <span className="text-white/80 font-medium">
                  The old question:
                </span>{" "}
                &ldquo;Are we compliant today?&rdquo;
              </p>
            </div>
            <div className="w-px h-6 bg-white/10 hidden md:block" />
            <div className="flex-1">
              <p className="text-[13px] text-white/50 leading-relaxed">
                <span className="text-emerald-400 font-medium">
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
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <p className="text-emerald-600 text-[12px] font-medium uppercase tracking-[0.2em] mb-3">
            Capabilities
          </p>
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.02em] text-[#111827] mb-3 max-w-xl">
            Predictive compliance intelligence, built on orbital physics
          </h2>
          <p className="text-[15px] text-[#6B7280] mb-12 max-w-2xl">
            Ephemeris fuses real TLE data, solar weather feeds, and regulatory
            thresholds into a single deterministic compliance timeline.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">
                  {f.title}
                </h3>
                <p className="text-[14px] text-[#6B7280] leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="py-16 md:py-20 bg-[#F9FAFB] border-t border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF] mb-8">
            Data Sources
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
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
            ].map((src) => (
              <div
                key={src.name}
                className="p-5 rounded-xl bg-white border border-[#E5E7EB]"
              >
                <p className="text-[14px] font-semibold text-[#111827] mb-1">
                  {src.name}
                </p>
                <p className="text-[12px] text-[#9CA3AF] leading-relaxed">
                  {src.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#050A18]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          <h2 className="text-[24px] font-medium text-white mb-4">
            See your compliance future
          </h2>
          <p className="text-[15px] text-white/50 mb-8 max-w-md mx-auto">
            Run your first satellite through Ephemeris in minutes. Get a 5-year
            compliance forecast with zero integration required.
          </p>
          <Link
            href="/assessment"
            className="inline-flex items-center h-12 px-8 bg-emerald-500 text-white text-[14px] font-medium rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Start Free Assessment
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#050A18] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <p className="text-[12px] text-white/30">© 2026 Caelex</p>
          <div className="flex items-center gap-6">
            <Link
              href="/legal/privacy"
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/legal/impressum"
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
            >
              Impressum
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
