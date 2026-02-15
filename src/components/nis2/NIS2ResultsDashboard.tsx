"use client";

import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, ExternalLink } from "lucide-react";
import Link from "next/link";
import NIS2ClassificationCard from "./NIS2ClassificationCard";
import NIS2IncidentTimeline from "./NIS2IncidentTimeline";
import NIS2RequirementsList from "./NIS2RequirementsList";
import NIS2CrosswalkView from "./NIS2CrosswalkView";
import NIS2ComplianceMatrix from "./NIS2ComplianceMatrix";
import DisclaimerBanner from "@/components/ui/disclaimer-banner";

interface NIS2ResultsDashboardProps {
  result: {
    entityClassification: "essential" | "important" | "out_of_scope";
    classificationReason: string;
    classificationArticleRef: string;
    sector: string;
    subSector: string | null;
    organizationSize: string;
    applicableRequirements: {
      id: string;
      articleRef: string;
      category: string;
      title: string;
      severity: "critical" | "major" | "minor";
    }[];
    totalNIS2Requirements: number;
    applicableCount: number;
    incidentReportingTimeline: {
      earlyWarning: { deadline: string; description: string };
      notification: { deadline: string; description: string };
      intermediateReport: { deadline: string; description: string };
      finalReport: { deadline: string; description: string };
    };
    euSpaceActOverlap: {
      count: number;
      totalPotentialSavingsWeeks: number;
      overlappingRequirements?: {
        nis2RequirementId: string;
        nis2Article: string;
        nis2Title: string;
        euSpaceActArticle: string;
        description: string;
        effortType:
          | "single_implementation"
          | "partial_overlap"
          | "separate_effort";
      }[];
    };
    penalties: {
      essential: string;
      important: string;
      applicable: string;
    };
    registrationRequired: boolean;
    registrationDeadline?: string;
    keyDates: { date: string; description: string }[];
    supervisoryAuthority?: string;
    supervisoryAuthorityNote?: string;
  };
  onRestart: () => void;
}

export default function NIS2ResultsDashboard({
  result,
  onRestart,
}: NIS2ResultsDashboardProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/assessment"
            className="flex items-center gap-2 text-[13px] text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>All assessments</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              NIS2 Compliance Profile
            </span>
            <button
              onClick={onRestart}
              className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white transition-colors"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Restart
            </button>
          </div>
        </div>
      </div>

      {/* Results content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-light tracking-[-0.02em] text-white mb-2">
            Your NIS2 Compliance Profile
          </h1>
          <p className="text-sm text-white/40">
            Based on your assessment answers, here is your NIS2 Directive
            compliance profile for the space sector.
          </p>
        </motion.div>

        {/* Grid layout */}
        <div className="space-y-6">
          {/* Row 1: Classification + Incident Timeline */}
          <div className="grid md:grid-cols-2 gap-6">
            <NIS2ClassificationCard
              classification={result.entityClassification}
              reason={result.classificationReason}
              articleRef={result.classificationArticleRef}
              sector={result.sector}
              organizationSize={result.organizationSize}
            />
            <NIS2IncidentTimeline timeline={result.incidentReportingTimeline} />
          </div>

          {/* Row 2: Requirements list */}
          <NIS2RequirementsList
            requirements={result.applicableRequirements}
            totalCount={result.totalNIS2Requirements}
            applicableCount={result.applicableCount}
          />

          {/* Row 3: Crosswalk + Compliance Matrix */}
          <div className="grid md:grid-cols-2 gap-6">
            <NIS2CrosswalkView
              overlappingRequirements={
                result.euSpaceActOverlap.overlappingRequirements || []
              }
              overlapCount={result.euSpaceActOverlap.count}
              totalApplicable={result.applicableCount}
              totalPotentialSavingsWeeks={
                result.euSpaceActOverlap.totalPotentialSavingsWeeks
              }
            />
            <NIS2ComplianceMatrix
              penalties={result.penalties}
              registrationRequired={result.registrationRequired}
              registrationDeadline={result.registrationDeadline || ""}
              keyDates={result.keyDates}
              supervisoryAuthority={
                result.supervisoryAuthority || "National Competent Authority"
              }
              supervisoryAuthorityNote={
                result.supervisoryAuthorityNote ||
                "Contact your national authority for space sector supervision details."
              }
            />
          </div>

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <DisclaimerBanner
              assessmentType="nis2"
              variant="footer"
              showTermsLink
            />
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-center py-8"
          >
            <p className="text-white/40 text-sm mb-4">
              Want to track and manage your NIS2 compliance?
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                href="/assessment/eu-space-act"
                className="flex items-center gap-2 px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white rounded-lg text-sm transition-colors"
              >
                Assess EU Space Act
                <ExternalLink size={14} aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
