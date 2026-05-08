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
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  USE_CASES,
  saveUseCase,
  getUseCaseDefinition,
  type UseCase,
} from "@/lib/use-case";

/**
 * Comply onboarding wizard — Apple-HIG dark theme.
 *
 * Six steps (Sprint UF6 inserted use-case as step 1):
 *   0. Profile        — name + job title
 *   1. Use case       — operator / consultant / auditor / investor
 *   2. Organization   — name + jurisdiction + operator type
 *   3. Mission        — first-class mission entity (skippable)
 *   4. Spacecraft     — N rows of {name, missionType, orbitType,
 *                       status, optional NORAD-id} (skippable)
 *   5. Done           — summary card + use-case-aware landing CTA
 *
 * After step 5 we POST /api/onboarding/complete and redirect.
 *
 * Steps 3 + 4 are skippable. The use-case (step 1) is required and
 * personalizes the Done CTA + the Today inbox welcome line.
 */

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

const MISSION_TYPES = [
  { value: "communication", label: "Communications" },
  { value: "earth_observation", label: "Earth observation" },
  { value: "navigation", label: "Navigation / PNT" },
  { value: "science", label: "Science" },
  { value: "sar", label: "Synthetic Aperture Radar" },
  { value: "technology_demonstration", label: "Technology demo" },
  { value: "other", label: "Other" },
] as const;

const ORBIT_TYPES = [
  { value: "LEO", label: "LEO (Low Earth Orbit)" },
  { value: "MEO", label: "MEO (Medium Earth Orbit)" },
  { value: "GEO", label: "GEO (Geostationary)" },
  { value: "HEO", label: "Highly Elliptical Orbit" },
] as const;

// Sprint M-Onboarding — Mission step. Maps to the Mission Prisma
// enum (post Sprint M1 schema). NOT the same as the Spacecraft.missionType
// free-text field above (which is per-spacecraft and pre-dates the
// first-class Mission entity).
const MISSION_ENTITY_TYPES = [
  { value: "EARTH_OBSERVATION", label: "Earth observation" },
  { value: "COMMUNICATIONS", label: "Communications" },
  { value: "NAVIGATION", label: "Navigation / PNT" },
  { value: "SCIENCE", label: "Science" },
  { value: "IOD", label: "In-orbit demonstration" },
  { value: "TECH_DEMO", label: "Technology demo" },
  { value: "HUMAN_SPACEFLIGHT", label: "Human spaceflight" },
  { value: "OOS_ADR", label: "On-orbit servicing / ADR" },
  { value: "LAUNCH", label: "Launch" },
  { value: "OTHER", label: "Other" },
] as const;

const MISSION_PROGRAM_PHASES = [
  { value: "PHASE_A", label: "Phase A · Concept studies" },
  { value: "PHASE_B", label: "Phase B · Concept development" },
  { value: "PHASE_C", label: "Phase C · Preliminary design" },
  { value: "PHASE_D", label: "Phase D · Build & launch" },
  { value: "PHASE_E", label: "Phase E · Operations" },
  { value: "PHASE_F", label: "Phase F · Closeout" },
] as const;

interface SpacecraftDraft {
  id: string; // local-only key for React
  name: string;
  missionType: string;
  orbitType: string;
  status: "PRE_LAUNCH" | "LAUNCHED" | "OPERATIONAL";
  noradId: string;
  launchDate: string;
}

const SANS_FONT =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const DISPLAY_FONT =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

function emptySpacecraft(): SpacecraftDraft {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    missionType: "communication",
    orbitType: "LEO",
    status: "PRE_LAUNCH",
    noradId: "",
    launchDate: "",
  };
}

