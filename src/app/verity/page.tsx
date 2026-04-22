import { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Shield, Hash, EyeOff, Wifi, BookOpen, BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Verity — Privacy-Preserving Compliance Attestations | Caelex",
  description:
    "Prove regulatory compliance without revealing sensitive operational data. Cryptographically signed attestations for satellite operators, verified by anyone.",
  openGraph: {
    title: "Verity — Prove Compliance. Reveal Nothing.",
    description:
      "Privacy-preserving compliance attestations for satellite operators. Cryptographically signed proof that regulatory thresholds are met — without exposing telemetry.",
    images: ["/images/verity-hero.png"],
  },
};

const regulatorNeeds = [
  "Proof of debris mitigation compliance",
  "Evidence of passivation thresholds met",
  "Fuel reserve attestations for de-orbit",
  "Collision avoidance manoeuver records",
];

const operatorConstraints = [
  "Exact fuel levels (competitive intelligence)",
  "Orbital manoeuver parameters (ITAR/EAR)",
  "Telemetry streams (proprietary sensor data)",
  "Operational status of subsystems",
];

const steps = [
  {
    number: "01",
    title: "Ingest & Evaluate",
    description:
      "Operator submits telemetry to Caelex. The compliance engine evaluates the measurement against the applicable regulatory threshold.",
    code: [
      { text: "fuel_reserve: ", value: "47.2 kg", color: "text-sky-400" },
      {
        text: "threshold:     ",
        value: "\u2265 10.0 kg",
        color: "text-zinc-500",
      },
      { text: "\u2192 ", value: "PASS", color: "text-sky-400" },
    ],
  },
  {
    number: "02",
    title: "Hash & Commit",
    description:
      "The raw value is SHA-256 hashed to create a cryptographic commitment. The hash binds Caelex to the true measurement without revealing it.",
    code: [
      {
        text: "47.2 kg \u2192 ",
        value: "a3f8c1\u2026e7b2d4",
        color: "text-zinc-400",
      },
    ],
  },
  {
    number: "03",
    title: "Sign & Attest",
    description:
      "Caelex signs the threshold assertion with Ed25519. The attestation contains the claim, the hash commitment, and the digital signature \u2014 never the raw value.",
    code: [
      { text: "claim: ", value: '"ABOVE threshold"', color: "text-zinc-400" },
      { text: "sig:   ", value: "Ed25519 \u2713", color: "text-sky-400" },
    ],
  },
  {
    number: "04",
    title: "Verify Independently",
    description:
      "Anyone can verify the attestation using Caelex\u2019s public key. No login required. No API call. Fully offline-capable.",
    code: [
      {
        text: "$ verity verify --attestation att.json",
        value: "",
        color: "text-zinc-500",
      },
      {
        text: "\u2713 Valid \u2014 ",
        value: "signature verified",
        color: "text-sky-400",
      },
    ],
  },
];

const features = [
  {
    icon: Shield,
    title: "Ed25519 Signing",
    description:
      "Every attestation is digitally signed with Ed25519 elliptic-curve cryptography. Tamper-evident, non-repudiable, and verifiable by any third party.",
  },
  {
    icon: Hash,
    title: "Hash Chain Integrity",
    description:
      "SHA-256 hash commitments bind Caelex to the true measurement value. The hash proves consistency without exposing the underlying data.",
  },
  {
    icon: EyeOff,
    title: "Selective Disclosure",
    description:
      "Operators choose which compliance facts to attest. Regulators see only the threshold assertion \u2014 never the raw telemetry, fuel levels, or orbital parameters.",
  },
  {
    icon: Wifi,
    title: "Offline Verification",
    description:
      "Attestations are self-contained JSON documents. Verify with Caelex\u2019s public key using any Ed25519 library \u2014 no API, no login, no network required.",
  },
  {
    icon: BookOpen,
    title: "Regulation Mapping",
    description:
      "Each attestation references specific EU Space Act articles, NIS2 requirements, or national space law provisions. Full traceability to enacted law.",
  },
  {
    icon: BarChart3,
    title: "Trust Scoring",
    description:
      "Composite trust scores aggregate multiple attestations into a single compliance confidence metric. Weighted by recency, coverage, and cryptographic strength.",
  },
];

