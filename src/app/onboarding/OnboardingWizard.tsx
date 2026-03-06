"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Satellite,
  Rocket,
  Building2,
  Globe,
  Shield,
  Database,
  Radio,
  Check,
  User,
  Briefcase,
} from "lucide-react";

// ─── Operator type definitions ───

const OPERATOR_TYPES = [
  {
    code: "SCO",
    label: "Satellite Operator",
    description: "Operates satellites in orbit",
    icon: Satellite,
  },
  {
    code: "LO",
    label: "Launch Operator",
    description: "Provides launch services",
    icon: Rocket,
  },
  {
    code: "LSO",
    label: "Launch Site Operator",
    description: "Operates launch facilities",
    icon: Building2,
  },
  {
    code: "ISOS",
    label: "In-orbit Services",
    description: "Provides in-orbit servicing",
    icon: Globe,
  },
  {
    code: "CAP",
    label: "Capsule Operator",
    description: "Operates re-entry vehicles",
    icon: Shield,
  },
  {
    code: "PDP",
    label: "Data Provider",
    description: "Processes space-derived data",
    icon: Database,
  },
  {
    code: "TCO",
    label: "Telecom Operator",
    description: "Satellite communication systems",
    icon: Radio,
  },
] as const;

const COUNTRIES = [
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "UK", label: "United Kingdom" },
  { code: "BE", label: "Belgium" },
  { code: "NL", label: "Netherlands" },
  { code: "LU", label: "Luxembourg" },
  { code: "AT", label: "Austria" },
  { code: "DK", label: "Denmark" },
  { code: "IT", label: "Italy" },
  { code: "NO", label: "Norway" },
  { code: "OTHER", label: "Other" },
] as const;

