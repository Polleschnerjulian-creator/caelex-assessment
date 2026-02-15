"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileCheck,
  Trash2,
  Lock,
  Leaf,
  BarChart3,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const modules = [
  {
    id: "authorization",
    name: "Authorization",
    weight: 25,
    icon: FileCheck,
    articles: "Art. 6–27",
    description:
      "Core requirement under the EU Space Act. Evaluates the status of your authorization workflow, supporting documentation completeness, and regulatory submission readiness.",
    factors: [
      {
        name: "Authorization Status",
        points: 40,
        critical: true,
        detail:
          "Approved = 40pts, Submitted = 30pts, Ready = 25pts, In Progress = 15pts, Draft = 5pts",
      },
      {
        name: "Document Completeness",
        points: 30,
        critical: false,
        detail:
          "Based on percentage of required documents uploaded and approved",
      },
      {
        name: "Technical Compliance",
        points: 20,
        critical: false,
        detail: "Whether spacecraft parameters meet Art. 10 requirements",
      },
      {
        name: "Timeline Adherence",
        points: 10,
        critical: false,
        detail: "Meeting regulatory submission deadlines",
      },
    ],
  },
  {
    id: "debris",
    name: "Debris Mitigation",
    weight: 20,
    icon: Trash2,
    articles: "Art. 55–73",
    description:
      "Safety-critical module assessing compliance with space debris mitigation requirements. Evaluates debris mitigation plans, collision avoidance procedures, end-of-life disposal, and 25-year rule adherence.",
    factors: [
      {
        name: "Debris Mitigation Plan",
        points: 35,
        critical: true,
        detail:
          "Whether a compliant DMP exists: Complete = 35pts, In Progress = 20pts, None = 0pts",
      },
      {
        name: "Collision Avoidance",
        points: 25,
        critical: true,
        detail: "Active CA procedures, SSA subscription, maneuver capability",
      },
      {
        name: "End-of-Life Disposal",
        points: 25,
        critical: false,
        detail: "Disposal plan with propellant budget, success probability",
      },
      {
        name: "25-Year Rule",
        points: 15,
        critical: false,
        detail: "Verified calculation of post-mission orbital lifetime",
      },
    ],
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    weight: 20,
    icon: Lock,
    articles: "Art. 74–95",
    description:
      "Aligned with NIS2 Directive requirements. Assesses cybersecurity risk assessment maturity, incident response readiness, and technical security controls.",
    factors: [
      {
        name: "Risk Assessment",
        points: 30,
        critical: true,
        detail:
          "Complete assessment = 30pts, Partial = 15pts, None = 0pts. Covers Art. 21(2)(a-j) measures",
      },
      {
        name: "Incident Response",
        points: 25,
        critical: true,
        detail: "IRP documented, 24h/72h/30d timelines defined, team assigned",
      },
      {
        name: "Security Controls",
        points: 25,
        critical: false,
        detail:
          "Access controls, encryption, network segmentation, supply chain security",
      },
      {
        name: "Incident History",
        points: 20,
        critical: false,
        detail:
          "Penalty for unresolved incidents in current year. 0 incidents = full points",
      },
    ],
  },
  {
    id: "insurance",
    name: "Insurance",
    weight: 15,
    icon: Scale,
    articles: "Art. 28–32",
    description:
      "Evaluates third-party liability insurance coverage as mandated by the EU Space Act. Checks policy status, coverage adequacy, and expiry management.",
    factors: [
      {
        name: "Policy Status",
        points: 40,
        critical: true,
        detail:
          "Active valid policy = 40pts, Expiring within 90 days = 25pts, Expired/None = 0pts",
      },
      {
        name: "Coverage Adequacy",
        points: 35,
        critical: true,
        detail:
          "Coverage meets minimum threshold for operator type and mission risk profile",
      },
      {
        name: "Policy Documentation",
        points: 25,
        critical: false,
        detail: "Complete policy documents uploaded and verified",
      },
    ],
  },
  {
    id: "environmental",
    name: "Environmental",
    weight: 10,
    icon: Leaf,
    articles: "Art. 96–100",
    description:
      "Environmental Footprint Declaration (EFD) compliance. Evaluates life cycle assessment, supplier data collection, and footprint reporting.",
    factors: [
      {
        name: "EFD Assessment",
        points: 40,
        critical: false,
        detail: "Complete EFD = 40pts, In Progress = 20pts, None = 0pts",
      },
      {
        name: "Supplier Data",
        points: 35,
        critical: false,
        detail:
          "Supplier data requests sent and responses collected. Points based on response rate",
      },
      {
        name: "Reporting",
        points: 25,
        critical: false,
        detail: "Environmental impact data documented and submitted",
      },
    ],
  },
  {
    id: "reporting",
    name: "Reporting",
    weight: 10,
    icon: BarChart3,
    articles: "Art. 33–54",
    description:
      "Ongoing compliance reporting obligations. Evaluates supervision configuration, incident tracking, and periodic reporting submissions.",
    factors: [
      {
        name: "Supervision Setup",
        points: 30,
        critical: false,
        detail:
          "Supervision module configured with reporting parameters and schedules",
      },
      {
        name: "Incident Tracking",
        points: 35,
        critical: false,
        detail:
          "Incidents logged, classified, and reported within required timelines",
      },
      {
        name: "Periodic Reports",
        points: 35,
        critical: false,
        detail: "Annual and ad-hoc reports submitted on schedule",
      },
    ],
  },
];