// ─── Step indicator (Apple-style: dots, no green ticks) ──────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === current ? 18 : 6,
            background:
              i <= current
                ? "rgba(255, 255, 255, 0.92)"
                : "rgba(255, 255, 255, 0.16)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(1);

  const firstName = session?.user?.name?.split(" ")[0] || "";

  // Step 0 — Profile
  const [fullName, setFullName] = useState(session?.user?.name || "");
  const [jobTitle, setJobTitle] = useState("");

  // Step 1 (NEW — Sprint UF6) — Use case persona. Personalizes the
  // Done step CTA + the Today inbox welcome copy. Stored to
  // localStorage on continue so other client surfaces (Help drawer,
  // Today page) can read it without a server round-trip.
  const [useCase, setUseCase] = useState<UseCase | "">("");

  // Step 2 — Organization
  const [orgName, setOrgName] = useState("");
  const [country, setCountry] = useState("");
  const [operatorType, setOperatorType] = useState("");

  // Step 3 (Sprint M-Onboarding) — Mission as canonical first asset.
  // Group spacecraft under a Mission. Skippable for orgs that genuinely
  // can't define a mission yet (e.g. pre-concept consultants).
  const [missionName, setMissionName] = useState("");
  const [missionEntityType, setMissionEntityType] =
    useState<(typeof MISSION_ENTITY_TYPES)[number]["value"]>(
      "EARTH_OBSERVATION",
    );
  const [missionProgramPhase, setMissionProgramPhase] =
    useState<(typeof MISSION_PROGRAM_PHASES)[number]["value"]>("PHASE_A");
  const [missionPrimaryEndUser, setMissionPrimaryEndUser] = useState("");
  const [skippedMission, setSkippedMission] = useState(false);
  const [savedMissionId, setSavedMissionId] = useState<string | null>(null);

  // Step 4 (was Step 3) — Spacecraft. Auto-assigned to savedMissionId
  // after successful registration if available.
  const [spacecraft, setSpacecraft] = useState<SpacecraftDraft[]>([
    emptySpacecraft(),
  ]);
  const [skippedSpacecraft, setSkippedSpacecraft] = useState(false);
  const [savedSpacecraftCount, setSavedSpacecraftCount] = useState(0);
  const [assignedToMissionCount, setAssignedToMissionCount] = useState(0);

  // ── Step transitions ──

  // Step 0 → 1 — Profile saved.
  const handleStep0Next = async () => {
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
    } catch {
      // Non-critical; continue.
    }
    setSaving(false);
    setDirection(1);
    setStep(1);
  };

  // Step 1 → 2 — Use case persisted to localStorage. Server doesn't
  // need to know yet (Prisma migration deferred); the Today page
  // and Help drawer read straight from localStorage.
  const handleStep1Next = () => {
    if (!useCase) return;
    saveUseCase(useCase);
    setDirection(1);
    setStep(2);
  };

  // Step 2 → 3 — Organization saved.
  const handleStep2Next = async () => {
    if (!orgName.trim() || !country || !operatorType) return;
    setSaving(true);
    try {
      await fetch("/api/onboarding/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName.trim(),
          country,
          operatorType,
        }),
      });
    } catch {
      // Continue regardless.
    }
    setSaving(false);
    setDirection(1);
    setStep(3);
  };

  // Step 3 → 4 — Mission. Skippable; on save, capture missionId so
  // the Spacecraft step can auto-assign created spacecraft.
  const handleStep3Next = async (skip = false) => {
    if (skip || !missionName.trim()) {
      setSkippedMission(true);
      setSavedMissionId(null);
      setDirection(1);
      setStep(4);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: missionName.trim(),
          missionType: missionEntityType,
          programPhase: missionProgramPhase,
          status: "PLANNED",
          primaryEndUser: missionPrimaryEndUser.trim() || null,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { mission?: { id?: string } };
        setSavedMissionId(data.mission?.id ?? null);
        setSkippedMission(false);
      } else {
        setSavedMissionId(null);
        setSkippedMission(true);
      }
    } catch {
      setSavedMissionId(null);
      setSkippedMission(true);
    }
    setSaving(false);
    setDirection(1);
    setStep(4);
  };

  // Step 4 → 5 — Spacecraft. After successful POST, also
  // auto-assigns each created spacecraft to the just-created Mission
  // (if missionId is set) via the Sprint Mission-4 bulk endpoint.
  const handleStep4Next = async (skip = false) => {
    if (skip) {
      setSkippedSpacecraft(true);
      setSavedSpacecraftCount(0);
      setDirection(1);
      setStep(5);
      return;
    }

    const valid = spacecraft.filter((s) => s.name.trim().length > 0);
    if (valid.length === 0) {
      setSkippedSpacecraft(true);
      setSavedSpacecraftCount(0);
      setDirection(1);
      setStep(5);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        spacecraft: valid.map((s) => ({
          name: s.name.trim(),
          missionType: s.missionType,
          orbitType: s.orbitType,
          status: s.status,
          launchDate: s.launchDate
            ? new Date(s.launchDate).toISOString()
            : null,
          noradId: s.noradId.trim() || null,
        })),
      };
      const res = await fetch("/api/onboarding/spacecraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          count?: number;
          spacecraft?: Array<{ id: string }>;
        };
        const count = data.count ?? valid.length;
        setSavedSpacecraftCount(count);

        // Sprint M-Onboarding — auto-assign to the Mission created in
        // step 3, if any. Best-effort; a failure here doesn't break
        // the wizard (the user can assign later from the mission
        // detail page).
        const spacecraftIds = (data.spacecraft ?? [])
          .map((s) => s.id)
          .filter((id): id is string => Boolean(id));
        if (savedMissionId && spacecraftIds.length > 0) {
          try {
            const bulkRes = await fetch(
              `/api/missions/${savedMissionId}/spacecraft/bulk`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  spacecraftIds,
                  role: "primary",
                  startingSlot: 1,
                }),
              },
            );
            if (bulkRes.ok) {
              const bulkData = (await bulkRes.json()) as {
                assigned?: number;
              };
              setAssignedToMissionCount(bulkData.assigned ?? 0);
            }
          } catch {
            // Non-critical
          }
        }
      } else {
        setSavedSpacecraftCount(0);
      }
    } catch {
      setSavedSpacecraftCount(0);
    }
    setSaving(false);
    setDirection(1);
    setStep(5);
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

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const goNext = () => {
    if (step === 0) handleStep0Next();
    else if (step === 1) handleStep1Next();
    else if (step === 2) handleStep2Next();
    else if (step === 3) handleStep3Next(false);
    else if (step === 4) handleStep4Next(false);
  };

  const canContinue =
    step === 0
      ? fullName.trim().length > 0
      : step === 1
        ? Boolean(useCase)
        : step === 2
          ? orgName.trim().length > 0 && country && operatorType
          : true; // Steps 3 (Mission) + 4 (Spacecraft) — skip path always available

  // ── Spacecraft helpers ──

  const addSpacecraft = () => {
    if (spacecraft.length >= 12) return;
    setSpacecraft((sc) => [...sc, emptySpacecraft()]);
  };

  const removeSpacecraft = (id: string) => {
    setSpacecraft((sc) =>
      sc.length === 1 ? sc : sc.filter((s) => s.id !== id),
    );
  };

  const updateSpacecraft = (id: string, patch: Partial<SpacecraftDraft>) => {
    setSpacecraft((sc) =>
      sc.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div
      className="dark min-h-screen flex flex-col"
      style={{
        fontFamily: SANS_FONT,
        letterSpacing: "-0.005em",
        background:
          "radial-gradient(ellipse 1400px 900px at 100% 0%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(ellipse 1100px 800px at 0% 100%, rgba(255,255,255,0.025) 0%, transparent 55%), #0a0c12",
        color: "rgba(255, 255, 255, 0.92)",
      }}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-8 py-6"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <span
          className="text-[15px] font-semibold text-white"
          style={{ letterSpacing: "-0.02em" }}
        >
          Caelex
          <span
            className="ml-1.5 font-normal"
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          >
            Comply
          </span>
        </span>
        <StepIndicator current={step} total={6} />
        <span
          className="text-[12px]"
          style={{ color: "rgba(255, 255, 255, 0.45)" }}
        >
          Step {step + 1} of 6
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-[600px]">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              >
                <h1
                  className="text-[34px] font-semibold text-white"
                  style={{
                    fontFamily: DISPLAY_FONT,
                    letterSpacing: "-0.022em",
                    lineHeight: 1.1,
                  }}
                >
                  Welcome{firstName ? `, ${firstName}` : ""}
                </h1>
                <p
                  className="mt-2 mb-10 text-[15px] leading-relaxed"
                  style={{ color: "rgba(255, 255, 255, 0.55)" }}
                >
                  Let&apos;s set up your compliance workspace. Takes about a
                  minute.
                </p>

                <div className="space-y-5">
                  <FormField
                    label="Full name"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Your full name"
                    autoFocus
                  />
                  <FormField
                    label="Job title"
                    optional
                    value={jobTitle}
                    onChange={setJobTitle}
                    placeholder="e.g. Compliance Officer"
                  />
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
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              >
                <h1
                  className="text-[34px] font-semibold text-white"
                  style={{
                    fontFamily: DISPLAY_FONT,
                    letterSpacing: "-0.022em",
                    lineHeight: 1.1,
                  }}
                >
                  How will you use Caelex?
                </h1>
                <p
                  className="mt-2 mb-8 text-[15px] leading-relaxed"
                  style={{ color: "rgba(255, 255, 255, 0.55)" }}
                >
                  This personalizes your dashboard, sets your default landing
                  page, and shapes the help drawer&apos;s suggestions. Pick the
                  closest fit — you can change it later.
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {USE_CASES.map((u) => {
                    const Icon = u.icon;
                    const selected = useCase === u.code;
                    return (
                      <button
                        key={u.code}
                        type="button"
                        onClick={() => setUseCase(u.code)}
                        className="flex items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors"
                        style={{
                          background: selected
                            ? "rgba(255, 255, 255, 0.08)"
                            : "rgba(255, 255, 255, 0.03)",
                          boxShadow: selected
                            ? "inset 0 1px 0 0 rgba(255, 255, 255, 0.18), 0 0 0 0.5px rgba(255, 255, 255, 0.18)"
                            : "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        <Icon
                          className="mt-0.5 h-4 w-4 shrink-0"
                          strokeWidth={1.75}
                          style={{
                            color: selected
                              ? "rgba(255, 255, 255, 0.95)"
                              : "rgba(255, 255, 255, 0.5)",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-[13.5px] font-medium"
                            style={{
                              color: selected
                                ? "rgba(255, 255, 255, 0.95)"
                                : "rgba(255, 255, 255, 0.85)",
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {u.label}
                          </div>
                          <div
                            className="mt-0.5 text-[12px] leading-relaxed"
                            style={{
                              color: "rgba(255, 255, 255, 0.45)",
                            }}
                          >
                            {u.description}
                          </div>
                        </div>
                        {selected ? (
                          <Check
                            className="mt-1 h-3.5 w-3.5 shrink-0"
                            strokeWidth={2.2}
                            style={{ color: "rgba(255, 255, 255, 0.95)" }}
                          />
                        ) : null}
                      </button>
                    );
                  })}
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
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              >
                <h1
                  className="text-[34px] font-semibold text-white"
                  style={{
                    fontFamily: DISPLAY_FONT,
                    letterSpacing: "-0.022em",
                    lineHeight: 1.1,
                  }}
                >
                  Your organization
                </h1>
                <p
                  className="mt-2 mb-8 text-[15px] leading-relaxed"
                  style={{ color: "rgba(255, 255, 255, 0.55)" }}
                >
                  This tailors your compliance assessment to the regulations
                  that actually apply to you.
                </p>

                <div className="space-y-5">
                  <FormField
                    label="Organization name"
                    value={orgName}
                    onChange={setOrgName}
                    placeholder="Your company name"
                    autoFocus
                  />
                  <SelectField
                    label="Primary jurisdiction"
                    value={country}
                    onChange={setCountry}
                    options={COUNTRIES.map((c) => ({
                      value: c.code,
                      label: c.label,
                    }))}
                    placeholder="Select country"
                  />
                  <div>
                    <label
                      className="mb-2 block text-[13px] font-medium"
                      style={{ color: "rgba(255, 255, 255, 0.85)" }}
                    >
                      Operator type
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
                            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors"
                            style={{
                              background: selected
                                ? "rgba(255, 255, 255, 0.08)"
                                : "rgba(255, 255, 255, 0.03)",
                              boxShadow: selected
                                ? "inset 0 1px 0 0 rgba(255, 255, 255, 0.18), 0 0 0 0.5px rgba(255, 255, 255, 0.18)"
                                : "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
                            }}
                          >
                            <Icon
                              className="h-4 w-4 shrink-0"
                              strokeWidth={1.75}
                              style={{
                                color: selected
                                  ? "rgba(255, 255, 255, 0.95)"
                                  : "rgba(255, 255, 255, 0.5)",
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div
                                className="text-[13.5px] font-medium"
                                style={{
                                  color: selected
                                    ? "rgba(255, 255, 255, 0.95)"
                                    : "rgba(255, 255, 255, 0.85)",
                                  letterSpacing: "-0.005em",
                                }}
                              >
                                {op.label}
                              </div>
                              <div
                                className="text-[12px]"
                                style={{
                                  color: "rgba(255, 255, 255, 0.45)",
                                }}
                              >
                                {op.description}
                              </div>
                            </div>
                            {selected ? (
                              <Check
                                className="h-3.5 w-3.5 shrink-0"
                                strokeWidth={2.2}
                                style={{ color: "rgba(255, 255, 255, 0.95)" }}
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              >
                <h1
                  className="text-[34px] font-semibold text-white"
                  style={{
                    fontFamily: DISPLAY_FONT,
                    letterSpacing: "-0.022em",
                    lineHeight: 1.1,
                  }}
                >
                  Your first mission
                </h1>
                <p
                  className="mt-2 mb-8 text-[15px] leading-relaxed"
                  style={{ color: "rgba(255, 255, 255, 0.55)" }}
                >
                  A mission groups one or more spacecraft serving the same
                  operational program — single satellite, constellation, or
                  launch campaign. You&apos;ll add spacecraft to it in the next
                  step.
                </p>

                <div className="space-y-5">
                  <FormField
                    label="Mission name"
                    value={missionName}
                    onChange={setMissionName}
                    placeholder='e.g. "ICEYE Constellation Phase 2"'
                    autoFocus
                  />
                  <SelectField
                    label="Mission type"
                    value={missionEntityType}
                    onChange={(v) =>
                      setMissionEntityType(
                        v as (typeof MISSION_ENTITY_TYPES)[number]["value"],
                      )
                    }
                    options={MISSION_ENTITY_TYPES.map((m) => ({
                      value: m.value,
                      label: m.label,
                    }))}
                  />
                  <SelectField
                    label="Program phase"
                    value={missionProgramPhase}
                    onChange={(v) =>
                      setMissionProgramPhase(
                        v as (typeof MISSION_PROGRAM_PHASES)[number]["value"],
                      )
                    }
                    options={MISSION_PROGRAM_PHASES.map((p) => ({
                      value: p.value,
                      label: p.label,
                    }))}
                  />
                  <FormField
                    label="Primary end-user"
                    optional
                    value={missionPrimaryEndUser}
                    onChange={setMissionPrimaryEndUser}
                    placeholder="e.g. ESA EOP-S, BMVg / Bundeswehr"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleStep3Next(true)}
                  className="mt-5 text-[13px] font-medium underline-offset-4 hover:underline"
                  style={{ color: "rgba(255, 255, 255, 0.5)" }}
                >
                  Skip — I&apos;ll create a mission later
                </button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              >
                <h1
                  className="text-[34px] font-semibold text-white"
                  style={{
                    fontFamily: DISPLAY_FONT,
                    letterSpacing: "-0.022em",
                    lineHeight: 1.1,
                  }}
                >
                  Your spacecraft
                </h1>
                <p
                  className="mt-2 mb-8 text-[15px] leading-relaxed"
                  style={{ color: "rgba(255, 255, 255, 0.55)" }}
                >
                  Add the spacecraft you operate (or plan to).
                  {savedMissionId
                    ? ` They'll be auto-assigned to "${missionName}" as primary spacecraft.`
                    : " We'll generate compliance items based on your jurisdiction."}
                </p>

                <div className="space-y-3">
                  {spacecraft.map((sc, idx) => (
                    <SpacecraftRow
                      key={sc.id}
                      index={idx}
                      total={spacecraft.length}
                      data={sc}
                      onChange={(patch) => updateSpacecraft(sc.id, patch)}
                      onRemove={() => removeSpacecraft(sc.id)}
                      removable={spacecraft.length > 1}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addSpacecraft}
                  disabled={spacecraft.length >= 12}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors disabled:opacity-40"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "rgba(255, 255, 255, 0.85)",
                  }}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Add another spacecraft
                  {spacecraft.length >= 12 ? " (max 12)" : ""}
                </button>

                <button
                  type="button"
                  onClick={() => handleStep4Next(true)}
                  className="mt-3 ml-3 text-[13px] font-medium underline-offset-4 hover:underline"
                  style={{ color: "rgba(255, 255, 255, 0.5)" }}
                >
                  Skip — I&apos;ll add later
                </button>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step-5"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    boxShadow:
                      "inset 0 1px 0 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <Sparkles
                    className="h-6 w-6"
                    strokeWidth={1.75}
                    style={{ color: "rgba(255, 255, 255, 0.92)" }}
                  />
                </div>
                <h1
                  className="text-[34px] font-semibold text-white"
                  style={{
                    fontFamily: DISPLAY_FONT,
                    letterSpacing: "-0.022em",
                    lineHeight: 1.1,
                  }}
                >
                  You&apos;re all set
                </h1>
                <p
                  className="mt-2 mb-8 text-[15px] leading-relaxed"
                  style={{ color: "rgba(255, 255, 255, 0.55)" }}
                >
                  {savedMissionId && savedSpacecraftCount > 0
                    ? `Workspace configured with mission "${missionName}" and ${savedSpacecraftCount} spacecraft${assignedToMissionCount > 0 ? ` (${assignedToMissionCount} assigned to mission)` : ""}. Run an applicability assessment next to populate your Today inbox.`
                    : savedMissionId
                      ? `Workspace configured with mission "${missionName}". Add spacecraft anytime from the mission detail page. Run an applicability assessment to start tracking compliance.`
                      : savedSpacecraftCount > 0
                        ? `Workspace configured with ${savedSpacecraftCount} spacecraft. Run an applicability assessment next to populate your Today inbox.`
                        : "Workspace configured. Create a mission and run an applicability assessment to start tracking compliance."}
                </p>

                <div
                  className="rounded-2xl p-5 mb-8"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    boxShadow:
                      "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <SummaryRow label="Name" value={fullName} />
                  {jobTitle ? (
                    <SummaryRow label="Role" value={jobTitle} />
                  ) : null}
                  {useCase ? (
                    <SummaryRow
                      label="Using Caelex as"
                      value={getUseCaseDefinition(useCase)?.label ?? useCase}
                    />
                  ) : null}
                  <SummaryDivider />
                  <SummaryRow label="Organization" value={orgName} />
                  <SummaryRow
                    label="Jurisdiction"
                    value={
                      COUNTRIES.find((c) => c.code === country)?.label ||
                      country
                    }
                  />
                  <SummaryRow
                    label="Operator type"
                    value={
                      OPERATOR_TYPES.find((o) => o.code === operatorType)
                        ?.label || operatorType
                    }
                  />
                  <SummaryDivider />
                  <SummaryRow
                    label="Mission"
                    value={
                      savedMissionId
                        ? missionName
                        : skippedMission
                          ? "Skipped"
                          : "None yet"
                    }
                  />
                  <SummaryRow
                    label="Spacecraft"
                    value={
                      savedSpacecraftCount > 0
                        ? assignedToMissionCount > 0
                          ? `${savedSpacecraftCount} added · ${assignedToMissionCount} assigned to mission`
                          : `${savedSpacecraftCount} added`
                        : "None yet"
                    }
                  />
                </div>

                {/* Sprint UF6 — CTAs adapt to chosen use-case persona.
                    Investors land on Assure, auditors on Audit Center,
                    others on the default Today inbox. The primary CTA
                    is still the assessment (everyone benefits) but the
                    fallback is now persona-aware. */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleComplete("/assessment/unified")}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold transition-colors disabled:opacity-50"
                    style={{
                      background: "rgba(255, 255, 255, 0.92)",
                      color: "rgb(20, 20, 22)",
                      letterSpacing: "-0.011em",
                    }}
                  >
                    Run applicability assessment
                    <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                  <button
                    onClick={() =>
                      handleComplete(
                        useCase
                          ? (getUseCaseDefinition(useCase)
                              ?.defaultLandingPath ?? "/dashboard/today")
                          : "/dashboard/today",
                      )
                    }
                    disabled={saving}
                    className="w-full text-center text-[13px] font-medium py-2 transition-colors hover:text-white"
                    style={{ color: "rgba(255, 255, 255, 0.55)" }}
                  >
                    {useCase === "investor"
                      ? "Skip — open Assure"
                      : useCase === "auditor"
                        ? "Skip — open Audit Center"
                        : "Skip — open my Today inbox"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom bar — shown on form steps (0-4); the final Done step (5)
          has its own CTAs. */}
      {step < 5 ? (
        <footer
          className="flex items-center justify-between px-8 py-5"
          style={{ borderTop: "0.5px solid rgba(255, 255, 255, 0.08)" }}
        >
          <div>
            {step > 0 ? (
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-white"
                style={{ color: "rgba(255, 255, 255, 0.55)" }}
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
                Back
              </button>
            ) : null}
          </div>
          <button
            onClick={goNext}
            disabled={!canContinue || saving}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              color: "rgb(20, 20, 22)",
              letterSpacing: "-0.011em",
            }}
          >
            {saving ? "Saving…" : "Continue"}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </footer>
      ) : null}
    </div>
  );
}

// ─── Small subcomponents ─────────────────────────────────────────────

function FormField({
  label,
  value,
  onChange,
  placeholder,
  optional,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  optional?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[13px] font-medium"
        style={{ color: "rgba(255, 255, 255, 0.85)" }}
      >
        {label}
        {optional ? (
          <span
            className="ml-1.5 font-normal"
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          >
            (optional)
          </span>
        ) : null}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-lg px-3.5 py-2.5 text-[14px] outline-none transition-colors placeholder:text-white/30"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          color: "rgba(255, 255, 255, 0.95)",
          boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
        }}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[13px] font-medium"
        style={{ color: "rgba(255, 255, 255, 0.85)" }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3.5 py-2.5 text-[14px] outline-none transition-colors"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          color: value
            ? "rgba(255, 255, 255, 0.95)"
            : "rgba(255, 255, 255, 0.4)",
          boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
        }}
      >
        <option value="" disabled>
          {placeholder ?? "Select…"}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ color: "#000" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SpacecraftRow({
  index,
  total,
  data,
  onChange,
  onRemove,
  removable,
}: {
  index: number;
  total: number;
  data: SpacecraftDraft;
  onChange: (patch: Partial<SpacecraftDraft>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[11px] font-semibold uppercase"
          style={{
            color: "rgba(255, 255, 255, 0.45)",
            letterSpacing: "0.06em",
          }}
        >
          Spacecraft {index + 1}
          {total > 1 ? ` of ${total}` : ""}
        </span>
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove spacecraft"
            className="rounded p-1 transition-colors"
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField
            label="Name"
            value={data.name}
            onChange={(v) => onChange({ name: v })}
            placeholder='e.g. "Bluebird-1"'
          />
        </div>
        <SelectField
          label="Mission type"
          value={data.missionType}
          onChange={(v) => onChange({ missionType: v })}
          options={MISSION_TYPES.map((m) => ({
            value: m.value,
            label: m.label,
          }))}
        />
        <SelectField
          label="Orbit"
          value={data.orbitType}
          onChange={(v) => onChange({ orbitType: v })}
          options={ORBIT_TYPES.map((o) => ({ value: o.value, label: o.label }))}
        />
        <div className="sm:col-span-2">
          <label
            className="mb-1.5 block text-[13px] font-medium"
            style={{ color: "rgba(255, 255, 255, 0.85)" }}
          >
            Status
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { v: "PRE_LAUNCH", label: "Pre-launch" },
                { v: "LAUNCHED", label: "Launched" },
                { v: "OPERATIONAL", label: "Operational" },
              ] as const
            ).map((opt) => {
              const selected = data.status === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => onChange({ status: opt.v })}
                  className="rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors"
                  style={{
                    background: selected
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(255, 255, 255, 0.03)",
                    color: selected
                      ? "rgba(255, 255, 255, 0.95)"
                      : "rgba(255, 255, 255, 0.55)",
                    boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        {data.status === "OPERATIONAL" || data.status === "LAUNCHED" ? (
          <FormField
            label="NORAD ID"
            optional
            value={data.noradId}
            onChange={(v) => onChange({ noradId: v })}
            placeholder="e.g. 25544"
          />
        ) : null}
        {data.status === "PRE_LAUNCH" ? (
          <div>
            <label
              className="mb-1.5 block text-[13px] font-medium"
              style={{ color: "rgba(255, 255, 255, 0.85)" }}
            >
              Target launch
              <span
                className="ml-1.5 font-normal"
                style={{ color: "rgba(255, 255, 255, 0.4)" }}
              >
                (optional)
              </span>
            </label>
            <input
              type="date"
              value={data.launchDate}
              onChange={(e) => onChange({ launchDate: e.target.value })}
              className="w-full rounded-lg px-3.5 py-2.5 text-[14px] outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                color: "rgba(255, 255, 255, 0.95)",
                boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
                colorScheme: "dark",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span
        className="text-[13px]"
        style={{ color: "rgba(255, 255, 255, 0.5)" }}
      >
        {label}
      </span>
      <span
        className="text-[13px] font-medium text-right"
        style={{
          color: "rgba(255, 255, 255, 0.95)",
          letterSpacing: "-0.005em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryDivider() {
  return (
    <div
      className="my-2"
      style={{ borderTop: "0.5px solid rgba(255, 255, 255, 0.08)" }}
    />
  );
}
