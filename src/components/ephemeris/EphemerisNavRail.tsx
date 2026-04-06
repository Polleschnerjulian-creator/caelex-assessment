"use client";

import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NavModule =
  | "fleet"
  | "intel"
  | "tracking"
  | "alerts"
  | "weather"
  | "forecast"
  | "dependencies"
  | "forge";

interface NavItem {
  id: NavModule;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { id: "fleet", label: "Fleet Command", icon: "\u2B21" },
      { id: "intel", label: "Intelligence", icon: "\uD83D\uDCCA" },
    ],
  },
  {
    title: "MONITORING",
    items: [
      { id: "tracking", label: "Orbital Tracking", icon: "\uD83D\uDEF0" },
      { id: "alerts", label: "Alerts & Anomalies", icon: "\u26A0" },
      { id: "weather", label: "Space Weather", icon: "\uD83C\uDF24" },
    ],
  },
  {
    title: "PREDICTION",
    items: [
      { id: "forecast", label: "Compliance Forecast", icon: "\uD83D\uDCC8" },
      { id: "dependencies", label: "Dependencies", icon: "\uD83D\uDD17" },
    ],
  },
  {
    title: "TOOLS",
    items: [{ id: "forge", label: "Scenario Builder", icon: "\u26A1" }],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EphemerisNavProps {
  activeModule: string;
  onModuleChange: (moduleId: NavModule) => void;
  alertCount?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EphemerisNavRail({
  activeModule,
  onModuleChange,
  alertCount,
}: EphemerisNavProps) {
  return (
    <nav className="eph-sidebar">
      {/* Logo */}
      <div className="eph-sidebar-logo">
        <div className="eph-sidebar-logo-mark">
          <span>e</span>
        </div>
        <span className="eph-sidebar-brand">EPHEMERIS</span>
      </div>

      {/* Sections */}
      <div className="eph-sidebar-sections">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="eph-sidebar-section">
            <div className="eph-sidebar-section-title">{section.title}</div>
            {section.items.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  className={`eph-sidebar-item${isActive ? " active" : ""}`}
                  onClick={() => onModuleChange(item.id)}
                  type="button"
                >
                  <span className="eph-sidebar-item-icon">{item.icon}</span>
                  <span className="eph-sidebar-item-label">{item.label}</span>
                  {item.id === "alerts" &&
                    alertCount != null &&
                    alertCount > 0 && (
                      <span className="eph-sidebar-badge">{alertCount}</span>
                    )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Back link */}
      <div className="eph-sidebar-footer">
        <Link href="/dashboard" className="eph-sidebar-back">
          <span style={{ marginRight: 6 }}>&larr;</span>
          Back to Caelex
        </Link>
      </div>
    </nav>
  );
}
