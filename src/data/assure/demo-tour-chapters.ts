import {
  TrendingUp,
  BadgeCheck,
  FolderLock,
  ShieldAlert,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DemoChapter {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  icon: LucideIcon;
  accentColor: string;
}

export const DEMO_CHAPTERS: DemoChapter[] = [
  {
    id: "irs-dashboard",
    title: "Investment Readiness Score",
    subtitle: "Your fundraise-readiness at a glance",
    description:
      "One score that synthesizes market opportunity, technology maturity, team strength, financials, regulatory position, and traction into a single investor-trusted metric. Updated in real-time as your company evolves.",
    highlights: [
      "6 weighted components scored 0\u2013100",
      "Peer benchmarking against European space startups",
      "Actionable improvement roadmap",
    ],
    icon: TrendingUp,
    accentColor: "emerald",
  },
  {
    id: "rcr-rating",
    title: "Regulatory Credit Rating",
    subtitle: "A credit-rating for regulatory maturity",
    description:
      "AAA to D letter grades that investors instantly understand. Built on your real compliance data from Caelex Comply, with temporal decay, outlook signals, and peer percentile ranking.",
    highlights: [
      "Letter grades from AAA to D",
      "Outlook indicators (positive, stable, negative)",
      "Rating watch alerts for urgent action",
    ],
    icon: BadgeCheck,
    accentColor: "emerald",
  },
  {
    id: "data-room",
    title: "Investor Data Room",
    subtitle: "Due diligence, always audit-ready",
    description:
      "A structured, permission-controlled data room built for space industry due diligence. Track who viewed what, when, and for how long. Generate shareable links with granular access controls.",
    highlights: [
      "Standard DD folder structure pre-configured",
      "Viewer analytics and access logs",
      "One-click shareable links with expiry",
    ],
    icon: FolderLock,
    accentColor: "emerald",
  },
  {
    id: "risk-heatmap",
    title: "Risk Intelligence",
    subtitle: "Quantified risk that de-risks your fundraise",
    description:
      "A 5\u00d75 risk heatmap with scenario analysis tailored to space operations. Auto-populated risk templates based on your operator type. Show investors you understand and manage your risk profile.",
    highlights: [
      "5\u00d75 likelihood \u00d7 impact heatmap",
      "Scenario analysis with financial projections",
      "Auto-populated templates per operator type",
    ],
    icon: ShieldAlert,
    accentColor: "emerald",
  },
  {
    id: "comply-integration",
    title: "Comply Integration",
    subtitle: "Regulatory data becomes competitive advantage",
    description:
      "Your compliance work in Caelex Comply automatically feeds into Assure. Assessment results, module statuses, and evidence coverage become your Regulatory Readiness Score \u2014 a unique advantage no competitor can replicate.",
    highlights: [
      "Automatic RRS calculation from Comply data",
      "+5 bonus on regulatory component for linked accounts",
      "47 EU Space Act cross-references mapped",
    ],
    icon: Layers,
    accentColor: "emerald",
  },
];
