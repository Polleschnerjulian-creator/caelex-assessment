"use client";

import { Section, motion, fadeUp } from "./animation-utils";
import { KeyRound, Hash, GitBranch } from "lucide-react";

const primitives = [
  {
    icon: KeyRound,
    title: "Digital Signatures",
    primitive: "Ed25519",
    description:
      "Every attestation is signed with a deterministic Edwards-curve signature. Non-repudiation: once signed, the issuer cannot deny the claim.",
  },
  {
    icon: Hash,
    title: "Hash Commitments",
    primitive: "SHA-256",
    description:
      "Raw telemetry values are hashed before attestation. The commitment binds the issuer to the true value without revealing it.",
  },
  {
    icon: GitBranch,
    title: "Transparency Log",
    primitive: "Merkle Tree",
    description:
      "Attestations are anchored in an append-only Merkle tree. Tamper-evident: any modification invalidates the root hash.",
  },
];

const stats = [
  { value: "Ed25519", label: "Signature scheme" },
  { value: "SHA-256", label: "Hash function" },
  { value: "100%", label: "Offline verifiable" },
];

export default function ArchitectureSection() {
  return (
    <section className="py-24 md:py-36 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <Section>
          <motion.p
            variants={fadeUp}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4"
          >
            Architecture
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-semibold text-white mb-16 leading-tight"
            style={{ fontSize: "clamp(28px, 5vw, 48px)" }}
          >
            Built on proven cryptography.
          </motion.h2>
        </Section>

        <div className="grid md:grid-cols-3 gap-6">
          {primitives.map((item) => (
            <Section key={item.title}>
              <motion.div
                variants={fadeUp}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] hover:border-white/[0.10] transition-colors h-full"
              >
                <item.icon className="w-5 h-5 text-emerald-500 mb-4" />
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-500/60 mb-2">
                  {item.primitive}
                </p>
                <h3 className="text-title font-medium text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-body text-white/50 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            </Section>
          ))}
        </div>

        {/* Stats line */}
        <Section className="mt-12">
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-8 md:gap-16 py-6 border-t border-white/[0.06]"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-mono text-title text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-caption text-white/40">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </Section>
      </div>
    </section>
  );
}
