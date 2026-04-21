"use client";

/**
 * /dashboard/modules/cybersecurity/workflow — the Tier-C orchestrated
 * "work-day" UI for the Cybersecurity module. Parallels the classic
 * module page at ../page.tsx; selectable via NEXT_PUBLIC_FEAT_WORKFLOW_V2
 * so the two views coexist during rollout.
 *
 * Zero new backend. Reuses the existing /api/cybersecurity endpoints.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  getApplicableRequirements,
  cybersecurityRequirements,
  type CybersecurityProfile,
  type CybersecurityRequirement,
  type OrganizationSize,
  type SpaceSegmentComplexity,
  type DataSensitivityLevel,
  type RequirementStatus,
} from "@/data/cybersecurity-requirements";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { buildWorkflowQueue } from "@/lib/provenance/workflow-queue";
import { csrfHeaders } from "@/lib/csrf-client";
import { WorkflowShell } from "./WorkflowShell";

// ─── Wire shapes (mirror existing cybersecurity module) ────────────────

interface Assessment {
  id: string;
  assessmentName: string | null;
  organizationSize: string;
  spaceSegmentComplexity: string;
  dataSensitivityLevel: string;
  hasGroundSegment: boolean | null;
  processesPersonalData: boolean | null;
  handlesGovData: boolean | null;
  existingCertifications: string | null;
  hasSecurityTeam: boolean | null;
  hasIncidentResponsePlan: boolean | null;
  hasBCP: boolean | null;
  supplierSecurityAssessed: boolean | null;
  satelliteCount: number | null;
  isSimplifiedRegime: boolean;
  requirements: Array<{
    requirementId: string;
    status: RequirementStatus;
    responses: Record<string, unknown> | null;
  }>;
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function CybersecurityWorkflowPage() {
  const enabled = isFeatureEnabled("workflow_v2");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Load the most recent assessment on mount.
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/cybersecurity");
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        const latest: Assessment | undefined = data.assessments?.[0];
        setAssessment(latest ?? null);
      } catch {
        setAssessment(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled]);

  // Save a status change for a single requirement. Optimistic UI.
  const updateStatus = useCallback(
    async (requirementId: string, status: RequirementStatus) => {
      if (!assessment) return;
      setSavingId(requirementId);

      // Optimistic patch.
      setAssessment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          requirements: prev.requirements.map((r) =>
            r.requirementId === requirementId ? { ...r, status } : r,
          ),
        };
      });

      try {
        await fetch("/api/cybersecurity/requirements", {
          method: "POST",
          headers: await csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            assessmentId: assessment.id,
            requirementId,
            status,
          }),
        });
      } catch {
        // Silent fail — a reload reconciles.
      } finally {
        setSavingId(null);
      }
    },
    [assessment],
  );

  // ─── Render branches ───────────────────────────────────────────────

  if (!enabled) {
    return <FlagOffState />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (!assessment) {
    return <NoAssessmentState />;
  }

  // Derive profile + applicable requirements + queue.
  const profile: CybersecurityProfile = {
    organizationSize: assessment.organizationSize as OrganizationSize,
    spaceSegmentComplexity:
      assessment.spaceSegmentComplexity as SpaceSegmentComplexity,
    dataSensitivityLevel:
      assessment.dataSensitivityLevel as DataSensitivityLevel,
    hasGroundSegment: assessment.hasGroundSegment ?? true,
    processesPersonalData: assessment.processesPersonalData ?? false,
    handlesGovData: assessment.handlesGovData ?? false,
    existingCertifications: [],
    hasSecurityTeam: assessment.hasSecurityTeam ?? false,
    hasIncidentResponsePlan: assessment.hasIncidentResponsePlan ?? false,
    hasBCP: assessment.hasBCP ?? false,
    supplierSecurityAssessed: assessment.supplierSecurityAssessed ?? false,
    satelliteCount: assessment.satelliteCount ?? undefined,
  };

  const applicable: CybersecurityRequirement[] =
    getApplicableRequirements(profile);

  const statusLookup: Record<string, RequirementStatus> = Object.fromEntries(
    assessment.requirements.map((r) => [r.requirementId, r.status]),
  );

  const queue = buildWorkflowQueue({
    requirements: applicable,
    statusLookup,
  });

  return (
    <WorkflowShell
      queue={queue}
      profile={profile}
      isSimplified={assessment.isSimplifiedRegime}
      totalCatalogueSize={cybersecurityRequirements.length}
      onStatusChange={updateStatus}
      savingId={savingId}
    />
  );
}

// ─── Empty states ──────────────────────────────────────────────────────

function FlagOffState() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-6 text-center">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-2">
        Workflow view is not enabled
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Set{" "}
        <span className="inline-block px-1.5 py-0.5 rounded bg-[var(--fill-soft)] text-xs">
          NEXT_PUBLIC_FEAT_WORKFLOW_V2=1
        </span>{" "}
        to preview the orchestrated Tier-C workflow redesign.
      </p>
      <Link
        href="/dashboard/modules/cybersecurity"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--accent-primary)] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to classic cybersecurity
      </Link>
    </div>
  );
}

function NoAssessmentState() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-6 text-center">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-2">
        No cybersecurity assessment yet
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Create your first assessment from the classic module — the workflow view
        will pick it up automatically.
      </p>
      <Link
        href="/dashboard/modules/cybersecurity"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white transition-colors"
      >
        Start an assessment
      </Link>
    </div>
  );
}
