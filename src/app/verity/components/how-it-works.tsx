"use client";

import { Section, motion, fadeUp } from "./animation-utils";

const steps = [
  {
    number: "01",
    title: "Ingest & Evaluate",
    description:
      "Operator submits telemetry to Caelex. The compliance engine evaluates the measurement against the applicable regulatory threshold.",
    visual: (
      <div className="font-mono text-[11px] text-white/30 space-y-1">
        <p>
          fuel_reserve: <span className="text-emerald-500">47.2 kg</span>
        </p>
        <p>
          threshold: <span className="text-white/50">≥ 10.0 kg</span>
        </p>
        <p className="text-emerald-500/60">→ PASS</p>
      </div>
    ),
  },
  {
    number: "02",
    title: "Hash & Commit",
    description:
      "The raw value is SHA-256 hashed to create a cryptographic commitment. The hash binds Caelex to the true measurement without revealing it.",
    visual: (
      <div className="font-mono text-[11px] text-white/30 overflow-hidden">
        <p>
          47.2 kg → <span className="text-white/50">a3f8c1…e7b2d4</span>
        </p>
      </div>
    ),
  },
  {
    number: "03",
    title: "Sign & Attest",
    description:
      "Caelex signs the threshold assertion with Ed25519. The attestation contains the claim, the hash commitment, and the digital signature — never the raw value.",
    visual: (
      <div className="font-mono text-[11px] space-y-1">
        <p className="text-white/30">
          claim:{" "}
          <span className="text-white/50">&quot;ABOVE threshold&quot;</span>
        </p>
        <p className="text-white/30">
          sig: <span className="text-emerald-500/60">Ed25519 ✓</span>
        </p>
      </div>
    ),
  },
  {
    number: "04",
    title: "Verify Independently",
    description:
      "Anyone can verify the attestation using Caelex's public key. No login required. No API call. Fully offline-capable.",
    visual: (
      <div className="font-mono text-[11px] text-white/30">
        <p>$ verity verify --attestation att.json</p>
        <p className="text-emerald-500">✓ Valid — signature verified</p>
      </div>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 md:py-36 border-t border-white/[0.06]">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <Section>
          <motion.p
            variants={fadeUp}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4"
          >
            How It Works
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-semibold text-white mb-20 leading-tight"
            style={{ fontSize: "clamp(28px, 5vw, 48px)" }}
          >
            How Verity works.
          </motion.h2>
        </Section>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/[0.06] hidden md:block" />

          <div className="space-y-16">
            {steps.map((step, i) => (
              <Section key={step.number}>
                <motion.div variants={fadeUp} className="flex gap-6 md:gap-10">
                  {/* Step number */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                      <span className="font-mono text-[11px] text-white/40">
                        {step.number}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="absolute left-1/2 top-10 bottom-0 w-px bg-white/[0.06] -translate-x-1/2 md:hidden h-16" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <h3 className="text-title font-medium text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-body-lg text-white/50 leading-relaxed mb-4">
                      {step.description}
                    </p>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                      {step.visual}
                    </div>
                  </div>
                </motion.div>
              </Section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
