"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  CalendarClock,
  ListChecks,
  FileCheck,
  Shield,
  Leaf,
  Orbit,
  ShieldCheck,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "timeline", label: "Timeline", icon: CalendarClock },
  { id: "tracker", label: "Tracker", icon: ListChecks },
] as const;

type TabId = (typeof tabs)[number]["id"];

// Mock data for dashboard tab
const dashboardStats = [
  { value: "45%", label: "Compliant", color: "text-emerald-400" },
  { value: "67", label: "Applicable Articles", color: "text-blue-400" },
  { value: "12", label: "Documents", color: "text-white" },
  { value: "1,642", label: "Days until 2030", color: "text-amber-400" },
];

const dashboardModules = [
  {
    icon: FileCheck,
    name: "Authorization & Licensing",
    progress: 32,
    status: "In Progress",
  },
  {
    icon: Shield,
    name: "Cybersecurity & Resilience",
    progress: 68,
    status: "In Progress",
  },
  {
    icon: Orbit,
    name: "Debris Mitigation & Safety",
    progress: 45,
    status: "In Progress",
  },
  {
    icon: Leaf,
    name: "Environmental Footprint",
    progress: 15,
    status: "In Progress",
  },
  {
    icon: ShieldCheck,
    name: "Insurance & Liability",
    progress: 0,
    status: "Not Started",
  },
  {
    icon: Eye,
    name: "Supervision & Reporting",
    progress: 0,
    status: "Not Started",
  },
];

type DocStatus = "complete" | "expiring" | "missing";

// Mock data for documents tab
const documentCategories: { name: string; count: number; status: DocStatus }[] =
  [
    { name: "Authorization Application", count: 3, status: "complete" },
    { name: "Insurance Certificates", count: 1, status: "expiring" },
    { name: "Debris Mitigation Plan", count: 2, status: "complete" },
    { name: "Cybersecurity Assessment", count: 0, status: "missing" },
    { name: "Environmental Footprint", count: 1, status: "complete" },
    { name: "NCA Correspondence", count: 4, status: "complete" },
    { name: "Technical Specifications", count: 2, status: "complete" },
    { name: "Regulatory Filings", count: 1, status: "expiring" },
  ];

// Mock data for timeline tab
const timelineDeadlines = [
  {
    date: "Mar 2027",
    title: "Environmental Footprint Declaration",
    urgency: "medium" as const,
  },
  {
    date: "Jun 2028",
    title: "Cybersecurity Baseline Assessment",
    urgency: "low" as const,
  },
  {
    date: "Jan 2029",
    title: "Authorization Application Filing",
    urgency: "high" as const,
  },
  {
    date: "Sep 2029",
    title: "Insurance Coverage Renewal",
    urgency: "medium" as const,
  },
  {
    date: "Jan 2030",
    title: "EU Space Act Enforcement Date",
    urgency: "critical" as const,
  },
];

// Mock data for tracker tab
const trackerArticles = [
  {
    number: "Art. 6",
    title: "Authorization requirement",
    module: "Authorization",
    status: "compliant" as const,
  },
  {
    number: "Art. 7",
    title: "Application procedures",
    module: "Authorization",
    status: "in_progress" as const,
  },
  {
    number: "Art. 10",
    title: "Light regime eligibility",
    module: "Authorization",
    status: "compliant" as const,
  },
  {
    number: "Art. 24",
    title: "Registration obligations",
    module: "Registration",
    status: "not_started" as const,
  },
  {
    number: "Art. 58",
    title: "Debris mitigation planning",
    module: "Debris",
    status: "in_progress" as const,
  },
  {
    number: "Art. 74",
    title: "Cybersecurity requirements",
    module: "Cybersecurity",
    status: "in_progress" as const,
  },
  {
    number: "Art. 96",
    title: "Environmental footprint",
    module: "Environmental",
    status: "not_started" as const,
  },
];

