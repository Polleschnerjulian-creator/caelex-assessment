"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Plus,
  Scale,
  Globe,
  Users,
  Building2,
  AlertOctagon,
  FileWarning,
  RefreshCw,
  Download,
  Info,
  Lock,
  Gavel,
  Search,
  BookOpen,
  CircleDot,
  ExternalLink,
} from "lucide-react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";
type RiskLevel = "critical" | "high" | "medium" | "low";
type Regulation = "ITAR" | "EAR";

interface RequirementStatus {
  id: string;
  requirementId: string;
  status: ComplianceStatus;
  notes: string | null;
  evidenceNotes: string | null;
  targetDate: string | null;
  responsibleParty: string | null;
  requirement: {
    id: string;
    title: string;
    description: string;
    regulation: Regulation;
    category: string;
    cfrReference: string;
    riskLevel: RiskLevel;
    isMandatory: boolean;
  } | null;
}

interface Assessment {
  id: string;
  assessmentName: string | null;
  status: string;
  companyTypes: string;
  hasITARItems: boolean;
  hasEARItems: boolean;
  hasForeignNationals: boolean;
  registeredWithDDTC: boolean;
  hasTCP: boolean;
  jurisdictionDetermination: string | null;
  riskLevel: string | null;
  overallComplianceScore: number | null;
  itarComplianceScore: number | null;
  earComplianceScore: number | null;
  criticalGaps: number | null;
  highGaps: number | null;
  maxCivilPenalty: number | null;
  maxImprisonment: number | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// LEGAL DISCLAIMER BANNER
// ============================================================================

function LegalDisclaimerBanner({
  onAcknowledge,
}: {
  onAcknowledge: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 p-4"
    >
      <div className="max-w-2xl w-full bg-red-950/50 border-2 border-red-500 rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <AlertOctagon className="w-8 h-8 text-red-500 flex-shrink-0" />
          <h2 className="text-xl sm:text-2xl font-bold text-red-400">
            IMPORTANT LEGAL DISCLAIMER
          </h2>
        </div>

        <div className="space-y-4 text-sm sm:text-base text-slate-300">
          <p>
            This module is for{" "}
            <strong className="text-slate-900 dark:text-white">
              COMPLIANCE TRACKING AND EDUCATIONAL PURPOSES ONLY
            </strong>
            . It does <strong className="text-red-400">NOT</strong> constitute
            legal advice and should{" "}
            <strong className="text-red-400">NOT</strong> be relied upon for
            export control compliance decisions.
          </p>

          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="font-bold text-red-400 mb-2">
              POTENTIAL PENALTIES FOR VIOLATIONS:
            </p>
            <ul className="list-disc list-inside space-y-1 text-red-300">
              <li>
                <strong>ITAR:</strong> Up to $1,000,000 per violation + 20 years
                imprisonment
              </li>
              <li>
                <strong>EAR:</strong> Up to $300,000 per violation + criminal
                prosecution
              </li>
              <li>Debarment from government contracts</li>
              <li>Loss of export privileges</li>
            </ul>
          </div>

          <p>
            <strong className="text-amber-400">ALWAYS</strong> consult with
            qualified export control counsel and/or the appropriate government
            agencies (DDTC, BIS) before making any export control decisions.
          </p>
        </div>

        <button
          onClick={onAcknowledge}
          className="mt-6 w-full bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          I Understand and Acknowledge
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ASSESSMENT WIZARD STEPS
// ============================================================================

function WizardStep1({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const companyTypes = [
    {
      id: "spacecraft_manufacturer",
      label: "Spacecraft Manufacturer",
      description: "Designs/builds satellites or spacecraft",
    },
    {
      id: "satellite_operator",
      label: "Satellite Operator",
      description: "Operates satellites in orbit",
    },
    {
      id: "launch_provider",
      label: "Launch Provider",
      description: "Provides launch services",
    },
    {
      id: "component_supplier",
      label: "Component Supplier",
      description: "Supplies space-related components",
    },
    {
      id: "software_developer",
      label: "Software Developer",
      description: "Develops space-related software",
    },
    {
      id: "technology_provider",
      label: "Technology Provider",
      description: "Provides technical data or services",
    },
    {
      id: "defense_contractor",
      label: "Defense Contractor",
      description: "Works on defense/military space programs",
    },
    {
      id: "research_institution",
      label: "Research Institution",
      description: "Academic or research organization",
    },
  ];

  const selected = (data.companyTypes as string[]) || [];

  const toggleType = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((t) => t !== id)
      : [...selected, id];
    onChange({ ...data, companyTypes: newSelected });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Organization Type
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60">
          Select all that apply to your organization
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {companyTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => toggleType(type.id)}
            className={`p-3 sm:p-4 rounded-lg border text-left transition-all ${
              selected.includes(type.id)
                ? "bg-blue-600/20 border-blue-500 text-white"
                : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 hover:border-slate-500"
            }`}
          >
            <div className="font-medium text-sm sm:text-base">{type.label}</div>
            <div className="text-xs text-slate-600 dark:text-white/70 mt-1">
              {type.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WizardStep2({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Regulatory Scope
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60">
          What types of items do you handle?
        </p>
      </div>

      <div className="space-y-4">
        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasITARItems
              ? "bg-red-900/20 border-red-700"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          }`}
        >
          <input
            type="checkbox"
            checked={!!data.hasITARItems}
            onChange={(e) =>
              onChange({ ...data, hasITARItems: e.target.checked })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-500" />
              ITAR-Controlled Items
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Defense articles on the U.S. Munitions List (USML), including most
              spacecraft, launch vehicles, and military satellite components
            </p>
            {Boolean(data.hasITARItems) && (
              <div className="mt-2 text-xs text-red-400 bg-red-900/30 p-2 rounded">
                DDTC Registration Required • Max Penalty: $1M + 20 years
              </div>
            )}
          </div>
        </label>

        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasEARItems
              ? "bg-amber-900/20 border-amber-700"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          }`}
        >
          <input
            type="checkbox"
            checked={!!data.hasEARItems}
            onChange={(e) =>
              onChange({ ...data, hasEARItems: e.target.checked })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500" />
              EAR-Controlled Items
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Commercial items on the Commerce Control List (CCL) or EAR99,
              including commercial satellites and dual-use space technology
            </p>
            {Boolean(data.hasEARItems) && (
              <div className="mt-2 text-xs text-amber-400 bg-amber-900/30 p-2 rounded">
                BIS License May Be Required • Max Penalty: $300K per violation
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}

function WizardStep3({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Risk Factors
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60">
          Additional factors that affect compliance requirements
        </p>
      </div>

      <div className="space-y-3">
        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasForeignNationals
              ? "bg-amber-900/20 border-amber-700"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          }`}
        >
          <input
            type="checkbox"
            checked={!!data.hasForeignNationals}
            onChange={(e) =>
              onChange({ ...data, hasForeignNationals: e.target.checked })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4" />
              Foreign National Employees
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Employs non-U.S. persons who may access controlled technology
            </p>
            {Boolean(data.hasForeignNationals) && (
              <div className="mt-2 text-xs text-amber-400 bg-amber-900/30 p-2 rounded">
                Deemed Export Rules Apply • Technology Control Plan Required
              </div>
            )}
          </div>
        </label>

        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasTechnologyTransfer
              ? "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          } ${data.hasTechnologyTransfer && "border-blue-600"}`}
        >
          <input
            type="checkbox"
            checked={!!data.hasTechnologyTransfer}
            onChange={(e) =>
              onChange({ ...data, hasTechnologyTransfer: e.target.checked })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">
              Technology Transfer Activities
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Shares technical data with foreign persons or entities
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasDefenseContracts
              ? "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          } ${data.hasDefenseContracts && "border-blue-600"}`}
        >
          <input
            type="checkbox"
            checked={!!data.hasDefenseContracts}
            onChange={(e) =>
              onChange({ ...data, hasDefenseContracts: e.target.checked })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">
              Defense Contracts
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Works on DoD or other government defense contracts
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasManufacturingAbroad
              ? "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          } ${data.hasManufacturingAbroad && "border-blue-600"}`}
        >
          <input
            type="checkbox"
            checked={!!data.hasManufacturingAbroad}
            onChange={(e) =>
              onChange({ ...data, hasManufacturingAbroad: e.target.checked })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">
              Foreign Manufacturing
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Has manufacturing facilities or co-production outside the U.S.
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasJointVentures
              ? "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          } ${data.hasJointVentures && "border-blue-600"}`}
        >
          <input
            type="checkbox"
            checked={!!data.hasJointVentures}
            onChange={(e) =>
              onChange({ ...data, hasJointVentures: e.target.checked })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">
              Joint Ventures with Foreign Partners
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Participates in joint ventures involving foreign persons/entities
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

function WizardStep4({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Current Compliance Status
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60">
          Your existing compliance infrastructure
        </p>
      </div>

      <div className="space-y-3">
        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.registeredWithDDTC
              ? "bg-green-900/20 border-green-700"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          }`}
        >
          <input
            type="checkbox"
            checked={!!data.registeredWithDDTC}
            onChange={(e) =>
              onChange({ ...data, registeredWithDDTC: e.target.checked })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">
              Registered with DDTC
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Currently registered with Directorate of Defense Trade Controls
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasTCP
              ? "bg-green-900/20 border-green-700"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          }`}
        >
          <input
            type="checkbox"
            checked={!!data.hasTCP}
            onChange={(e) => onChange({ ...data, hasTCP: e.target.checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">
              Technology Control Plan (TCP)
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Has implemented a Technology Control Plan for ITAR data
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasAutomatedScreening
              ? "bg-green-900/20 border-green-700"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          }`}
        >
          <input
            type="checkbox"
            checked={!!data.hasAutomatedScreening}
            onChange={(e) =>
              onChange({ ...data, hasAutomatedScreening: e.target.checked })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">
              Automated Restricted Party Screening
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Uses automated screening against SDN, Entity List, DPL
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
            data.hasECL
              ? "bg-green-900/20 border-green-700"
              : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-slate-500"
          }`}
        >
          <input
            type="checkbox"
            checked={!!data.hasECL}
            onChange={(e) => onChange({ ...data, hasECL: e.target.checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">
              Export Compliance Program
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
              Has written export compliance manual and procedures
            </p>
          </div>
        </label>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Assessment Name (Optional)
        </label>
        <input
          type="text"
          value={(data.assessmentName as string) || ""}
          onChange={(e) =>
            onChange({ ...data, assessmentName: e.target.value })
          }
          placeholder="e.g., Q1 2026 ITAR/EAR Assessment"
          className="w-full px-4 py-2 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// REQUIREMENT CARD
// ============================================================================

function RequirementCard({
  requirement,
  onStatusChange,
}: {
  requirement: RequirementStatus;
  onStatusChange: (status: ComplianceStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const req = requirement.requirement;

  if (!req) return null;

  const statusColors: Record<ComplianceStatus, string> = {
    compliant: "bg-green-500/20 text-green-400 border-green-500/50",
    partial: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    non_compliant: "bg-red-500/20 text-red-400 border-red-500/50",
    not_assessed:
      "bg-slate-500/20 text-slate-600 dark:text-white/60 border-slate-500/50",
    not_applicable: "bg-slate-600/20 text-slate-500 border-slate-600/50",
  };

  const riskColors: Record<RiskLevel, string> = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-amber-400",
    low: "text-slate-600 dark:text-white/60",
  };

  const statusIcons: Record<ComplianceStatus, React.ReactNode> = {
    compliant: <CheckCircle2 className="w-4 h-4" />,
    partial: <Clock className="w-4 h-4" />,
    non_compliant: <XCircle className="w-4 h-4" />,
    not_assessed: <CircleDot className="w-4 h-4" />,
    not_applicable: <CircleDot className="w-4 h-4" />,
  };

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
      <div
        className="p-3 sm:p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${riskColors[req.riskLevel]}`}>
            {req.riskLevel === "critical" && (
              <AlertOctagon className="w-4 h-4" />
            )}
            {req.riskLevel === "high" && <AlertTriangle className="w-4 h-4" />}
            {req.riskLevel === "medium" && <FileWarning className="w-4 h-4" />}
            {req.riskLevel === "low" && <Info className="w-4 h-4" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded border ${
                  req.regulation === "ITAR"
                    ? "bg-red-900/30 text-red-400 border-red-700"
                    : "bg-amber-900/30 text-amber-400 border-amber-700"
                }`}
              >
                {req.regulation}
              </span>
              <span className="text-xs text-slate-500 dark:text-white/50 truncate">
                {req.cfrReference}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white mt-1 line-clamp-2">
              {req.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-white/70 mt-1 line-clamp-2 hidden sm:block">
              {req.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${statusColors[requirement.status]}`}
            >
              {statusIcons[requirement.status]}
              <span className="hidden sm:inline">
                {requirement.status.replace("_", " ")}
              </span>
            </span>
            <ChevronRight
              className={`w-4 h-4 text-slate-600 dark:text-white/60 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-4 border-t border-slate-200 dark:border-white/10 pt-4 space-y-4">
              <p className="text-sm text-slate-300">{req.description}</p>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "compliant",
                    "partial",
                    "non_compliant",
                    "not_applicable",
                  ] as ComplianceStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(status);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      requirement.status === status
                        ? statusColors[status]
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>

              {req.isMandatory && (
                <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" />
                  Mandatory Requirement
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ExportControlPage() {
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(
    null,
  );
  const [requirements, setRequirements] = useState<RequirementStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<"all" | "ITAR" | "EAR">("all");
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | "all">(
    "all",
  );

  // Check localStorage for disclaimer acknowledgement
  useEffect(() => {
    const acknowledged = localStorage.getItem(
      "exportControlDisclaimerAcknowledged",
    );
    if (acknowledged === "true") {
      setDisclaimerAcknowledged(true);
    }
  }, []);

  const handleAcknowledgeDisclaimer = () => {
    localStorage.setItem("exportControlDisclaimerAcknowledged", "true");
    setDisclaimerAcknowledged(true);
  };

  // Fetch assessments
  useEffect(() => {
    if (!disclaimerAcknowledged) return;

    const fetchAssessments = async () => {
      try {
        const res = await fetch("/api/export-control");
        if (res.ok) {
          const data = await res.json();
          setAssessments(data.assessments || []);
          if (data.assessments?.length > 0) {
            setCurrentAssessment(data.assessments[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch assessments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [disclaimerAcknowledged]);

  // Fetch requirements when assessment changes
  useEffect(() => {
    if (!currentAssessment) return;

    const fetchRequirements = async () => {
      try {
        const res = await fetch(
          `/api/export-control/${currentAssessment.id}/requirements`,
        );
        if (res.ok) {
          const data = await res.json();
          setRequirements(data.requirements || []);
        }
      } catch (error) {
        console.error("Failed to fetch requirements:", error);
      }
    };

    fetchRequirements();
  }, [currentAssessment]);

  // Create assessment
  const handleCreateAssessment = async () => {
    if (
      !wizardData.companyTypes ||
      (wizardData.companyTypes as string[]).length === 0
    ) {
      alert("Please select at least one organization type");
      return;
    }

    try {
      const res = await fetch("/api/export-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizardData),
      });

      if (res.ok) {
        const data = await res.json();
        setAssessments((prev) => [data.assessment, ...prev]);
        setCurrentAssessment(data.assessment);
        setShowWizard(false);
        setWizardStep(1);
        setWizardData({});
      }
    } catch (error) {
      console.error("Failed to create assessment:", error);
    }
  };

  // Update requirement status
  const handleStatusChange = async (
    requirementId: string,
    status: ComplianceStatus,
  ) => {
    if (!currentAssessment) return;

    try {
      const res = await fetch(
        `/api/export-control/${currentAssessment.id}/requirements`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requirementId, status }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        setRequirements((prev) =>
          prev.map((r) =>
            r.requirementId === requirementId ? { ...r, status } : r,
          ),
        );
        // Update assessment scores
        setCurrentAssessment((prev) =>
          prev
            ? {
                ...prev,
                overallComplianceScore: data.score.overall,
                itarComplianceScore: data.score.byRegulation.ITAR,
                earComplianceScore: data.score.byRegulation.EAR,
                riskLevel: data.riskLevel,
                criticalGaps: data.criticalGaps,
                highGaps: data.highGaps,
              }
            : null,
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Filter requirements
  const filteredRequirements = requirements.filter((r) => {
    if (activeTab !== "all" && r.requirement?.regulation !== activeTab)
      return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  // Stats
  const stats = {
    total: requirements.length,
    compliant: requirements.filter((r) => r.status === "compliant").length,
    partial: requirements.filter((r) => r.status === "partial").length,
    nonCompliant: requirements.filter((r) => r.status === "non_compliant")
      .length,
    notAssessed: requirements.filter((r) => r.status === "not_assessed").length,
  };

  if (!disclaimerAcknowledged) {
    return (
      <LegalDisclaimerBanner onAcknowledge={handleAcknowledgeDisclaimer} />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-600 dark:text-white/60">
            Loading Export Control Module...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-red-500" />
            ITAR/EAR Export Control
          </h1>
          <p className="text-sm text-slate-600 dark:text-white/70 mt-1">
            Compliance tracking for export-controlled articles and technology
          </p>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-red-400 font-medium">
              This tool is for compliance tracking only - not legal advice
            </p>
            <p className="text-red-300/80 text-xs mt-1">
              Penalties: ITAR up to $1M + 20 years | EAR up to $300K per
              violation
            </p>
          </div>
        </div>
      </div>

      {/* Assessment Wizard Modal */}
      <AnimatePresence>
        {showWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 p-4"
            onClick={() => setShowWizard(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  New Export Control Assessment
                </h2>
                <p className="text-sm text-slate-600 dark:text-white/70 mt-1">
                  Step {wizardStep} of 4
                </p>
                <div className="flex gap-1 mt-3">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded ${
                        step <= wizardStep
                          ? "bg-blue-500"
                          : "bg-slate-100 dark:bg-white/[0.06]"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {wizardStep === 1 && (
                  <WizardStep1 data={wizardData} onChange={setWizardData} />
                )}
                {wizardStep === 2 && (
                  <WizardStep2 data={wizardData} onChange={setWizardData} />
                )}
                {wizardStep === 3 && (
                  <WizardStep3 data={wizardData} onChange={setWizardData} />
                )}
                {wizardStep === 4 && (
                  <WizardStep4 data={wizardData} onChange={setWizardData} />
                )}
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-white/10 flex justify-between">
                <button
                  onClick={() => {
                    if (wizardStep === 1) {
                      setShowWizard(false);
                    } else {
                      setWizardStep((s) => s - 1);
                    }
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {wizardStep === 1 ? "Cancel" : "Back"}
                </button>
                <button
                  onClick={() => {
                    if (wizardStep < 4) {
                      setWizardStep((s) => s + 1);
                    } else {
                      handleCreateAssessment();
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {wizardStep < 4 ? "Continue" : "Create Assessment"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Assessments State */}
      {assessments.length === 0 && !showWizard && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-8 text-center">
          <Scale className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No Export Control Assessments
          </h3>
          <p className="text-slate-600 dark:text-white/60 text-sm mb-4 max-w-md mx-auto">
            Create your first ITAR/EAR compliance assessment to track your
            export control requirements.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Create Assessment
          </button>
        </div>
      )}

      {/* Assessment Content */}
      {currentAssessment && (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-3 sm:p-4">
              <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                Overall Score
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {currentAssessment.overallComplianceScore ?? 0}%
              </div>
            </div>
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-3 sm:p-4">
              <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                ITAR Score
              </div>
              <div className="text-xl sm:text-2xl font-bold text-red-400 mt-1">
                {currentAssessment.itarComplianceScore ?? 0}%
              </div>
            </div>
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-3 sm:p-4">
              <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                EAR Score
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">
                {currentAssessment.earComplianceScore ?? 0}%
              </div>
            </div>
            <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-3 sm:p-4">
              <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                Critical Gaps
              </div>
              <div className="text-xl sm:text-2xl font-bold text-red-500 mt-1">
                {currentAssessment.criticalGaps ?? 0}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-3 sm:p-4">
              <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                Risk Level
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold mt-1 capitalize ${
                  currentAssessment.riskLevel === "critical"
                    ? "text-red-500"
                    : currentAssessment.riskLevel === "high"
                      ? "text-orange-500"
                      : currentAssessment.riskLevel === "medium"
                        ? "text-amber-500"
                        : "text-green-500"
                }`}
              >
                {currentAssessment.riskLevel || "Unknown"}
              </div>
            </div>
          </div>

          {/* Penalty Warning */}
          {currentAssessment.maxCivilPenalty &&
            currentAssessment.maxCivilPenalty > 0 && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
                  <Gavel className="w-4 h-4" />
                  Maximum Penalty Exposure
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="text-slate-300">
                    Civil:{" "}
                    <span className="text-red-400 font-semibold">
                      $
                      {(currentAssessment.maxCivilPenalty / 1000000).toFixed(1)}
                      M
                    </span>
                  </span>
                  {currentAssessment.maxImprisonment && (
                    <span className="text-slate-300">
                      Criminal:{" "}
                      <span className="text-red-400 font-semibold">
                        Up to {currentAssessment.maxImprisonment} years
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}

          {/* Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-slate-200 dark:border-white/10">
            {(["all", "ITAR", "EAR"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab === "all" ? "All Requirements" : tab}
                <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-white/[0.06]">
                  {tab === "all"
                    ? requirements.length
                    : requirements.filter(
                        (r) => r.requirement?.regulation === tab,
                      ).length}
                </span>
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                "all",
                "not_assessed",
                "compliant",
                "partial",
                "non_compliant",
                "not_applicable",
              ] as const
            ).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:bg-white/[0.06]"
                }`}
              >
                {status === "all" ? "All" : status.replace("_", " ")}
                <span className="ml-1.5">
                  {status === "all"
                    ? stats.total
                    : status === "not_assessed"
                      ? stats.notAssessed
                      : status === "compliant"
                        ? stats.compliant
                        : status === "partial"
                          ? stats.partial
                          : stats.nonCompliant}
                </span>
              </button>
            ))}
          </div>

          {/* Requirements List */}
          <div className="space-y-3">
            {filteredRequirements.length === 0 ? (
              <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-8 text-center">
                <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-white/60">
                  No requirements match your filters
                </p>
              </div>
            ) : (
              filteredRequirements.map((req) => (
                <RequirementCard
                  key={req.id}
                  requirement={req}
                  onStatusChange={(status) =>
                    handleStatusChange(req.requirementId, status)
                  }
                />
              ))
            )}
          </div>

          {/* Report Generation */}
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Compliance Report
                </h3>
                <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
                  Generate a comprehensive export control compliance report
                </p>
              </div>
              <button
                onClick={() =>
                  window.open(
                    `/api/export-control/report/${currentAssessment.id}`,
                    "_blank",
                  )
                }
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-white rounded-lg text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Generate Report
              </button>
            </div>
          </div>

          {/* Resources */}
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-4">
            <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4" />
              Regulatory Resources
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://www.pmddtc.state.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                <Lock className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-sm text-white">DDTC (ITAR)</div>
                  <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                    State Department
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-600 dark:text-white/60 ml-auto" />
              </a>
              <a
                href="https://www.bis.doc.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                <Globe className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-sm text-white">BIS (EAR)</div>
                  <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                    Commerce Department
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-600 dark:text-white/60 ml-auto" />
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
