// ─── Demo Tour Step Definitions ─────────────────────────────────────────────
// Each step navigates to a page, shows a title/description overlay,
// and highlights a specific area. Used for video recording.

export interface TourStep {
  id: string;
  route: string;
  title: string;
  subtitle: string;
  description: string;
  durationMs: number;
  badge?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    route: "/dashboard",
    title: "Compliance Command Center",
    subtitle: "Real-time regulatory intelligence across all modules",
    description:
      "Centralized compliance scoring, risk heatmaps, and regulatory deadline tracking for satellite operators, launch providers, and space service companies.",
    durationMs: 8000,
  },
  {
    id: "assessment",
    route: "/assessment/eu-space-act",
    title: "EU Space Act Assessment",
    subtitle: "119 articles · 7 operator types · 9 compliance modules",
    description:
      "Guided assessment wizard mapping your operations against the complete EU Space Act (COM(2025) 335). Covers authorization, registration, debris, insurance, NIS2, and environmental requirements.",
    durationMs: 8000,
    badge: "EU Space Act",
  },
  {
    id: "environmental",
    route: "/dashboard/modules/environmental",
    title: "Environmental Footprint Declaration",
    subtitle: "Copernicus Sentinel-5P verified · ISO 14040/44",
    description:
      "Full lifecycle assessment with real Copernicus satellite data verification. The What-If Optimizer lets operators simulate how different launch vehicles, propellants, and deorbit strategies affect their EFD grade — in real-time.",
    durationMs: 10000,
    badge: "Copernicus",
  },
  {
    id: "cybersecurity",
    route: "/dashboard/modules/cybersecurity",
    title: "NIS2 Cybersecurity Compliance",
    subtitle: "Art. 21 · Risk analysis · Incident response",
    description:
      "Space-scoped NIS2 compliance with 51 requirements, ENISA controls mapping, and automated incident response workflows with NCA notification drafting.",
    durationMs: 7000,
    badge: "NIS2",
  },
  {
    id: "audit",
    route: "/dashboard/audit-center",
    title: "Galileo Authenticated Audit Trail",
    subtitle: "EU GNSS · SHA-256 hash chain · Tamper-evident",
    description:
      "Every compliance action is timestamped using EU Galileo OSNMA-synchronized time and secured with SHA-256 hash chains — providing EU-sovereign, cryptographically verified proof of regulatory events.",
    durationMs: 8000,
    badge: "Galileo",
  },
  {
    id: "ephemeris",
    route: "/dashboard/ephemeris",
    title: "Satellite Compliance Forecasting",
    subtitle: "CelesTrak TLE · ESA DISCOS · What-If Scenarios",
    description:
      "Orbital decay modeling, fuel depletion forecasting, and compliance state prediction. The Scenario Builder lets operators simulate orbital maneuvers and see regulatory impact in real-time.",
    durationMs: 8000,
    badge: "EU SST",
  },
  {
    id: "incidents",
    route: "/dashboard/incidents",
    title: "NIS2 Incident Command Center",
    subtitle: "Art. 23 · Live deadline tracking · Auto-escalation",
    description:
      "Incident response with NIS2 phase tracking, NCA notification drafting, and automatic escalation. Covers the full 24h/72h/1month reporting timeline.",
    durationMs: 7000,
  },
  {
    id: "network",
    route: "/dashboard/network",
    title: "Compliance Network",
    subtitle: "Stakeholder attestations · Data rooms · Supply chain",
    description:
      "Collaborative compliance across the space value chain. Suppliers, insurers, and regulators share verified compliance data through attestations and secure data rooms.",
    durationMs: 7000,
  },
];

export const TOTAL_TOUR_DURATION = TOUR_STEPS.reduce(
  (sum, s) => sum + s.durationMs,
  0,
);
