"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  FileCheck,
  Upload,
  CalendarClock,
  ArrowRight,
  Download,
  SkipForward,
  CheckCircle,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { CaelexIcon } from "@/components/ui/Logo";

const STORAGE_KEY = "caelex-onboarding-complete";
const PENDING_ASSESSMENT_KEY = "caelex-pending-assessment";

type OnboardingStep = 1 | 2 | 3;

export default function OnboardingOverlay() {
  const { data: session, status: sessionStatus } = useSession();
  const { organization, isLoading: orgLoading } = useOrganization();
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<OnboardingStep>(1);
  const [hasPendingAssessment, setHasPendingAssessment] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  // Determine visibility on mount
  useEffect(() => {
    if (sessionStatus === "loading" || orgLoading) return;

    // Don't show if not authenticated
    if (!session?.user) return;

    // Don't show if already completed onboarding
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (completed === "true") return;
    }

    // Only show for users who have just signed up (no organization yet)
    // OR users with a fresh organization (new signups get org created on first load)
    // The key signal: if they haven't completed onboarding before, show it.
    setVisible(true);

    // Check for pending assessment data
    if (typeof window !== "undefined") {
      const pending = localStorage.getItem(PENDING_ASSESSMENT_KEY);
      if (pending) {
        setHasPendingAssessment(true);
      }
    }
  }, [session, sessionStatus, organization, orgLoading]);

  const handleComplete = useCallback(() => {
    setClosing(true);
    // Mark as complete in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    // Delay to let exit animation play
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 400);
  }, []);

  const handleImportAssessment = useCallback(async () => {
    setImporting(true);
    setImportError(null);

    try {
      const pendingData = localStorage.getItem(PENDING_ASSESSMENT_KEY);
      if (!pendingData) {
        throw new Error("No assessment data found");
      }

      const parsed = JSON.parse(pendingData);

      const response = await fetch("/api/tracker/import-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: parsed.operatorType || parsed,
          complianceResult: parsed.complianceResult,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to import assessment");
      }

      // Clear the pending assessment
      localStorage.removeItem(PENDING_ASSESSMENT_KEY);
      setImportSuccess(true);

      // Move to step 3 after a brief delay
      setTimeout(() => {
        setStep(3);
      }, 1200);
    } catch (err) {
      console.error("Onboarding import error:", err);
      setImportError(
        "Import failed. You can import manually from the dashboard.",
      );
    } finally {
      setImporting(false);
    }
  }, []);

  const goToStep2Or3 = useCallback(() => {
    if (hasPendingAssessment) {
      setStep(2);
    } else {
      setStep(3);
    }
  }, [hasPendingAssessment]);

  const handleQuickAction = useCallback(
    (path: string) => {
      handleComplete();
      router.push(path);
    },
    [handleComplete, router],
  );

  // Total steps for progress dots (2 if no pending assessment, 3 if there is)
  const totalSteps = hasPendingAssessment ? 3 : 2;
  const displayStep =
    !hasPendingAssessment && step >= 2 ? ((step - 1) as OnboardingStep) : step;

  if (!visible) return null;

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <AnimatePresence>
      {!closing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
              delay: 0.1,
            }}
            className="relative w-full max-w-lg bg-white dark:bg-[#111113] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden"
          >
            {/* Progress Dots */}
            <div className="flex items-center justify-center gap-2 pt-6 pb-2">
              {Array.from({ length: totalSteps }, (_, i) => {
                const dotStep = i + 1;
                const isActive = displayStep === dotStep;
                const isCompleted = displayStep > dotStep;
                return (
                  <div
                    key={i}
                    className={`
                      h-1.5 rounded-full transition-all duration-300
                      ${isActive ? "w-8 bg-emerald-500" : isCompleted ? "w-1.5 bg-emerald-500/40" : "w-1.5 bg-slate-300 dark:bg-white/10"}
                    `}
                  />
                );
              })}
            </div>

            {/* Step Content */}
            <div className="px-8 pb-8 pt-4">
              <AnimatePresence mode="wait">
                {/* ── Step 1: Welcome ── */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="text-center"
                  >
                    {/* Icon */}
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                      <CaelexIcon size={32} className="text-emerald-500" />
                    </div>

                    <h2 className="text-[22px] font-semibold text-slate-900 dark:text-white mb-2">
                      Welcome to Caelex
                      {firstName !== "there" ? `, ${firstName}` : ""}
                    </h2>

                    <p className="text-[14px] text-slate-600 dark:text-white/60 mb-2">
                      Let&apos;s set up your compliance workspace in 30 seconds
                    </p>

                    {session?.user?.name && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] mb-8">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            {session.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-[12px] text-slate-700 dark:text-white/70">
                          {session.user.name}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={goToStep2Or3}
                      className="
                        w-full flex items-center justify-center gap-2
                        bg-emerald-600 hover:bg-emerald-700 text-white
                        text-[14px] font-medium px-6 py-3 rounded-xl
                        transition-all duration-200
                        shadow-sm shadow-emerald-500/20
                      "
                    >
                      Get Started
                      <ArrowRight size={16} />
                    </button>
                  </motion.div>
                )}

                {/* ── Step 2: Assessment Import ── */}
                {step === 2 && hasPendingAssessment && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Icon */}
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                      <Download
                        size={28}
                        strokeWidth={1.5}
                        className="text-blue-500"
                      />
                    </div>

                    <div className="text-center mb-6">
                      <h2 className="text-[20px] font-semibold text-slate-900 dark:text-white mb-2">
                        Assessment Results Found
                      </h2>
                      <p className="text-[14px] text-slate-600 dark:text-white/60">
                        We found your assessment results! Import them to
                        auto-populate your compliance dashboard.
                      </p>
                    </div>

                    {/* Status indicator */}
                    {importSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 justify-center text-emerald-600 dark:text-emerald-400 mb-4"
                      >
                        <CheckCircle size={16} />
                        <span className="text-[13px] font-medium">
                          Assessment imported successfully!
                        </span>
                      </motion.div>
                    )}

                    {importError && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-[13px] text-red-500 dark:text-red-400 mb-4"
                      >
                        {importError}
                      </motion.div>
                    )}

                    {!importSuccess && (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleImportAssessment}
                          disabled={importing}
                          className="
                            w-full flex items-center justify-center gap-2
                            bg-blue-600 hover:bg-blue-700 text-white
                            text-[14px] font-medium px-6 py-3 rounded-xl
                            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                            shadow-sm shadow-blue-500/20
                          "
                        >
                          {importing ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              Import Assessment
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setStep(3)}
                          disabled={importing}
                          className="
                            w-full flex items-center justify-center gap-2
                            text-slate-600 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/70
                            text-[13px] px-6 py-2.5 rounded-xl
                            transition-all duration-200
                            hover:bg-slate-50 dark:hover:bg-white/[0.03]
                          "
                        >
                          <SkipForward size={14} />
                          Skip for now
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Step 3: Next Steps ── */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Icon */}
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                      <Sparkles
                        size={28}
                        strokeWidth={1.5}
                        className="text-emerald-500"
                      />
                    </div>

                    <div className="text-center mb-6">
                      <h2 className="text-[20px] font-semibold text-slate-900 dark:text-white mb-2">
                        Your workspace is ready!
                      </h2>
                      <p className="text-[14px] text-slate-600 dark:text-white/60">
                        Here&apos;s what to do next:
                      </p>
                    </div>

                    {/* Quick action cards */}
                    <div className="flex flex-col gap-2.5 mb-6">
                      <button
                        onClick={() =>
                          handleQuickAction("/dashboard/modules/authorization")
                        }
                        className="
                          group flex items-center gap-4 w-full
                          px-4 py-3.5 rounded-xl
                          bg-slate-50 dark:bg-white/[0.04]
                          border border-slate-200 dark:border-white/[0.08]
                          hover:border-emerald-300 dark:hover:border-emerald-500/30
                          hover:bg-emerald-50/50 dark:hover:bg-emerald-500/[0.04]
                          transition-all duration-200 text-left
                        "
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center flex-shrink-0">
                          <FileCheck
                            size={18}
                            strokeWidth={1.5}
                            className="text-blue-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-900 dark:text-white">
                            Start Authorization
                          </p>
                          <p className="text-[12px] text-slate-500 dark:text-white/40">
                            Begin the EU Space Act authorization process
                          </p>
                        </div>
                        <ArrowRight
                          size={14}
                          className="text-slate-300 dark:text-white/15 group-hover:text-emerald-500 transition-colors flex-shrink-0"
                        />
                      </button>

                      <button
                        onClick={() =>
                          handleQuickAction("/dashboard/documents")
                        }
                        className="
                          group flex items-center gap-4 w-full
                          px-4 py-3.5 rounded-xl
                          bg-slate-50 dark:bg-white/[0.04]
                          border border-slate-200 dark:border-white/[0.08]
                          hover:border-emerald-300 dark:hover:border-emerald-500/30
                          hover:bg-emerald-50/50 dark:hover:bg-emerald-500/[0.04]
                          transition-all duration-200 text-left
                        "
                      >
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center flex-shrink-0">
                          <Upload
                            size={18}
                            strokeWidth={1.5}
                            className="text-amber-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-900 dark:text-white">
                            Upload Documents
                          </p>
                          <p className="text-[12px] text-slate-500 dark:text-white/40">
                            Add compliance documents and evidence
                          </p>
                        </div>
                        <ArrowRight
                          size={14}
                          className="text-slate-300 dark:text-white/15 group-hover:text-emerald-500 transition-colors flex-shrink-0"
                        />
                      </button>

                      <button
                        onClick={() => handleQuickAction("/dashboard/timeline")}
                        className="
                          group flex items-center gap-4 w-full
                          px-4 py-3.5 rounded-xl
                          bg-slate-50 dark:bg-white/[0.04]
                          border border-slate-200 dark:border-white/[0.08]
                          hover:border-emerald-300 dark:hover:border-emerald-500/30
                          hover:bg-emerald-50/50 dark:hover:bg-emerald-500/[0.04]
                          transition-all duration-200 text-left
                        "
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/15 flex items-center justify-center flex-shrink-0">
                          <CalendarClock
                            size={18}
                            strokeWidth={1.5}
                            className="text-purple-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-900 dark:text-white">
                            Set Deadlines
                          </p>
                          <p className="text-[12px] text-slate-500 dark:text-white/40">
                            Configure compliance milestones and reminders
                          </p>
                        </div>
                        <ArrowRight
                          size={14}
                          className="text-slate-300 dark:text-white/15 group-hover:text-emerald-500 transition-colors flex-shrink-0"
                        />
                      </button>
                    </div>

                    <button
                      onClick={handleComplete}
                      className="
                        w-full flex items-center justify-center gap-2
                        bg-emerald-600 hover:bg-emerald-700 text-white
                        text-[14px] font-medium px-6 py-3 rounded-xl
                        transition-all duration-200
                        shadow-sm shadow-emerald-500/20
                      "
                    >
                      <LayoutDashboard size={16} />
                      Go to Dashboard
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
