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
    <div className="min-h-screen">
      <Navigation theme="light" />

      {/* Hero */}
      <section className="relative bg-[#050A18] pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Node/edge decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg
            className="absolute right-0 top-0 w-[500px] h-[500px] opacity-[0.04]"
            viewBox="0 0 500 500"
            fill="none"
          >
            <circle cx="400" cy="100" r="4" fill="#10B981" />
            <circle cx="300" cy="200" r="4" fill="#10B981" />
            <circle cx="420" cy="280" r="4" fill="#10B981" />
            <circle cx="250" cy="350" r="4" fill="#10B981" />
            <circle cx="380" cy="400" r="4" fill="#10B981" />
            <line
              x1="400"
              y1="100"
              x2="300"
              y2="200"
              stroke="#10B981"
              strokeWidth="1"
            />
            <line
              x1="300"
              y1="200"
              x2="420"
              y2="280"
              stroke="#10B981"
              strokeWidth="1"
            />
            <line
              x1="420"
              y1="280"
              x2="380"
              y2="400"
              stroke="#10B981"
              strokeWidth="1"
            />
            <line
              x1="300"
              y1="200"
              x2="250"
              y2="350"
              stroke="#10B981"
              strokeWidth="1"
            />
            <line
              x1="250"
              y1="350"
              x2="380"
              y2="400"
              stroke="#10B981"
              strokeWidth="1"
            />
            <line
              x1="400"
              y1="100"
              x2="420"
              y2="280"
              stroke="#10B981"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          </svg>
        </div>

        <div className="relative max-w-[1200px] mx-auto px-6 md:px-12">
          <p className="text-emerald-400 text-[13px] font-medium uppercase tracking-[0.2em] mb-4">
            Caelex Network
          </p>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-[-0.03em] text-white leading-[1.1] max-w-3xl">
            Compliance Network
          </h1>
          <p className="text-[17px] text-white/60 mt-5 max-w-2xl leading-relaxed">
            One platform. Every stakeholder. Invite regulators, insurers,
            auditors, and launch providers into encrypted data rooms with
            cryptographic attestation workflows.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-8 md:gap-12 mt-10">
            <div>
              <p className="text-[22px] font-light text-white">
                End-to-End Encrypted
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                AES-256-GCM at Rest
              </p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            <div>
              <p className="text-[22px] font-light text-white">
                Watermarked Access
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                Every View Traceable
              </p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden md:block" />
            <div>
              <p className="text-[22px] font-light text-white">
                Hash-Chain Audit Trail
              </p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                SHA-256 Linked Logs
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

      {/* Stakeholder types */}
      <section className="py-12 bg-[#0D1526] border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] mb-6">
            Stakeholder types
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stakeholders.map((s) => (
              <div
                key={s.abbr}
                className="p-4 rounded-lg border border-white/[0.08] hover:border-white/[0.16] transition-colors"
              >
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-medium mb-2">
                  {s.abbr}
                </span>
                <p className="text-[12px] font-medium text-white/80 mb-1">
                  {s.role}
                </p>
                <p className="text-[11px] text-white/30 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
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
            Compliance collaboration with cryptographic accountability
          </h2>
          <p className="text-[15px] text-[#6B7280] mb-12 max-w-2xl">
            Every interaction in the Caelex Network is logged, signed, and
            verifiable. Compliance claims never rely on trust — they rely on
            proof.
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

      {/* Attestation workflow */}
      <section className="py-16 md:py-20 bg-[#F9FAFB] border-t border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-emerald-600 text-[12px] font-medium uppercase tracking-[0.2em] mb-3">
                Attestation Workflow
              </p>
              <h2 className="text-[clamp(1.25rem,2.5vw,1.875rem)] font-medium tracking-[-0.02em] text-[#111827] mb-4">
                From evidence to signed certificate — without manual process
              </h2>
              <p className="text-[15px] text-[#6B7280] leading-relaxed mb-6">
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
                    <span className="w-6 h-6 rounded-full bg-[#111827] text-white text-[11px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step.n}
                    </span>
                    <div>
                      <p className="text-[14px] font-medium text-[#111827]">
                        {step.t}
                      </p>
                      <p className="text-[12px] text-[#9CA3AF]">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
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
                  badgeColor: "emerald",
                },
                {
                  label: "Access Log",
                  items: [
                    "CNES NCA — viewed 14:02 UTC",
                    "Munich Re — downloaded 14:15 UTC",
                    "ESA Launch — viewed 15:30 UTC",
                  ],
                  badge: "Watermarked",
                  badgeColor: "blue",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="p-5 rounded-xl bg-white border border-[#E5E7EB]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[13px] font-semibold text-[#111827]">
                      {card.label}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        card.badgeColor === "emerald"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {card.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-[13px] text-[#6B7280]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
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
      <section className="py-16 bg-[#050A18]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          <h2 className="text-[24px] font-medium text-white mb-4">
            Connect your compliance ecosystem
          </h2>
          <p className="text-[15px] text-white/50 mb-8 max-w-md mx-auto">
            Invite your first stakeholder today. Encrypted data room ready in
            under a minute.
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
