import { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  Shield,
  Lock,
  FileCheck,
  Activity,
  ArrowRight,
  Globe,
  Scale,
  ShieldCheck,
  Truck,
  Building2,
  Landmark,
  UserCheck,
  Rocket,
  FolderLock,
  Hash,
  Eye,
  Bell,
  Layers,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const metadata: Metadata = {
  title: "Platform | Multi-Stakeholder Compliance Network | Caelex",
  description:
    "Caelex transforms space compliance from a single-operator tool into a secure multi-stakeholder network. Connect with legal counsel, insurers, auditors, suppliers, and regulators through encrypted data rooms, cryptographic attestations, and real-time activity feeds.",
};

const stakeholderTypes = [
  {
    icon: Scale,
    label: "Legal Counsel",
    description:
      "Law firms review authorization applications, assess regulatory exposure, and sign off on compliance frameworks.",
    color: "blue",
  },
  {
    icon: ShieldCheck,
    label: "Insurers",
    description:
      "Insurance companies evaluate risk profiles, review TPL calculations, and bind coverage through the platform.",
    color: "purple",
  },
  {
    icon: UserCheck,
    label: "Auditors",
    description:
      "Compliance auditors access evidence packages, verify hash chains, and issue audit clearance attestations.",
    color: "amber",
  },
  {
    icon: Truck,
    label: "Suppliers",
    description:
      "Component manufacturers and launch providers submit LCA data, certifications, and debris mitigation plans.",
    color: "emerald",
  },
  {
    icon: Landmark,
    label: "National Authorities",
    description:
      "NCAs review authorization applications, access required documentation, and issue formal approvals.",
    color: "cyan",
  },
  {
    icon: Building2,
    label: "Consultants",
    description:
      "External advisors collaborate on cybersecurity frameworks, NIS2 assessments, and environmental impact analysis.",
    color: "rose",
  },
  {
    icon: Rocket,
    label: "Launch Providers",
    description:
      "Launch service providers share mission parameters, coordinate debris plans, and confirm launch readiness.",
    color: "orange",
  },
];

const capabilities = [
  {
    icon: FolderLock,
    title: "Secure Data Rooms",
    description:
      "Encrypted, time-limited document spaces with granular access controls. Share authorization documents, audit evidence, and compliance reports with external stakeholders — with full watermarking, download tracking, and automatic expiry.",
    features: [
      "AES-256-GCM encryption per room",
      "4 access levels: View, Comment, Contribute, Full",
      "PDF watermarking with stakeholder identity",
      "Download & print controls",
      "Automatic expiry with configurable dates",
      "Complete access audit trail",
    ],
  },
  {
    icon: Hash,
    title: "Cryptographic Attestations",
    description:
      "Tamper-evident, hash-chained confirmations from external stakeholders. Each attestation — legal review, audit clearance, insurance binding, NCA approval — is cryptographically linked to the previous one, creating a verifiable compliance trail.",
    features: [
      "SHA-256 hash chain linking attestations",
      "7 attestation types (legal, audit, insurance, ...)",
      "Public verification endpoint",
      "Validity periods with auto-expiry",
      "Revocation with documented reasons",
      "Signer identity and organization capture",
    ],
  },
  {
    icon: Eye,
    title: "Full Audit Trail",
    description:
      "Every stakeholder action is logged — portal access, document views, downloads, uploads, comments, and attestation signatures. IP addresses, user agents, and timestamps create a complete forensic trail for compliance reporting.",
    features: [
      "Stakeholder access logging",
      "Data room activity tracking",
      "Document view & download records",
      "IP and user-agent capture",
      "Exportable for compliance reports",
      "Real-time monitoring dashboard",
    ],
  },
  {
    icon: Bell,
    title: "Real-Time Activity Feed",
    description:
      "A unified activity feed aggregates actions across all stakeholders — new attestations, document uploads, data room access, and engagement status changes. Stay informed about your entire compliance network.",
    features: [
      "Aggregated cross-stakeholder feed",
      "Webhook notifications for events",
      "Filter by stakeholder type or action",
      "Comment threads on data rooms",
      "@mention support for team communication",
      "HMAC-SHA256 signed webhooks",
    ],
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/20",
  },
};

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Platform", href: "/platform" }]}
            className="mb-8"
          />

          {/* Hero */}
          <div className="max-w-3xl mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-caption mb-6">
              <Users size={12} />
              <span>Multi-Stakeholder Compliance Network</span>
            </div>
            <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
              One platform.
              <br />
              Every stakeholder.
            </h1>
            <p className="text-title md:text-heading text-white/45 leading-relaxed">
              Space compliance requires an ecosystem — lawyers, insurers,
              auditors, suppliers, regulators, and consultants all working
              toward the same goal. Caelex connects them in a secure, auditable
              network with encrypted data rooms, cryptographic attestations, and
              real-time visibility.
            </p>
          </div>

          {/* Problem → Solution */}
          <section className="mb-24">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <div className="text-caption text-white/30 uppercase tracking-wider mb-4">
                  Without Caelex
                </div>
                <h3 className="text-heading font-medium text-white mb-4">
                  Fragmented compliance workflows
                </h3>
                <ul className="space-y-3">
                  {[
                    "Emailing PDFs to lawyers for review",
                    "Manually sharing documents with auditors",
                    "No visibility into supplier certifications",
                    "Paper-based NCA approval processes",
                    "Insurance assessments via spreadsheets",
                    "No audit trail across stakeholders",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-body text-white/45"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400/60 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
                <div className="text-caption text-emerald-400/60 uppercase tracking-wider mb-4">
                  With Caelex
                </div>
                <h3 className="text-heading font-medium text-white mb-4">
                  Unified compliance network
                </h3>
                <ul className="space-y-3">
                  {[
                    "Secure data rooms with granular access controls",
                    "Cryptographic attestations with hash chains",
                    "Real-time activity feeds across all stakeholders",
                    "Token-based portal access — no accounts needed",
                    "Automated expiry and access revocation",
                    "Complete audit trail for every action",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-body text-white/70"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Stakeholder Types */}
          <section className="mb-24">
            <div className="max-w-2xl mb-12">
              <h2 className="text-display-sm md:text-display font-medium text-white mb-4">
                Built for every stakeholder in the space compliance lifecycle
              </h2>
              <p className="text-body-lg text-white/45 leading-relaxed">
                Invite external stakeholders to your compliance network. Each
                gets a secure, token-based portal tailored to their role — no
                account creation required.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {stakeholderTypes.map((type) => {
                const Icon = type.icon;
                const colors = colorMap[type.color];

                return (
                  <div
                    key={type.label}
                    className={`p-5 rounded-xl bg-white/[0.04] border ${colors.border} transition-all duration-300 hover:bg-white/[0.06]`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center mb-4`}
                    >
                      <Icon size={20} className={colors.text} />
                    </div>
                    <h3 className="text-title font-medium text-white mb-2">
                      {type.label}
                    </h3>
                    <p className="text-small text-white/45 leading-relaxed">
                      {type.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Core Capabilities */}
          <section className="mb-24">
            <div className="max-w-2xl mb-12">
              <h2 className="text-display-sm md:text-display font-medium text-white mb-4">
                Security-first collaboration
              </h2>
              <p className="text-body-lg text-white/45 leading-relaxed">
                Every interaction is encrypted, logged, and verifiable. Built on
                the same infrastructure that protects your compliance data —
                AES-256-GCM encryption, SHA-256 hash chains, and HMAC-signed
                webhooks.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {capabilities.map((cap) => {
                const Icon = cap.icon;

                return (
                  <div
                    key={cap.title}
                    className="p-8 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5">
                      <Icon size={24} className="text-emerald-400" />
                    </div>
                    <h3 className="text-heading font-medium text-white mb-3">
                      {cap.title}
                    </h3>
                    <p className="text-body text-white/45 leading-relaxed mb-5">
                      {cap.description}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {cap.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-2 text-small text-white/30"
                        >
                          <span className="w-1 h-1 rounded-full bg-emerald-500/40 mt-1.5 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* How It Works */}
          <section className="mb-24">
            <div className="max-w-2xl mb-12">
              <h2 className="text-display-sm md:text-display font-medium text-white mb-4">
                How it works
              </h2>
              <p className="text-body-lg text-white/45 leading-relaxed">
                From invitation to attestation — a streamlined workflow for
                cross-organizational compliance.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  icon: Users,
                  title: "Invite Stakeholders",
                  description:
                    "Add legal counsel, insurers, auditors, or suppliers to your compliance network. Each receives a secure access token via email.",
                },
                {
                  step: "02",
                  icon: FolderLock,
                  title: "Create Data Rooms",
                  description:
                    "Set up encrypted document spaces with specific access levels. Add authorization documents, audit evidence, or insurance reports.",
                },
                {
                  step: "03",
                  icon: Activity,
                  title: "Collaborate Securely",
                  description:
                    "Stakeholders access their portal, review documents, upload files, and post comments — all tracked with a complete audit trail.",
                },
                {
                  step: "04",
                  icon: FileCheck,
                  title: "Collect Attestations",
                  description:
                    "Stakeholders sign cryptographic attestations — legal reviews, audit clearances, NCA approvals — building a verifiable compliance chain.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.step}
                    className="relative p-6 rounded-xl bg-white/[0.04] border border-white/[0.08]"
                  >
                    <div className="text-[64px] font-medium text-white/[0.04] absolute top-3 right-4 leading-none select-none">
                      {item.step}
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Icon size={20} className="text-emerald-400" />
                    </div>
                    <h3 className="text-title font-medium text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-small text-white/45 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Security Architecture */}
          <section className="mb-24">
            <div className="p-8 md:p-12 rounded-xl bg-gradient-to-br from-emerald-500/[0.06] to-transparent border border-emerald-500/20">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5">
                    <Shield size={24} className="text-emerald-400" />
                  </div>
                  <h2 className="text-display-sm font-medium text-white mb-4">
                    Enterprise-grade security
                  </h2>
                  <p className="text-body-lg text-white/45 leading-relaxed mb-6">
                    The compliance network inherits the same security
                    infrastructure that protects your core data. Every document,
                    every interaction, every attestation is encrypted and
                    verifiable.
                  </p>
                  <Link
                    href="/security"
                    className="inline-flex items-center gap-2 text-body text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Learn about our security architecture
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      icon: Lock,
                      label: "AES-256-GCM",
                      detail: "Per-room encryption",
                    },
                    {
                      icon: Hash,
                      label: "SHA-256 Chains",
                      detail: "Tamper-evident attestations",
                    },
                    {
                      icon: Shield,
                      label: "HMAC-SHA256",
                      detail: "Signed webhooks",
                    },
                    {
                      icon: Eye,
                      label: "Audit Trail",
                      detail: "Every action logged",
                    },
                    {
                      icon: Globe,
                      label: "IP Allowlisting",
                      detail: "Network-level access control",
                    },
                    {
                      icon: Layers,
                      label: "RBAC Permissions",
                      detail: "Granular role control",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="p-4 rounded-xl bg-black/30 border border-emerald-500/10"
                      >
                        <Icon size={16} className="text-emerald-400 mb-2" />
                        <div className="text-small font-medium text-white">
                          {item.label}
                        </div>
                        <div className="text-caption text-white/30">
                          {item.detail}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <h2 className="text-display-sm md:text-display font-medium text-white mb-4">
              Ready to build your compliance network?
            </h2>
            <p className="text-body-lg text-white/45 leading-relaxed max-w-xl mx-auto mb-8">
              The Compliance Network is available on Professional and Enterprise
              plans. Start with a free assessment to see how Caelex fits your
              compliance requirements.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black text-body-lg font-medium hover:bg-white/90 transition-colors"
              >
                Start Free Assessment
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white border border-white/20 text-body-lg font-medium hover:border-white/40 transition-colors"
              >
                Request Demo
              </Link>
            </div>
            <p className="text-caption text-white/25 mt-4">
              Available on{" "}
              <Link
                href="/pricing"
                className="underline hover:text-white/40 transition-colors"
              >
                Professional and Enterprise plans
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
