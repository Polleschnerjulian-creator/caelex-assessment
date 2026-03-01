"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";
import ProfileSectionEditor from "@/components/assure/ProfileSectionEditor";

// ─── Field Configs ───

type FieldConfig = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "date"
    | "json-list"
    | "currency";
  required?: boolean;
  hint?: string;
  options?: string[];
};

const SECTION_FIELDS: Record<string, FieldConfig[]> = {
  overview: [
    { key: "companyName", label: "Company Name", type: "text", required: true },
    { key: "legalName", label: "Legal Name", type: "text" },
    { key: "foundedDate", label: "Founded Date", type: "date" },
    {
      key: "headquarters",
      label: "Headquarters",
      type: "text",
      hint: "City, Country",
    },
    { key: "website", label: "Website", type: "text" },
    {
      key: "stage",
      label: "Company Stage",
      type: "select",
      options: [
        "Pre-Seed",
        "Seed",
        "Series A",
        "Series B",
        "Series C+",
        "Growth",
      ],
    },
    {
      key: "operatorType",
      label: "Operator Type",
      type: "select",
      options: ["SCO", "LO", "LSO", "ISOS", "PDP", "TCO", "CAP", "OTHER"],
    },
    {
      key: "oneLiner",
      label: "One-Liner",
      type: "text",
      required: true,
      hint: "A single sentence describing what your company does",
    },
    { key: "problem", label: "Problem Statement", type: "textarea" },
    { key: "solution", label: "Solution", type: "textarea" },
    { key: "employeeCount", label: "Employee Count", type: "number" },
  ],
  technology: [
    {
      key: "trlLevel",
      label: "TRL Level",
      type: "select",
      options: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    },
    { key: "productName", label: "Product Name", type: "text", required: true },
    {
      key: "productStatus",
      label: "Product Status",
      type: "select",
      options: ["Concept", "Prototype", "Beta", "Production", "Mature"],
    },
    {
      key: "productDescription",
      label: "Product Description",
      type: "textarea",
    },
    {
      key: "techStack",
      label: "Technology Stack",
      type: "textarea",
      hint: "Key technologies, platforms, and frameworks",
    },
    {
      key: "ipStatus",
      label: "IP Status",
      type: "select",
      options: [
        "No IP",
        "Patent Pending",
        "Patents Granted",
        "Trade Secrets",
        "Mixed",
      ],
    },
    { key: "patentCount", label: "Patent Count", type: "number" },
    {
      key: "techDifferentiator",
      label: "Technical Differentiator",
      type: "textarea",
    },
  ],
  market: [
    {
      key: "tamValue",
      label: "TAM (Total Addressable Market)",
      type: "currency",
      hint: "In USD",
    },
    {
      key: "samValue",
      label: "SAM (Serviceable Addressable Market)",
      type: "currency",
    },
    {
      key: "somValue",
      label: "SOM (Serviceable Obtainable Market)",
      type: "currency",
    },
    {
      key: "marketGrowthRate",
      label: "Market Growth Rate (%)",
      type: "number",
    },
    {
      key: "targetSegments",
      label: "Target Segments",
      type: "textarea",
      hint: "Key customer segments you are targeting",
    },
    { key: "geographicFocus", label: "Geographic Focus", type: "text" },
    { key: "marketTrends", label: "Market Trends", type: "textarea" },
    {
      key: "regulatoryTailwinds",
      label: "Regulatory Tailwinds",
      type: "textarea",
    },
  ],
  team: [
    {
      key: "founders",
      label: "Founders",
      type: "json-list",
      required: true,
      hint: "Add each founder (Name, Title)",
    },
    { key: "teamSize", label: "Team Size", type: "number", required: true },
    {
      key: "engineeringRatio",
      label: "Engineering Ratio (%)",
      type: "number",
      hint: "Percentage of team in engineering roles",
    },
    { key: "keyHires", label: "Key Hires Needed", type: "json-list" },
    { key: "advisors", label: "Advisors", type: "json-list" },
    { key: "boardMembers", label: "Board Members", type: "json-list" },
    {
      key: "teamHighlights",
      label: "Team Highlights",
      type: "textarea",
      hint: "Notable achievements, backgrounds, or expertise",
    },
  ],
  financial: [
    { key: "annualRevenue", label: "Annual Revenue", type: "currency" },
    { key: "monthlyBurnRate", label: "Monthly Burn Rate", type: "currency" },
    { key: "runway", label: "Runway (months)", type: "number" },
    {
      key: "totalFundingRaised",
      label: "Total Funding Raised",
      type: "currency",
    },
    { key: "lastRoundSize", label: "Last Round Size", type: "currency" },
    { key: "lastRoundDate", label: "Last Round Date", type: "date" },
    {
      key: "isRaising",
      label: "Currently Raising",
      type: "select",
      options: ["Yes", "No", "Planning"],
    },
    { key: "targetRaise", label: "Target Raise", type: "currency" },
    {
      key: "roundType",
      label: "Round Type",
      type: "select",
      options: [
        "Pre-Seed",
        "Seed",
        "Series A",
        "Series B",
        "Series C",
        "Bridge",
        "Convertible Note",
        "SAFE",
      ],
    },
    { key: "revenueModel", label: "Revenue Model", type: "textarea" },
    { key: "unitEconomics", label: "Unit Economics", type: "textarea" },
  ],
  regulatory: [
    {
      key: "jurisdictions",
      label: "Operating Jurisdictions",
      type: "json-list",
      required: true,
    },
    {
      key: "authorizationStatus",
      label: "Authorization Status",
      type: "select",
      options: [
        "Not Started",
        "In Progress",
        "Authorized",
        "Multiple Authorizations",
      ],
    },
    {
      key: "primaryLicense",
      label: "Primary License/Authorization",
      type: "text",
    },
    {
      key: "complianceFrameworks",
      label: "Compliance Frameworks",
      type: "json-list",
      hint: "e.g., EU Space Act, NIS2, ITU",
    },
    { key: "regulatoryRisks", label: "Regulatory Risks", type: "textarea" },
    {
      key: "regulatoryAdvantages",
      label: "Regulatory Advantages",
      type: "textarea",
    },
  ],
  competitive: [
    {
      key: "competitors",
      label: "Key Competitors",
      type: "json-list",
      required: true,
    },
    {
      key: "competitiveAdvantage",
      label: "Competitive Advantage",
      type: "textarea",
      required: true,
    },
    { key: "moats", label: "Moats / Barriers to Entry", type: "textarea" },
    {
      key: "marketPosition",
      label: "Market Position",
      type: "select",
      options: ["Market Leader", "Challenger", "Niche Player", "New Entrant"],
    },
    { key: "differentiators", label: "Key Differentiators", type: "json-list" },
    {
      key: "competitiveLandscape",
      label: "Competitive Landscape Notes",
      type: "textarea",
    },
  ],
  traction: [
    {
      key: "keyMetrics",
      label: "Key Metrics",
      type: "json-list",
      hint: "e.g., MRR: $50K, Users: 1,200",
    },
    { key: "partnerships", label: "Key Partnerships", type: "json-list" },
    { key: "contracts", label: "Notable Contracts", type: "json-list" },
    { key: "customers", label: "Key Customers", type: "json-list" },
    { key: "awards", label: "Awards & Recognition", type: "json-list" },
    { key: "mediaFeatures", label: "Media Features", type: "json-list" },
    { key: "milestones", label: "Key Milestones Achieved", type: "textarea" },
    { key: "growthRate", label: "Growth Rate (%)", type: "number" },
  ],
};

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  technology: "Technology",
  market: "Market",
  team: "Team",
  financial: "Financial",
  regulatory: "Regulatory",
  competitive: "Competitive",
  traction: "Traction",
};

