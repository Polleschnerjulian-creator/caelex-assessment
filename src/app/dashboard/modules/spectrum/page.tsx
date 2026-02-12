"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Globe,
  Satellite,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Plus,
  AlertTriangle,
  RefreshCw,
  Download,
  Info,
  Calendar,
  Flag,
  Antenna,
  CircleDot,
  Building2,
  ArrowRight,
  SignalHigh,
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
type SpectrumSource = "ITU" | "FCC" | "OFCOM" | "BNETZA" | "CEPT";
type ServiceType =
  | "FSS"
  | "MSS"
  | "BSS"
  | "EESS"
  | "SRS"
  | "RNS"
  | "AMSS"
  | "MMSS"
  | "ISL";
type FrequencyBand =
  | "L"
  | "S"
  | "C"
  | "X"
  | "Ku"
  | "Ka"
  | "V"
  | "Q"
  | "W"
  | "O"
  | "UHF"
  | "VHF";
type OrbitType = "GEO" | "NGSO" | "LEO" | "MEO" | "HEO";
type FilingPhase = "API" | "CR_C" | "NOTIFICATION" | "RECORDING";

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
    source: SpectrumSource;
    category: string;
    reference: string;
    riskLevel: RiskLevel;
    isMandatory: boolean;
  } | null;
}