export default function VerityPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.caelex.eu" },
          { name: "Verity", url: "https://www.caelex.eu/verity" },
        ]}
      />
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

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-4">
            Caelex Verity
          </p>
          <h1 className="font-display text-[clamp(2.5rem,5vw,3rem)] font-bold tracking-[-0.015em] text-zinc-50 leading-[1.1] max-w-3xl">
            Prove compliance. Reveal nothing.
          </h1>
          <p className="font-body text-[16px] text-zinc-400 mt-5 max-w-2xl leading-relaxed">
            Privacy-preserving compliance attestations for satellite operators.
            Cryptographically signed proof that regulatory thresholds are met —
            without exposing the underlying telemetry.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-8 md:gap-12 mt-10">
            {[
              { value: "Ed25519", label: "Digital Signatures" },
              { value: "SHA-256", label: "Hash Commitments" },
              { value: "Signed Commitment", label: "Attestation Model" },
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
              href="/demo"
              className="inline-flex items-center h-[40px] px-5 bg-sky-500 text-white text-[14px] font-body font-medium rounded-[6px] hover:bg-sky-600 transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(14,165,233,0.25)] hover:-translate-y-px"
            >
              Request Demo
            </Link>
            <Link
              href="/platform"
              className="inline-flex items-center h-[40px] px-5 bg-white/[0.06] backdrop-blur-sm text-white text-[14px] font-body font-medium rounded-[6px] border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.18] transition-all duration-150"
            >
              Explore Platform
            </Link>
          </div>
        </div>
      </section>

      {/* Problem: The Compliance Paradox */}
      <section className="py-16 md:py-20 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-3">
            The Problem
          </p>
          <h2 className="font-display text-[clamp(1.5rem,3vw,1.875rem)] font-medium tracking-[-0.01em] text-zinc-50 mb-4 max-w-xl">
            The compliance paradox
          </h2>
          <p className="font-body text-[14px] text-zinc-400 mb-12 max-w-2xl leading-relaxed">
            Regulators need proof. Operators cannot share the data that
            constitutes that proof. Verity resolves this: prove the fact without
            revealing the data.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regulator needs */}
            <div
              className="p-6 rounded-[14px] border border-white/[0.08]"
              style={{
                background: "rgba(39, 39, 42, 0.55)",
                backdropFilter: "blur(20px) saturate(1.2)",
                WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <h3 className="font-display text-[16px] font-medium text-zinc-100 mb-5">
                What regulators need
              </h3>
              <div className="space-y-3.5">
                {regulatorNeeds.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                    <p className="font-body text-[14px] text-zinc-400 leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Operator constraints */}
            <div
              className="p-6 rounded-[14px] border border-white/[0.08]"
              style={{
                background: "rgba(39, 39, 42, 0.55)",
                backdropFilter: "blur(20px) saturate(1.2)",
                WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <h3 className="font-display text-[16px] font-medium text-zinc-100 mb-5">
                What operators can&apos;t share
              </h3>
              <div className="space-y-3.5">
                {operatorConstraints.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
                    <p className="font-body text-[14px] text-zinc-400 leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works: 4-step process */}
      <section className="relative py-20 md:py-28 overflow-hidden border-t border-white/[0.06]">
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
            How It Works
          </p>
          <h2 className="font-display text-[clamp(1.5rem,3vw,1.875rem)] font-medium tracking-[-0.01em] text-zinc-50 mb-3 max-w-xl">
            From telemetry to trustless proof
          </h2>
          <p className="font-body text-[14px] text-zinc-400 mb-12 max-w-2xl leading-relaxed">
            Four cryptographic steps transform sensitive operational data into
            independently verifiable compliance attestations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group relative p-6 rounded-[14px] border border-white/[0.08] transition-all duration-200 hover:-translate-y-px hover:border-sky-500/20"
                style={{
                  background: "rgba(39, 39, 42, 0.55)",
                  backdropFilter: "blur(20px) saturate(1.2)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-[10px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono text-[13px] font-medium text-sky-400">
                      {step.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-[16px] font-medium text-zinc-100">
                      {step.title}
                    </h3>
                  </div>
                </div>
                <p className="font-body text-[14px] text-zinc-400 leading-relaxed mb-4">
                  {step.description}
                </p>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-[8px] p-3.5">
                  {step.code.map((line, i) => (
                    <p
                      key={i}
                      className="font-mono text-[11px] text-zinc-500 leading-relaxed"
                    >
                      {line.text}
                      {line.value && (
                        <span className={line.color}>{line.value}</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid: 6 capabilities */}
      <section className="relative py-20 md:py-28 overflow-hidden border-t border-white/[0.06]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at 20% 60%, rgba(14, 165, 233, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 40%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)
            `,
          }}
        />

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-12">
          <p className="font-display text-[11px] font-medium uppercase tracking-[0.15em] text-sky-400 mb-3">
            Capabilities
          </p>
          <h2 className="font-display text-[clamp(1.5rem,3vw,1.875rem)] font-medium tracking-[-0.01em] text-zinc-50 mb-3 max-w-xl">
            Cryptographic compliance infrastructure
          </h2>
          <p className="font-body text-[14px] text-zinc-400 mb-12 max-w-2xl leading-relaxed">
            Verity is not a checkbox tool — it is a cryptographic attestation
            engine that produces independently verifiable compliance proof.
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

      {/* CTA */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-center">
          <h2 className="font-display text-[24px] font-medium text-zinc-50 mb-4 tracking-[-0.01em]">
            Ready to prove compliance without exposure?
          </h2>
          <p className="font-body text-[14px] text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
            Ed25519 signatures. SHA-256 hash commitments. Zero-knowledge
            attestations. Verified by anyone, anywhere, offline.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center h-[40px] px-6 bg-sky-500 text-white text-[14px] font-body font-medium rounded-[6px] hover:bg-sky-600 transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(14,165,233,0.25)]"
          >
            Request Demo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/[0.06]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <p className="font-body text-[12px] text-zinc-600">
            &copy; 2026 Caelex
          </p>
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
