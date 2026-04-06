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
      { id: "fleet", label: "Fleet Command", icon: "/" },
      { id: "intel", label: "Intelligence", icon: "/" },
    ],
  },
  {
    title: "MONITORING",
    items: [
      { id: "tracking", label: "Orbital Tracking", icon: "/" },
      { id: "alerts", label: "Alerts & Anomalies", icon: "/" },
      { id: "weather", label: "Space Weather", icon: "/" },
    ],
  },
  {
    title: "PREDICTION",
    items: [
      { id: "forecast", label: "Compliance Forecast", icon: "/" },
      { id: "dependencies", label: "Dependencies", icon: "/" },
    ],
  },
  {
    title: "TOOLS",
    items: [{ id: "forge", label: "Scenario Builder", icon: "/" }],
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
        <img
          src="/images/ephemeris-logo.png"
          alt="Ephemeris"
          style={{ height: 26, width: "auto", flexShrink: 0 }}
        />
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
                  <span
                    className="eph-sidebar-item-icon"
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      background: "currentColor",
                      opacity: 0.5,
                      flexShrink: 0,
                    }}
                  />
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