interface Assessment {
  id: string;
  assessmentName: string | null;
  networkName: string | null;
  status: string;
  orbitType: string;
  serviceTypes: string;
  frequencyBands: string;
  satelliteCount: number;
  isConstellation: boolean;
  primaryJurisdiction: string | null;
  riskLevel: string | null;
  overallComplianceScore: number | null;
  ituComplianceScore: number | null;
  nationalComplianceScore: number | null;
  apiStatus: string;
  crCStatus: string;
  notificationStatus: string;
  recordingStatus: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getServiceTypeName = (st: ServiceType): string => {
  const names: Record<ServiceType, string> = {
    FSS: "Fixed-Satellite Service",
    MSS: "Mobile-Satellite Service",
    BSS: "Broadcasting-Satellite Service",
    EESS: "Earth Exploration-Satellite Service",
    SRS: "Space Research Service",
    RNS: "Radionavigation-Satellite Service",
    AMSS: "Aeronautical Mobile-Satellite Service",
    MMSS: "Maritime Mobile-Satellite Service",
    ISL: "Inter-Satellite Links",
  };
  return names[st] || st;
};

const getFilingPhaseLabel = (phase: FilingPhase): string => {
  const labels: Record<FilingPhase, string> = {
    API: "Advance Publication (API)",
    CR_C: "Coordination (CR/C)",
    NOTIFICATION: "Notification",
    RECORDING: "Recording (MIFR)",
  };
  return labels[phase];
};

const getStatusIcon = (status: ComplianceStatus) => {
  switch (status) {
    case "compliant":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "partial":
      return <Clock className="w-4 h-4 text-amber-500" />;
    case "non_compliant":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "not_applicable":
      return <CircleDot className="w-4 h-4 text-slate-500" />;
    default:
      return <Clock className="w-4 h-4 text-slate-400" />;
  }
};

const getStatusColor = (status: ComplianceStatus): string => {
  switch (status) {
    case "compliant":
      return "bg-green-500/10 text-green-400 border-green-500/30";
    case "partial":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "non_compliant":
      return "bg-red-500/10 text-red-400 border-red-500/30";
    case "not_applicable":
      return "bg-slate-500/10 text-slate-600 dark:text-white/60 border-slate-500/30";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-white/60 border-slate-500/30";
  }
};

const getRiskColor = (risk: RiskLevel): string => {
  switch (risk) {
    case "critical":
      return "text-red-400";
    case "high":
      return "text-amber-400";
    case "medium":
      return "text-yellow-400";
    default:
      return "text-green-400";
  }
};

// ============================================================================
// WIZARD STEP COMPONENTS
// ============================================================================

function WizardStep1({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const serviceTypes: {
    id: ServiceType;
    label: string;
    description: string;
  }[] = [
    {
      id: "FSS",
      label: "Fixed-Satellite Service (FSS)",
      description: "Point-to-point and VSAT communications",
    },
    {
      id: "MSS",
      label: "Mobile-Satellite Service (MSS)",
      description: "Mobile terminals, IoT, M2M",
    },
    {
      id: "BSS",
      label: "Broadcasting-Satellite Service (BSS)",
      description: "Direct-to-home broadcasting",
    },
    {
      id: "EESS",
      label: "Earth Exploration-Satellite Service",
      description: "Remote sensing, EO",
    },
    {
      id: "SRS",
      label: "Space Research Service",
      description: "Scientific missions",
    },
    {
      id: "ISL",
      label: "Inter-Satellite Links",
      description: "Laser or RF intersatellite links",
    },
  ];

  const selected = (data.serviceTypes as ServiceType[]) || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Select Service Types
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60">
          Which radiocommunication services will your network provide?
        </p>
      </div>

      <div className="grid gap-2">
        {serviceTypes.map((st) => (
          <button
            key={st.id}
            onClick={() => {
              const newSelected = selected.includes(st.id)
                ? selected.filter((s) => s !== st.id)
                : [...selected, st.id];
              onChange({ ...data, serviceTypes: newSelected });
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              selected.includes(st.id)
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04]/50 hover:border-slate-300 dark:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selected.includes(st.id)
                    ? "border-blue-500 bg-blue-500"
                    : "border-slate-500"
                }`}
              >
                {selected.includes(st.id) && (
                  <CheckCircle2 className="w-3 h-3 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {st.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                  {st.description}
                </p>
              </div>
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
  const frequencyBands: {
    id: FrequencyBand;
    label: string;
    range: string;
    usage: string;
  }[] = [
    { id: "L", label: "L-Band", range: "1-2 GHz", usage: "MSS, Navigation" },
    { id: "S", label: "S-Band", range: "2-4 GHz", usage: "MSS, TT&C" },
    { id: "C", label: "C-Band", range: "4-8 GHz", usage: "FSS (legacy)" },
    {
      id: "X",
      label: "X-Band",
      range: "8-12 GHz",
      usage: "Government, Military",
    },
    { id: "Ku", label: "Ku-Band", range: "12-18 GHz", usage: "FSS, DTH" },
    {
      id: "Ka",
      label: "Ka-Band",
      range: "26.5-40 GHz",
      usage: "HTS, Broadband",
    },
    { id: "V", label: "V-Band", range: "40-75 GHz", usage: "Next-gen HTS" },
  ];

  const selected = (data.frequencyBands as FrequencyBand[]) || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Select Frequency Bands
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60">
          Which frequency bands will your network use?
        </p>
      </div>

      <div className="grid gap-2">
        {frequencyBands.map((fb) => (
          <button
            key={fb.id}
            onClick={() => {
              const newSelected = selected.includes(fb.id)
                ? selected.filter((s) => s !== fb.id)
                : [...selected, fb.id];
              onChange({ ...data, frequencyBands: newSelected });
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              selected.includes(fb.id)
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04]/50 hover:border-slate-300 dark:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selected.includes(fb.id)
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-500"
                  }`}
                >
                  {selected.includes(fb.id) && (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {fb.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                    {fb.usage}
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-white/50">
                {fb.range}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selected.includes("Ka") && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              Ka-band for NGSO requires EPFD coordination with GSO systems per
              ITU RR Article 22.
            </p>
          </div>
        </div>
      )}
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
  const orbitTypes: { id: OrbitType; label: string; description: string }[] = [
    {
      id: "GEO",
      label: "Geostationary (GEO)",
      description: "35,786 km equatorial orbit",
    },
    {
      id: "LEO",
      label: "Low Earth Orbit (LEO)",
      description: "160-2,000 km altitude",
    },
    {
      id: "MEO",
      label: "Medium Earth Orbit (MEO)",
      description: "2,000-35,786 km altitude",
    },
    {
      id: "HEO",
      label: "Highly Elliptical Orbit (HEO)",
      description: "Molniya, Tundra orbits",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Orbit & Network Details
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60">
          Define your satellite network characteristics.
        </p>
      </div>

      <div className="space-y-4">
        {/* Orbit Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Orbit Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {orbitTypes.map((orbit) => (
              <button
                key={orbit.id}
                onClick={() => onChange({ ...data, orbitType: orbit.id })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  data.orbitType === orbit.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04]/50 hover:border-slate-300 dark:border-white/20"
                }`}
              >
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {orbit.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                  {orbit.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Satellite Count */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Number of Satellites
          </label>
          <input
            type="number"
            min="1"
            value={(data.satelliteCount as number) || 1}
            onChange={(e) =>
              onChange({
                ...data,
                satelliteCount: parseInt(e.target.value) || 1,
              })
            }
            className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Network Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Network Name (Optional)
          </label>
          <input
            type="text"
            value={(data.networkName as string) || ""}
            onChange={(e) => onChange({ ...data, networkName: e.target.value })}
            placeholder="e.g., STARLINK, ONEWEB"
            className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Administration Code */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Notifying Administration
          </label>
          <select
            value={(data.administrationCode as string) || ""}
            onChange={(e) =>
              onChange({ ...data, administrationCode: e.target.value })
            }
            className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select administration...</option>
            <option value="F">France (F)</option>
            <option value="D">Germany (D)</option>
            <option value="G">United Kingdom (G)</option>
            <option value="USA">United States (USA)</option>
            <option value="LUX">Luxembourg (LUX)</option>
            <option value="NLD">Netherlands (NLD)</option>
            <option value="I">Italy (I)</option>
            <option value="E">Spain (E)</option>
          </select>
        </div>
      </div>

      {/* NGSO Constellation Warning */}
      {(data.orbitType === "LEO" || data.orbitType === "MEO") &&
        Number(data.satelliteCount) > 10 && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-300">
                <p className="font-medium">NGSO Constellation Detected</p>
                <p className="mt-1">
                  Milestone requirements apply: 10% deployment within 2 years,
                  50% within 5 years, 100% within 7 years of bringing into use.
                </p>
              </div>
            </div>
          </div>
        )}
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
  const jurisdictions: {
    id: SpectrumSource;
    label: string;
    description: string;
  }[] = [
    {
      id: "ITU",
      label: "ITU",
      description: "International Telecommunication Union",
    },
    { id: "FCC", label: "FCC", description: "United States" },
    { id: "OFCOM", label: "Ofcom", description: "United Kingdom" },
    { id: "BNETZA", label: "BNetzA", description: "Germany" },
    { id: "CEPT", label: "CEPT/ECC", description: "European coordination" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Licensing Jurisdictions
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60">
          Select the jurisdictions where you need spectrum licenses.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Primary Jurisdiction
        </label>
        <div className="grid gap-2">
          {jurisdictions.map((j) => (
            <button
              key={j.id}
              onClick={() => onChange({ ...data, primaryJurisdiction: j.id })}
              className={`p-3 rounded-lg border text-left transition-all ${
                data.primaryJurisdiction === j.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04]/50 hover:border-slate-300 dark:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {j.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                    {j.description}
                  </p>
                </div>
                {data.primaryJurisdiction === j.id && (
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Assessment Name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Assessment Name (Optional)
        </label>
        <input
          type="text"
          value={(data.assessmentName as string) || ""}
          onChange={(e) =>
            onChange({ ...data, assessmentName: e.target.value })
          }
          placeholder="e.g., Project Aurora Spectrum Filing"
          className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Summary */}
      <div className="p-4 bg-white dark:bg-white/[0.04]/50 border border-slate-200 dark:border-white/10 rounded-lg">
        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
          Assessment Summary
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-white/60">
              Service Types:
            </span>
            <span className="text-slate-900 dark:text-white">
              {((data.serviceTypes as string[]) || []).join(", ") ||
                "None selected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-white/60">
              Frequency Bands:
            </span>
            <span className="text-slate-900 dark:text-white">
              {((data.frequencyBands as string[]) || []).join(", ") ||
                "None selected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-white/60">
              Orbit Type:
            </span>
            <span className="text-slate-900 dark:text-white">
              {(data.orbitType as string) || "Not selected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-white/60">
              Satellites:
            </span>
            <span className="text-slate-900 dark:text-white">
              {(data.satelliteCount as number) || 1}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FILING STATUS COMPONENT
// ============================================================================

function FilingStatusCard({
  phase,
  status,
  date,
}: {
  phase: FilingPhase;
  status: string;
  date: string | null;
}) {
  const getPhaseIcon = () => {
    switch (phase) {
      case "API":
        return <FileText className="w-4 h-4" />;
      case "CR_C":
        return <Globe className="w-4 h-4" />;
      case "NOTIFICATION":
        return <Flag className="w-4 h-4" />;
      case "RECORDING":
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "recorded":
      case "favorable":
        return "text-green-400 bg-green-500/10";
      case "submitted":
      case "under_review":
      case "coordination_ongoing":
        return "text-blue-400 bg-blue-500/10";
      case "in_preparation":
        return "text-amber-400 bg-amber-500/10";
      case "expired":
      case "unfavorable":
        return "text-red-400 bg-red-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  return (
    <div className="p-3 bg-white dark:bg-white/[0.04]/50 border border-slate-200 dark:border-white/10 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-400">
          {getPhaseIcon()}
          <span className="text-xs font-medium">
            {getFilingPhaseLabel(phase)}
          </span>
        </div>
      </div>
      <div
        className={`inline-flex items-center px-2 py-1 rounded text-xs ${getStatusColor()}`}
      >
        {status.replace(/_/g, " ")}
      </div>
      {date && (
        <p className="text-xs text-slate-500 dark:text-white/50 mt-2">
          {new Date(date).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SpectrumManagementPage() {
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [requirements, setRequirements] = useState<RequirementStatus[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<Record<string, unknown>>({
    serviceTypes: [],
    frequencyBands: [],
    orbitType: "",
    satelliteCount: 1,
    networkName: "",
    administrationCode: "",
    primaryJurisdiction: "ITU",
    assessmentName: "",
  });
  const [activeTab, setActiveTab] = useState<"all" | SpectrumSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ComplianceStatus>(
    "all",
  );
  const [submitting, setSubmitting] = useState(false);

  // Fetch assessments on mount
  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/spectrum");
      if (res.ok) {
        const data = await res.json();
        if (data.assessments && data.assessments.length > 0) {
          const latest = data.assessments[0];
          setAssessment(latest);
          await fetchRequirements(latest.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequirements = async (assessmentId: string) => {
    try {
      const res = await fetch(`/api/spectrum/${assessmentId}/requirements`);
      if (res.ok) {
        const data = await res.json();
        setRequirements(data.requirements || []);
      }
    } catch (error) {
      console.error("Failed to fetch requirements:", error);
    }
  };

  const handleCreateAssessment = async () => {
    if (
      (wizardData.serviceTypes as string[]).length === 0 ||
      (wizardData.frequencyBands as string[]).length === 0 ||
      !wizardData.orbitType
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/spectrum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizardData),
      });

      if (res.ok) {
        const data = await res.json();
        setAssessment(data.assessment);
        await fetchRequirements(data.assessment.id);
        setShowWizard(false);
        setWizardStep(1);
        setWizardData({
          serviceTypes: [],
          frequencyBands: [],
          orbitType: "",
          satelliteCount: 1,
          networkName: "",
          administrationCode: "",
          primaryJurisdiction: "ITU",
          assessmentName: "",
        });
      }
    } catch (error) {
      console.error("Failed to create assessment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    requirementId: string,
    newStatus: ComplianceStatus,
  ) => {
    if (!assessment) return;

    try {
      const res = await fetch(`/api/spectrum/${assessment.id}/requirements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{ requirementId, status: newStatus }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRequirements((prev) =>
          prev.map((r) =>
            r.requirementId === requirementId ? { ...r, status: newStatus } : r,
          ),
        );

        // Update assessment scores
        setAssessment((prev) =>
          prev
            ? {
                ...prev,
                overallComplianceScore: data.score.overall,
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
    if (activeTab !== "all" && r.requirement?.source !== activeTab)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-600 dark:text-white/60">
            Loading Spectrum Management Module...
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
            <Radio className="w-6 h-6 text-purple-500" />
            Spectrum & ITU Compliance
          </h1>
          <p className="text-sm text-slate-600 dark:text-white/70 mt-1">
            ITU Radio Regulations, frequency filings, and spectrum licensing
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

      {/* Info Banner */}
      <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <Antenna className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-purple-300 font-medium">
              ITU Filing Timeline: GEO requires 7+ years, NGSO 2-4 years
            </p>
            <p className="text-purple-300/70 text-xs mt-1">
              API → CR/C → Notification → Recording in MIFR
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
                  New Spectrum Assessment
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
                  disabled={
                    submitting ||
                    (wizardStep === 1 &&
                      (wizardData.serviceTypes as string[]).length === 0) ||
                    (wizardStep === 2 &&
                      (wizardData.frequencyBands as string[]).length === 0) ||
                    (wizardStep === 3 && !wizardData.orbitType)
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : wizardStep < 4 ? (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    "Create Assessment"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!assessment ? (
        // No Assessment State
        <div className="bg-white dark:bg-white/[0.04]/50 border border-slate-200 dark:border-white/10 rounded-xl p-8 text-center">
          <Satellite className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No Spectrum Assessment Yet
          </h3>
          <p className="text-sm text-slate-600 dark:text-white/60 mb-4">
            Create an assessment to track your ITU filings and spectrum
            compliance.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Assessment
          </button>
        </div>
      ) : (
        <>
          {/* Assessment Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Score Card */}
            <div className="bg-white dark:bg-white/[0.04]/50 border border-slate-200 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-400">
                  Compliance Score
                </h3>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    assessment.riskLevel === "critical"
                      ? "bg-red-500/20 text-red-400"
                      : assessment.riskLevel === "high"
                        ? "bg-amber-500/20 text-amber-400"
                        : assessment.riskLevel === "medium"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {assessment.riskLevel} risk
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {assessment.overallComplianceScore ?? 0}%
              </div>
              <div className="w-full bg-slate-100 dark:bg-white/[0.06] rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (assessment.overallComplianceScore ?? 0) >= 80
                      ? "bg-green-500"
                      : (assessment.overallComplianceScore ?? 0) >= 60
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${assessment.overallComplianceScore ?? 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Network Info */}
            <div className="bg-white dark:bg-white/[0.04]/50 border border-slate-200 dark:border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-600 dark:text-white/60 mb-3">
                Network Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Network:</span>
                  <span className="text-slate-900 dark:text-white">
                    {assessment.networkName || "Unnamed"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Orbit:</span>
                  <span className="text-slate-900 dark:text-white">
                    {assessment.orbitType}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Satellites:</span>
                  <span className="text-slate-900 dark:text-white">
                    {assessment.satelliteCount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Bands:</span>
                  <span className="text-slate-900 dark:text-white">
                    {JSON.parse(assessment.frequencyBands).join(", ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Summary */}
            <div className="bg-white dark:bg-white/[0.04]/50 border border-slate-200 dark:border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-600 dark:text-white/60 mb-3">
                Requirements Status
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-green-500/10 rounded">
                  <div className="text-lg font-bold text-green-400">
                    {stats.compliant}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                    Compliant
                  </div>
                </div>
                <div className="text-center p-2 bg-amber-500/10 rounded">
                  <div className="text-lg font-bold text-amber-400">
                    {stats.partial}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                    Partial
                  </div>
                </div>
                <div className="text-center p-2 bg-red-500/10 rounded">
                  <div className="text-lg font-bold text-red-400">
                    {stats.nonCompliant}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                    Non-Compliant
                  </div>
                </div>
                <div className="text-center p-2 bg-slate-500/10 rounded">
                  <div className="text-lg font-bold text-slate-400">
                    {stats.notAssessed}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50">
                    Not Assessed
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ITU Filing Status */}
          <div className="bg-white dark:bg-white/[0.04]/50 border border-slate-200 dark:border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              ITU Filing Progress
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FilingStatusCard
                phase="API"
                status={assessment.apiStatus}
                date={null}
              />
              <FilingStatusCard
                phase="CR_C"
                status={assessment.crCStatus}
                date={null}
              />
              <FilingStatusCard
                phase="NOTIFICATION"
                status={assessment.notificationStatus}
                date={null}
              />
              <FilingStatusCard
                phase="RECORDING"
                status={assessment.recordingStatus}
                date={null}
              />
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-500 dark:text-white/50">
              <ArrowRight className="w-4 h-4" />
              <span>
                Filing process progresses: API → Coordination → Notification →
                Recording
              </span>
            </div>
          </div>

          {/* Source Tabs */}
          <div className="flex flex-wrap gap-2">
            {(["all", "ITU", "FCC", "OFCOM", "BNETZA", "CEPT"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab === "all" ? "All Sources" : tab}
                </button>
              ),
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-white/60">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | ComplianceStatus)
              }
              className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-900 dark:text-white text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="partial">Partial</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="not_assessed">Not Assessed</option>
            </select>
          </div>

          {/* Requirements List */}
          <div className="space-y-3">
            {filteredRequirements.length === 0 ? (
              <div className="bg-white dark:bg-white/[0.04]/50 border border-slate-200 dark:border-white/10 rounded-xl p-8 text-center">
                <p className="text-slate-600 dark:text-white/60">
                  No requirements match the current filters.
                </p>
              </div>
            ) : (
              filteredRequirements.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-white/[0.04]/50 border border-slate-200 dark:border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(req.status)}
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                          {req.requirement?.title || req.requirementId}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-white/50 dark:text-white/50 line-clamp-2 mb-2">
                        {req.requirement?.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">
                          {req.requirement?.source}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-500">
                          {req.requirement?.reference}
                        </span>
                        {req.requirement?.isMandatory && (
                          <>
                            <span className="text-slate-600">|</span>
                            <span className="text-red-400">Mandatory</span>
                          </>
                        )}
                        <span className="text-slate-600">|</span>
                        <span
                          className={getRiskColor(
                            req.requirement?.riskLevel || "low",
                          )}
                        >
                          {req.requirement?.riskLevel} risk
                        </span>
                      </div>
                    </div>

                    <select
                      value={req.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          req.requirementId,
                          e.target.value as ComplianceStatus,
                        )
                      }
                      className={`text-xs px-2 py-1 rounded border ${getStatusColor(
                        req.status,
                      )} bg-transparent`}
                    >
                      <option value="not_assessed">Not Assessed</option>
                      <option value="compliant">Compliant</option>
                      <option value="partial">Partial</option>
                      <option value="non_compliant">Non-Compliant</option>
                      <option value="not_applicable">N/A</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
