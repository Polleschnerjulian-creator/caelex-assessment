"use client";

import Link from "next/link";

export type NavModule =
  | "orbital"
  | "conjunctions"
  | "debris"
  | "operators"
  | "ground"
  | "analytics"
  | "forge"
  | "settings";

interface NavItem {
  id: NavModule;
  icon: string;
  label: string;
  tooltipTitle: string;
  tooltipDesc: string;
  href?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "orbital",
    icon: "\u2295",
    label: "ORBITAL",
    tooltipTitle: "Orbital View",
    tooltipDesc: "Live satellite tracking & visualization",
    href: "/dashboard/ephemeris",
  },
  {
    id: "conjunctions",
    icon: "\u26A0",
    label: "CONJ",
    tooltipTitle: "Conjunctions",
    tooltipDesc: "Collision risk assessment & alerts",
  },
  {
    id: "debris",
    icon: "\u25CC",
    label: "DEBRIS",
    tooltipTitle: "Debris Field",
    tooltipDesc: "Space debris tracking & analysis",
  },
  {
    id: "operators",
    icon: "\u25C8",
    label: "OPS",
    tooltipTitle: "Operators",
    tooltipDesc: "Operator fleet management",
  },
  {
    id: "ground",
    icon: "\u25BD",
    label: "GROUND",
    tooltipTitle: "Ground Stations",
    tooltipDesc: "Ground segment coverage map",
  },
  {
    id: "analytics",
    icon: "\u25EB",
    label: "ANALYTX",
    tooltipTitle: "Analytics",
    tooltipDesc: "Orbital density & compliance metrics",
  },
  {
    id: "forge",
    icon: "\u2B22",
    label: "FORGE",
    tooltipTitle: "Scenario Builder",
    tooltipDesc: "Simulate orbital what-if scenarios",
  },
];

interface EphemerisNavRailProps {
  activeModule: NavModule;
  onModuleChange: (module: NavModule) => void;
}

export default function EphemerisNavRail({
  activeModule,
  onModuleChange,
}: EphemerisNavRailProps) {
  return (
    <div className="eph-nav-rail">
      {NAV_ITEMS.map((item) => {
        const isActive = activeModule === item.id;

        if (item.href && item.id !== "forge") {
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`eph-nav-item ${isActive ? "active" : ""}`}
              onClick={() => onModuleChange(item.id)}
              style={{ textDecoration: "none" }}
            >
              <div className="eph-nav-icon">{item.icon}</div>
              <div className="eph-nav-label">{item.label}</div>
              <div className="eph-tooltip">
                {item.tooltipTitle}
                <div className="eph-tt-desc">{item.tooltipDesc}</div>
              </div>
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            className={`eph-nav-item ${isActive ? "active" : ""}`}
            onClick={() => onModuleChange(item.id)}
          >
            <div className="eph-nav-icon">{item.icon}</div>
            <div className="eph-nav-label">{item.label}</div>
            <div className="eph-tooltip">
              {item.tooltipTitle}
              <div className="eph-tt-desc">{item.tooltipDesc}</div>
            </div>
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      <button
        className="eph-nav-item"
        style={{ opacity: 0.4 }}
        onClick={() => onModuleChange("settings")}
      >
        <div className="eph-nav-icon">{"\u2699"}</div>
        <div className="eph-nav-label">CONFIG</div>
      </button>
    </div>
  );
}