// ─── Component ───

export default function ProfileSectionPage() {
  const params = useParams();
  const section = params.section as string;
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionScore, setCompletionScore] = useState(0);

  const fields = SECTION_FIELDS[section] || [];
  const sectionLabel = SECTION_LABELS[section] || section;

  useEffect(() => {
    async function fetchSection() {
      try {
        const res = await fetch(`/api/assure/profile/${section}`);
        if (res.ok) {
          const data = await res.json();
          setValues(data.values || data || {});
          setCompletionScore(data.completion ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch section:", err);
      } finally {
        setLoading(false);
      }
    }
    if (section) fetchSection();
  }, [section]);

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setError(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/assure/profile/${section}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      const data = await res.json();
      setCompletionScore(data.completion ?? completionScore);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!SECTION_FIELDS[section]) {
    return (
      <div className="text-center py-20">
        <h2 className="text-heading font-semibold text-white mb-2">
          Section Not Found
        </h2>
        <p className="text-body text-white/40 mb-6">
          The section &quot;{section}&quot; does not exist.
        </p>
        <Link
          href="/assure/profile"
          className="text-emerald-400 hover:text-emerald-300 text-body inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back to Profile
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status">
        <div className="h-8 bg-white/5 rounded-lg w-1/4" />
        <div className="h-[500px] bg-white/5 rounded-xl" />
        <span className="sr-only">Loading section...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/assure/profile"
        className="inline-flex items-center gap-1.5 text-small text-white/40 hover:text-white/60 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Profile
      </Link>

      {/* Section title */}
      <div className="mb-8">
        <motion.h1
          initial={false}
          animate={{ opacity: 1 }}
          className="text-display font-bold text-white mb-2"
        >
          {sectionLabel}
        </motion.h1>
      </div>

      {/* Editor */}
      <ProfileSectionEditor
        section={sectionLabel}
        fields={fields}
        values={values}
        onChange={handleFieldChange}
        completionScore={completionScore}
      />

      {/* Save button */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-subtitle px-8 py-3 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={16} />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
        </button>
        {error && <p className="text-small text-red-400">{error}</p>}
      </div>
    </div>
  );
}