const grades = [
  {
    grade: "A",
    range: "90–100",
    color: "bg-emerald-500",
    label: "Excellent",
    description: "Fully compliant across all modules",
  },
  {
    grade: "B",
    range: "80–89",
    color: "bg-green-500",
    label: "Good",
    description: "Compliant with minor gaps",
  },
  {
    grade: "C",
    range: "70–79",
    color: "bg-amber-500",
    label: "Adequate",
    description: "Mostly compliant, some areas need attention",
  },
  {
    grade: "D",
    range: "60–69",
    color: "bg-orange-500",
    label: "Below Standard",
    description: "Significant compliance gaps exist",
  },
  {
    grade: "F",
    range: "0–59",
    color: "bg-red-500",
    label: "Non-Compliant",
    description: "Critical deficiencies requiring immediate action",
  },
];

function SectionCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6"
    >
      {children}
    </motion.div>
  );
}

export default function ComplianceMethodologyPage() {
  const { t } = useLanguage();

  return (
    <div className="p-6 lg:p-8 min-h-screen">
      <div className="max-w-[900px]">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[13px] text-white/50 hover:text-white/70 mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          {t("methodology.backToDashboard")}
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-[28px] font-medium text-white">
              {t("methodology.title")}
            </h1>
          </div>
          <p className="text-[15px] text-white/60 leading-relaxed max-w-[700px]">
            {t("methodology.description")}
          </p>
        </motion.div>

        {/* How It Works */}
        <SectionCard delay={1}>
          <h2 className="text-[18px] font-medium text-white mb-4 flex items-center gap-2">
            <Info size={18} className="text-emerald-400" />
            {t("methodology.howItWorks")}
          </h2>
          <div className="space-y-4 text-[14px] text-white/70 leading-relaxed">
            <p>{t("methodology.howItWorksP1")}</p>
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 font-mono text-[13px] text-emerald-400">
              Overall Score = (Auth × 0.25) + (Debris × 0.20) + (Cyber × 0.20) +
              (Insurance × 0.15) + (Environmental × 0.10) + (Reporting × 0.10)
            </div>
            <p>{t("methodology.howItWorksP2")}</p>
          </div>
        </SectionCard>

        {/* Grade Scale */}
        <SectionCard delay={2}>
          <h2 className="text-[18px] font-medium text-white mb-4">
            {t("methodology.gradeScale")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {grades.map((g) => (
              <div
                key={g.grade}
                className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center"
              >
                <div
                  className={`w-10 h-10 rounded-full ${g.color} flex items-center justify-center mx-auto mb-2`}
                >
                  <span className="text-[18px] font-bold text-white">
                    {g.grade}
                  </span>
                </div>
                <p className="text-[12px] font-medium text-white mb-0.5">
                  {t(
                    `methodology.grade${g.grade}` as
                      | "methodology.gradeA"
                      | "methodology.gradeB"
                      | "methodology.gradeC"
                      | "methodology.gradeD"
                      | "methodology.gradeF",
                  )}
                </p>
                <p className="text-[11px] text-white/40">{g.range}</p>
                <p className="text-[10px] text-white/30 mt-1">
                  {t(
                    `methodology.grade${g.grade}Desc` as
                      | "methodology.gradeADesc"
                      | "methodology.gradeBDesc"
                      | "methodology.gradeCDesc"
                      | "methodology.gradeDDesc"
                      | "methodology.gradeFDesc",
                  )}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Critical Factors */}
        <SectionCard delay={3}>
          <h2 className="text-[18px] font-medium text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            {t("methodology.criticalFactors")}
          </h2>
          <p className="text-[14px] text-white/60 mb-4 leading-relaxed">
            {t("methodology.criticalFactorsDesc")}
          </p>
        </SectionCard>

        {/* Module Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <h2 className="text-[18px] font-medium text-white mb-5">
            {t("methodology.moduleBreakdown")}
          </h2>

          <div className="space-y-4">
            {modules.map((mod, i) => {
              const Icon = mod.icon;
              const totalPoints = mod.factors.reduce(
                (sum, f) => sum + f.points,
                0,
              );

              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
                >
                  {/* Module Header */}
                  <div className="flex items-center gap-4 p-5 border-b border-white/5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[16px] font-medium text-white">
                          {mod.name}
                        </h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                          {t("methodology.weight", { percent: mod.weight })}
                        </span>
                        <span className="text-[11px] font-mono text-white/30">
                          {mod.articles}
                        </span>
                      </div>
                      <p className="text-[13px] text-white/50 mt-1 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  {/* Factors Table */}
                  <div className="px-5 py-3">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left text-[10px] font-medium uppercase tracking-wider text-white/30 pb-2">
                            {t("methodology.scoringFactor")}
                          </th>
                          <th className="text-center text-[10px] font-medium uppercase tracking-wider text-white/30 pb-2 w-20">
                            {t("methodology.maxPoints")}
                          </th>
                          <th className="text-center text-[10px] font-medium uppercase tracking-wider text-white/30 pb-2 w-20">
                            {t("common.critical")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mod.factors.map((factor) => (
                          <tr
                            key={factor.name}
                            className="border-b border-white/[0.03] last:border-0"
                          >
                            <td className="py-2.5">
                              <p className="text-[13px] text-white/80 font-medium">
                                {factor.name}
                              </p>
                              <p className="text-[11px] text-white/40 mt-0.5">
                                {factor.detail}
                              </p>
                            </td>
                            <td className="text-center">
                              <span className="text-[13px] font-mono text-white/60">
                                {factor.points}
                              </span>
                            </td>
                            <td className="text-center">
                              {factor.critical ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                  <AlertTriangle size={10} />
                                  {t("common.yes")}
                                </span>
                              ) : (
                                <span className="text-[10px] text-white/20">
                                  {t("common.no")}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10">
                          <td className="pt-2 text-[12px] text-white/50 font-medium">
                            {t("common.total")}
                          </td>
                          <td className="pt-2 text-center text-[13px] font-mono text-white/70 font-medium">
                            {totalPoints}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Recommendations */}
        <SectionCard delay={12}>
          <h2 className="text-[18px] font-medium text-white mb-3 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            {t("methodology.howRecommendationsWork")}
          </h2>
          <p className="text-[14px] text-white/60 leading-relaxed">
            {t("methodology.recommendationsP1")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              {
                level: t("common.critical"),
                color: "bg-red-500/20 text-red-400 border-red-500/30",
                rule: t("methodology.priorityCriticalDesc"),
              },
              {
                level: t("common.high"),
                color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                rule: t("methodology.priorityHighDesc"),
              },
              {
                level: t("common.medium"),
                color:
                  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                rule: t("methodology.priorityMediumDesc"),
              },
              {
                level: t("common.low"),
                color: "bg-white/10 text-white/50 border-white/10",
                rule: t("methodology.priorityLowDesc"),
              },
            ].map((p) => (
              <div
                key={p.level}
                className={`text-center p-3 rounded-lg border ${p.color}`}
              >
                <p className="text-[12px] font-medium">{p.level}</p>
                <p className="text-[10px] opacity-70 mt-1">{p.rule}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Data Sources */}
        <SectionCard delay={13}>
          <h2 className="text-[18px] font-medium text-white mb-3">
            {t("methodology.dataSources")}
          </h2>
          <p className="text-[14px] text-white/60 leading-relaxed mb-4">
            {t("methodology.dataSourcesDesc")}
          </p>
          <ul className="space-y-2 text-[13px] text-white/60">
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="text-emerald-400 mt-0.5 flex-shrink-0"
              />
              {t("methodology.dsAssessments")}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="text-emerald-400 mt-0.5 flex-shrink-0"
              />
              {t("methodology.dsDocuments")}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="text-emerald-400 mt-0.5 flex-shrink-0"
              />
              {t("methodology.dsArticleTracker")}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="text-emerald-400 mt-0.5 flex-shrink-0"
              />
              {t("methodology.dsWorkflows")}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="text-emerald-400 mt-0.5 flex-shrink-0"
              />
              {t("methodology.dsIncidents")}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={14}
                className="text-emerald-400 mt-0.5 flex-shrink-0"
              />
              {t("methodology.dsTimeline")}
            </li>
          </ul>
        </SectionCard>

        {/* Disclaimer */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 mb-8">
          <p className="text-[11px] text-white/30 leading-relaxed">
            <strong className="text-white/50">
              {t("methodology.disclaimer")}:
            </strong>{" "}
            {t("methodology.disclaimerText")}
          </p>
        </div>
      </div>
    </div>
  );
}