// ─── Step indicator ───

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300 ${
              i < current
                ? "bg-emerald-500 text-white"
                : i === current
                  ? "bg-[#111827] text-white"
                  : "bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
          >
            {i < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`w-12 h-[2px] transition-colors duration-300 ${
                i < current ? "bg-emerald-500" : "bg-[#E5E7EB]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main wizard ───

export default function OnboardingWizard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const firstName = session?.user?.name?.split(" ")[0] || "";
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  // Step 2 state
  const [orgName, setOrgName] = useState("");
  const [country, setCountry] = useState("");
  const [operatorType, setOperatorType] = useState("");

  // Initialize from session once available
  const [initialized, setInitialized] = useState(false);
  if (session?.user && !initialized) {
    if (session.user.name && !fullName) setFullName(session.user.name);
    setInitialized(true);
  }

  const handleStep1Next = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/onboarding/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          jobTitle: jobTitle.trim() || undefined,
        }),
      });
      setStep(1);
    } catch {
      // Silently continue — profile update is non-critical
      setStep(1);
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Next = async () => {
    if (!orgName.trim() || !country || !operatorType) return;
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName.trim(),
          country,
          operatorType,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setStep(2);
    } catch {
      // Still allow proceeding
      setStep(2);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (destination: string) => {
    setSaving(true);
    try {
      await fetch("/api/onboarding/complete", { method: "PATCH" });
    } catch {
      // Non-critical
    }
    router.push(destination);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  const [direction, setDirection] = useState(1);

  const goNext = () => {
    setDirection(1);
    if (step === 0) handleStep1Next();
    else if (step === 1) handleStep2Next();
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const canContinue =
    step === 0
      ? fullName.trim().length > 0
      : step === 1
        ? orgName.trim().length > 0 && country && operatorType
        : true;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-[#F0F1F3]">
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#111827]">
          CAELEX
        </span>
        <StepIndicator current={step} total={3} />
        <span className="text-[13px] text-[#9CA3AF]">Step {step + 1} of 3</span>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[560px]">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="mb-2">
                  <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[#9CA3AF]">
                    <User className="w-3.5 h-3.5" />
                    Your Profile
                  </span>
                </div>
                <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.03em] text-[#111827] leading-[1.1] mb-3">
                  Welcome{firstName ? `, ${firstName}` : ""}
                </h1>
                <p className="text-[15px] text-[#6B7280] mb-10 leading-relaxed">
                  Let&apos;s set up your compliance workspace. This takes about
                  30 seconds.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                      Job Title{" "}
                      <span className="text-[#9CA3AF] font-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      placeholder="e.g. Compliance Officer"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="mb-2">
                  <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[#9CA3AF]">
                    <Briefcase className="w-3.5 h-3.5" />
                    Organization
                  </span>
                </div>
                <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.03em] text-[#111827] leading-[1.1] mb-3">
                  Your organization
                </h1>
                <p className="text-[15px] text-[#6B7280] mb-10 leading-relaxed">
                  This helps us tailor your compliance assessment to your
                  specific regulatory requirements.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      placeholder="Your company name"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                      Primary Jurisdiction
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors appearance-none"
                    >
                      <option value="" disabled>
                        Select country
                      </option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-3">
                      Operator Type
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {OPERATOR_TYPES.map((op) => {
                        const Icon = op.icon;
                        const selected = operatorType === op.code;
                        return (
                          <button
                            key={op.code}
                            type="button"
                            onClick={() => setOperatorType(op.code)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-lg border text-left transition-all duration-200 ${
                              selected
                                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                                : "border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#FAFAFA]"
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 flex-shrink-0 ${selected ? "text-emerald-600" : "text-[#9CA3AF]"}`}
                              strokeWidth={1.5}
                            />
                            <div className="min-w-0">
                              <div
                                className={`text-[13px] font-medium ${selected ? "text-emerald-900" : "text-[#111827]"}`}
                              >
                                {op.label}
                                <span className="ml-2 text-[11px] font-mono text-[#9CA3AF]">
                                  {op.code}
                                </span>
                              </div>
                              <div className="text-[12px] text-[#6B7280]">
                                {op.description}
                              </div>
                            </div>
                            {selected && (
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-auto" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="mb-2">
                  <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[#9CA3AF]">
                    <Check className="w-3.5 h-3.5" />
                    Ready
                  </span>
                </div>
                <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.03em] text-[#111827] leading-[1.1] mb-3">
                  You&apos;re all set
                </h1>
                <p className="text-[15px] text-[#6B7280] mb-10 leading-relaxed">
                  Your workspace is configured. Start your compliance assessment
                  to get a full regulatory profile.
                </p>

                {/* Summary card */}
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-6 mb-10">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#6B7280]">Name</span>
                      <span className="font-medium text-[#111827]">
                        {fullName}
                      </span>
                    </div>
                    {jobTitle && (
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[#6B7280]">Role</span>
                        <span className="font-medium text-[#111827]">
                          {jobTitle}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-[#E5E7EB]" />
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#6B7280]">Organization</span>
                      <span className="font-medium text-[#111827]">
                        {orgName}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#6B7280]">Jurisdiction</span>
                      <span className="font-medium text-[#111827]">
                        {COUNTRIES.find((c) => c.code === country)?.label ||
                          country}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#6B7280]">Operator Type</span>
                      <span className="font-medium text-[#111827]">
                        {OPERATOR_TYPES.find((o) => o.code === operatorType)
                          ?.label || operatorType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                  <button
                    onClick={() => handleComplete("/assessment/unified")}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-3 bg-[#111827] text-white rounded-lg px-6 py-4 text-[15px] font-medium hover:bg-[#1E293B] transition-colors disabled:opacity-50"
                  >
                    Start Compliance Assessment
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleComplete("/dashboard")}
                    disabled={saving}
                    className="w-full text-center text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors py-2"
                  >
                    Skip to Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom bar */}
      {step < 2 && (
        <footer className="flex items-center justify-between px-8 py-6 border-t border-[#F0F1F3]">
          <div>
            {step > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <button
            onClick={goNext}
            disabled={!canContinue || saving}
            className="flex items-center gap-2 bg-[#111827] text-white rounded-lg px-6 py-2.5 text-[14px] font-medium hover:bg-[#1E293B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </footer>
      )}
    </div>
  );
}
