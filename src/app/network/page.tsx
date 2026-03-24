import { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import {
  Lock,
  UsersRound,
  CheckSquare,
  Building2,
  ClipboardList,
  ShieldHalf,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Compliance Network — Caelex",
  description:
    "One platform. Every stakeholder. Invite regulators, insurers, auditors, and launch providers into encrypted data rooms with cryptographic attestation workflows.",
};

const features = [
  {
    icon: Lock,
    title: "Encrypted Data Rooms",
    description:
      "Share compliance documents with stakeholders via encrypted, watermarked access. Every view logged. Every download traceable.",
  },
  {
    icon: UsersRound,
    title: "Stakeholder Management",
    description:
      "Invite NCAs, insurers, legal counsel, and launch providers with granular role permissions. One platform for every external party.",
  },
  {
    icon: CheckSquare,
    title: "Attestation Workflows",
    description:
      "Cryptographic sign-off chains for compliance verification. Each attestation carries an Ed25519 signature and hash-chain anchor.",
  },
  {
    icon: Building2,
    title: "NCA Portal",
    description:
      "Direct submission pipeline to national competent authorities. Package, submit, and track authorization applications in one place.",
  },
  {
    icon: ClipboardList,
    title: "Audit Trail",
    description:
      "Every interaction logged, every sign-off cryptographically verifiable. Full chain of custody for every compliance document.",
  },
  {
    icon: ShieldHalf,
    title: "Peer-to-Peer Verification",
    description:
      "Operator-to-operator compliance proof without exposing operational data. Zero-knowledge attestations for selective disclosure.",
  },
];

const stakeholders = [
  {
    role: "National Competent Authorities",
    abbr: "NCA",
    desc: "Direct submission pipeline with structured document packages",
  },
  {
    role: "Space Insurers",
    abbr: "INS",
    desc: "Compliance attestations for underwriting and policy renewal",
  },
  {
    role: "Legal Counsel",
    abbr: "LGL",
    desc: "Secure document review with access-controlled data rooms",
  },
  {
    role: "Launch Providers",
    abbr: "LPR",
    desc: "Debris mitigation and compliance certification workflows",
  },
  {
    role: "Auditors",
    abbr: "AUD",
    desc: "Read-only access to evidence chains and audit logs",
  },
  {
    role: "Co-operators",
    abbr: "OPS",
    desc: "Peer verification without exposing operational telemetry",
  },
];

export default function NetworkPage() {
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
        {/* Network graph SVG decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg
            className="absolute right-0 top-0 w-[500px] h-[500px] opacity-[0.04]"
            viewBox="0 0 500 500"
            fill="none"
          >
            <circle cx="400" cy="100" r="4" fill="#0EA5E9" />
            <circle cx="300" cy="200" r="4" fill="#0EA5E9" />
            <circle cx="420" cy="280" r="4" fill="#0EA5E9" />
            <circle cx="250" cy="350" r="4" fill="#0EA5E9" />
            <circle cx="380" cy="400" r="4" fill="#0EA5E9" />
            <circle cx="150" cy="150" r="3" fill="#0EA5E9" />
            <circle cx="200" cy="450" r="3" fill="#0EA5E9" />
            <line
              x1="400"
              y1="100"
              x2="300"
              y2="200"
              stroke="#0EA5E9"
              strokeWidth="1"
            />
            <line
              x1="300"
              y1="200"
              x2="420"
              y2="280"
              stroke="#0EA5E9"
              strokeWidth="1"
            />
            <line
              x1="420"
              y1="280"
              x2="380"
              y2="400"
              stroke="#0EA5E9"
              strokeWidth="1"
            />
            <line
              x1="300"
              y1="200"
              x2="250"
              y2="350"
              stroke="#0EA5E9"
              strokeWidth="1"
            />
            <line
              x1="250"
              y1="350"
              x2="380"
              y2="400"
              stroke="#0EA5E9"
              strokeWidth="1"
            />
            <line
              x1="400"
              y1="100"
              x2="420"
              y2="280"
              stroke="#0EA5E9"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            <line
              x1="150"
              y1="150"
              x2="300"
              y2="200"
              stroke="#0EA5E9"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            <line
              x1="250"
              y1="350"
              x2="200"
              y2="450"
              stroke="#0EA5E9"
              strokeWidth="1"
            />
          </svg>
        </div>

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-4">
            Caelex Network
          </p>
          <h1 className="font-display text-[clamp(2.5rem,5vw,3rem)] font-bold tracking-[-0.015em] text-zinc-50 leading-[1.1] max-w-3xl">
            The compliance network
          </h1>
          <p className="font-body text-[16px] text-zinc-400 mt-5 max-w-2xl leading-relaxed">
            One platform. Every stakeholder. Invite regulators, insurers,
            auditors, and launch providers into encrypted data rooms with
            cryptographic attestation workflows.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-8 md:gap-12 mt-10">
            {[
              {
                value: "End-to-End Encrypted",
                label: "AES-256-GCM at Rest",
              },
              {
                value: "Watermarked Access",
                label: "Every View Traceable",
              },
              {
                value: "Hash-Chain Audit",
                label: "SHA-256 Linked Logs",
              },
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

      {/* Stakeholder types strip */}
      <section className="py-8 bg-[#18181B]/50 border-y border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-body text-[11px] text-zinc-500 uppercase tracking-[0.15em] font-semibold mb-5">
            Stakeholder Types
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stakeholders.map((s) => (
              <div
                key={s.abbr}
                className="p-4 rounded-[10px] border border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] transition-colors"
              >
                <span className="inline-block px-2 py-0.5 rounded-[4px] bg-sky-500/10 text-sky-400 text-[10px] font-mono font-medium mb-2">
                  {s.abbr}
                </span>
                <p className="font-body text-[12px] font-medium text-zinc-300 mb-1">
                  {s.role}
                </p>
                <p className="font-body text-[11px] text-zinc-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
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
            Compliance collaboration with cryptographic accountability
          </h2>
          <p className="font-body text-[14px] text-zinc-400 mb-12 max-w-2xl leading-relaxed">
            Every interaction in the Caelex Network is logged, signed, and
            verifiable. Compliance claims never rely on trust — they rely on
            proof.
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

      {/* Attestation workflow */}
      <section className="py-16 md:py-20 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-3">
                Attestation Workflow
              </p>
              <h2 className="font-display text-[clamp(1.25rem,2.5vw,1.5rem)] font-medium tracking-[-0.01em] text-zinc-50 mb-4">
                From evidence to signed certificate — without manual process
              </h2>
              <p className="font-body text-[14px] text-zinc-400 leading-relaxed mb-6">
                Sentinel telemetry flows into Verity attestations, which flow
                into Network data rooms. Stakeholders receive cryptographically
                signed compliance certificates they can verify independently.
              </p>
              <div className="space-y-3">
                {[
                  {
                    n: "1",
                    t: "Sentinel collects and signs evidence",
                    sub: "Ed25519 + SHA-256 hash chain",
                  },
                  {
                    n: "2",
                    t: "Comply maps evidence to regulations",
                    sub: "Article-level citation",
                  },
                  {
                    n: "3",
                    t: "Verity issues attestation certificate",
                    sub: "Blinded, offline-verifiable",
                  },
                  {
                    n: "4",
                    t: "Network delivers to stakeholders",
                    sub: "Encrypted, watermarked, logged",
                  },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-4">
                    <span className="w-6 h-6 rounded-full bg-zinc-50 text-zinc-900 text-[11px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step.n}
                    </span>
                    <div>
                      <p className="font-body text-[14px] font-medium text-zinc-100">
                        {step.t}
                      </p>
                      <p className="font-body text-[12px] text-zinc-500">
                        {step.sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 h-[40px] px-5 bg-zinc-50 text-zinc-900 text-[14px] font-body font-medium rounded-[6px] hover:bg-white transition-colors duration-150 mt-8"
              >
                Explore Attestation Workflows
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                {
                  label: "Data Room",
                  items: [
                    "Art. 70 Fuel Attestation.pdf",
                    "NIS2 Patch Evidence.json",
                    "IADC Debris Assessment.pdf",
                  ],
                  badge: "3 documents",
                  badgeColor: "sky",
                },
                {
                  label: "Access Log",
                  items: [
                    "CNES NCA — viewed 14:02 UTC",
                    "Munich Re — downloaded 14:15 UTC",
                    "ESA Launch — viewed 15:30 UTC",
                  ],
                  badge: "Watermarked",
                  badgeColor: "violet",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="p-5 rounded-[14px] border border-white/[0.08]"
                  style={{
                    background: "rgba(39, 39, 42, 0.55)",
                    backdropFilter: "blur(20px) saturate(1.2)",
                    WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-display text-[13px] font-medium text-zinc-100">
                      {card.label}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium ${
                        card.badgeColor === "sky"
                          ? "bg-sky-500/10 text-sky-400"
                          : "bg-violet-500/10 text-violet-400"
                      }`}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {card.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 font-body text-[13px] text-zinc-400"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-center">
          <h2 className="font-display text-[24px] font-medium text-zinc-50 mb-4 tracking-[-0.01em]">
            Connect your compliance ecosystem
          </h2>
          <p className="font-body text-[14px] text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
            Invite your first stakeholder today. Encrypted data room ready in
            under a minute.
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