const urgencyColors = {
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

const statusIcons = {
  compliant: { icon: CheckCircle2, color: "text-emerald-400" },
  in_progress: { icon: Clock, color: "text-amber-400" },
  not_started: { icon: XCircle, color: "text-white/20" },
};

const docStatusConfig = {
  complete: { color: "bg-emerald-500/20 text-emerald-400", label: "Complete" },
  expiring: { color: "bg-amber-500/20 text-amber-400", label: "Expiring" },
  missing: { color: "bg-red-500/20 text-red-400", label: "Missing" },
};

function DashboardTab() {
  return (
    <div className="p-4 md:p-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {dashboardStats.map((stat, i) => (
          <div
            key={i}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 md:p-4"
          >
            <p
              className={`font-mono text-[20px] md:text-[24px] font-light ${stat.color}`}
            >
              {stat.value}
            </p>
            <p className="font-mono text-[10px] text-white/35 mt-1 uppercase tracking-wider">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Module progress */}
      <div className="space-y-2">
        {dashboardModules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 md:px-4 py-3"
            >
              <Icon
                size={14}
                className="text-white/30 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="text-[12px] md:text-[13px] text-white/60 flex-1 min-w-0 truncate">
                {mod.name}
              </span>
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                <div
                  className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-label={`${mod.name} progress`}
                  aria-valuenow={mod.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-blue-500/60 rounded-full"
                    style={{ width: `${mod.progress}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-white/30 w-8 text-right">
                  {mod.progress}%
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${
                  mod.progress > 0
                    ? "bg-blue-500/10 text-blue-400/60"
                    : "bg-white/[0.04] text-white/25"
                }`}
              >
                {mod.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentsTab() {
  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {documentCategories.map((doc, i) => {
          const config = docStatusConfig[doc.status];
          return (
            <div
              key={i}
              className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FolderOpen
                  size={14}
                  className="text-white/25 flex-shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-[12px] text-white/60 truncate">
                    {doc.name}
                  </p>
                  <p className="font-mono text-[10px] text-white/25">
                    {doc.count} files
                  </p>
                </div>
              </div>
              <span
                className={`text-[11px] sm:text-[10px] md:text-[9px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${config.color}`}
              >
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineTab() {
  return (
    <div className="p-4 md:p-6">
      <div className="space-y-3">
        {timelineDeadlines.map((deadline, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.04] rounded-lg px-4 py-3"
          >
            <span className="font-mono text-[11px] text-white/30 w-16 flex-shrink-0">
              {deadline.date}
            </span>
            <div className="w-px h-5 bg-white/[0.08]" />
            <p className="text-[12px] text-white/55 flex-1 min-w-0 truncate">
              {deadline.title}
            </p>
            <span
              className={`text-[11px] sm:text-[10px] md:text-[9px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${urgencyColors[deadline.urgency]}`}
            >
              {deadline.urgency}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackerTab() {
  return (
    <div className="p-4 md:p-6">
      <div className="space-y-2">
        {trackerArticles.map((article, i) => {
          const statusConfig = statusIcons[article.status];
          const StatusIcon = statusConfig.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-lg px-4 py-3"
            >
              <StatusIcon
                size={14}
                className={`${statusConfig.color} flex-shrink-0`}
                aria-hidden="true"
              />
              <span className="font-mono text-[11px] text-white/40 w-12 flex-shrink-0">
                {article.number}
              </span>
              <p className="text-[12px] text-white/55 flex-1 min-w-0 truncate">
                {article.title}
              </p>
              <span className="text-[10px] font-mono text-white/25 bg-white/[0.04] px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:block">
                {article.module}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const tabComponents: Record<TabId, React.FC> = {
  dashboard: DashboardTab,
  documents: DocumentsTab,
  timeline: TimelineTab,
  tracker: TrackerTab,
};

export default function PlatformPreview() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const ActiveComponent = tabComponents[activeTab];

  return (
    <section
      ref={ref}
      id="platform"
      className="relative py-32 md:py-40 bg-black overflow-hidden"
      aria-label="Platform preview"
    >
      {/* Section number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="absolute top-12 right-6 md:right-12"
        aria-hidden="true"
      >
        <span className="font-mono text-[11px] text-white/30">05 / 12</span>
      </motion.div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 block mb-6">
            Your Compliance Command Center
          </span>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-light tracking-[-0.02em] text-white leading-[1.2] max-w-[600px] mx-auto mb-4">
            One platform.
            <br />
            <span className="text-white/50">Complete visibility.</span>
          </h2>
          <p className="text-[14px] text-white/40 max-w-[450px] mx-auto">
            Track every article, every deadline, every document — in real time.
          </p>
        </motion.div>

        {/* Platform mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative"
        >
          {/* Perspective wrapper */}
          <div className="relative" style={{ perspective: "2000px" }}>
            <div
              className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]"
              style={{
                transform: "rotateX(2deg)",
                transformOrigin: "center bottom",
              }}
            >
              {/* Tab bar */}
              <div
                className="flex items-center gap-1 px-4 md:px-6 pt-4 pb-3 border-b border-white/[0.06]"
                role="tablist"
                aria-label="Platform views"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`tabpanel-${tab.id}`}
                      id={`tab-${tab.id}`}
                      className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-white/[0.08] text-white"
                          : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]"
                      }`}
                    >
                      <Icon size={13} aria-hidden="true" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden sr-only">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-[320px] md:min-h-[380px]"
                  role="tabpanel"
                  id={`tabpanel-${activeTab}`}
                  aria-labelledby={`tab-${activeTab}`}
                >
                  <ActiveComponent />
                </motion.div>
              </AnimatePresence>

              {/* Bottom fade gradient */}
              <div
                className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Glow effect behind the card */}
          <div
            className="absolute -inset-10 bg-blue-500/[0.03] rounded-full blur-3xl pointer-events-none -z-10"
            aria-hidden="true"
          />
        </motion.div>
      </div>
    </section>
  );
}
