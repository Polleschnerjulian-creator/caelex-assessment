"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  FileText,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";
import GlassCard from "@/components/ui/GlassCard";
import MaterialTypeSelector from "@/components/assure/MaterialTypeSelector";

// ─── Section Config ───

const SECTIONS = [
  { key: "overview", label: "Company Overview", default: true },
  { key: "market", label: "Market Analysis", default: true },
  { key: "technology", label: "Technology & Product", default: true },
  { key: "team", label: "Team", default: true },
  { key: "financials", label: "Financial Overview", default: true },
  { key: "traction", label: "Traction & Milestones", default: true },
  { key: "competitive", label: "Competitive Landscape", default: false },
  { key: "regulatory", label: "Regulatory Posture", default: false },
  { key: "risks", label: "Risk Summary", default: false },
  { key: "ask", label: "The Ask", default: true },
];

// ─── Component ───

export default function MaterialGeneratorPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<
    Record<string, boolean>
  >(Object.fromEntries(SECTIONS.map((s) => [s.key, s.default])));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setSelectedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setStep(1);
  };

  const handleGenerate = async () => {
    if (!selectedType) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/assure/materials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          type: selectedType,
          sections: Object.entries(selectedSections)
            .filter(([, v]) => v)
            .map(([k]) => k),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Generation failed");
      }
      router.push("/assure/materials");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const enabledSections =
    Object.values(selectedSections).filter(Boolean).length;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/assure/materials"
        className="inline-flex items-center gap-1.5 text-small text-white/40 hover:text-white/60 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Materials
      </Link>

      {/* Header */}
      <div className="mb-10">
        <motion.h1
          initial={false}
          animate={{ opacity: 1 }}
          className="text-display font-bold text-white mb-2"
        >
          Generate Material
        </motion.h1>
        <motion.p
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body-lg text-white/40"
        >
          {step === 0
            ? "Choose the type of material to generate."
            : step === 1
              ? "Select which sections to include."
              : "Review and generate your material."}
        </motion.p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["Type", "Sections", "Generate"].map((label, i) => (
          <div key={label} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-micro font-bold ${
                i < step
                  ? "bg-emerald-500 text-white"
                  : i === step
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/5 text-white/30 border border-white/10"
              }`}
            >
              {i < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            {i < 2 && (
              <div
                className={`w-10 h-0.5 mx-1 ${i < step ? "bg-emerald-500" : "bg-white/10"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <MaterialTypeSelector onSelect={handleTypeSelect} />
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-1"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard hover={false} className="p-6">
              <h2 className="text-heading font-semibold text-white mb-1">
                Include Sections
              </h2>
              <p className="text-small text-white/40 mb-5">
                {enabledSections} sections selected
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SECTIONS.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => toggleSection(section.key)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedSections[section.key]
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        selectedSections[section.key]
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-white/20"
                      }`}
                    >
                      {selectedSections[section.key] && (
                        <CheckCircle size={12} className="text-white" />
                      )}
                    </div>
                    <span
                      className={`text-body ${selectedSections[section.key] ? "text-white/80" : "text-white/50"}`}
                    >
                      {section.label}
                    </span>
                  </button>
                ))}
              </div>
            </GlassCard>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(0)}
                className="text-white/40 hover:text-white/60 text-body flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={() => setStep(2)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-6 py-2.5 rounded-lg transition-all flex items-center gap-2"
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard hover={false} className="p-8 text-center">
              <div className="w-16 h-16 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <FileText size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-display-sm font-bold text-white mb-2">
                Ready to Generate
              </h2>
              <p className="text-body-lg text-white/40 mb-2">
                Type:{" "}
                <span className="text-white/70 capitalize">
                  {selectedType?.replace(/_/g, " ")}
                </span>
              </p>
              <p className="text-body text-white/30 mb-8">
                {enabledSections} sections included
              </p>

              {error && <p className="text-small text-red-400 mb-4">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-subtitle px-8 py-3.5 rounded-lg transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                {generating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {generating ? "Generating..." : "Generate Material"}
              </button>
            </GlassCard>

            <div className="flex justify-start mt-6">
              <button
                onClick={() => setStep(1)}
                className="text-white/40 hover:text-white/60 text-body flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
