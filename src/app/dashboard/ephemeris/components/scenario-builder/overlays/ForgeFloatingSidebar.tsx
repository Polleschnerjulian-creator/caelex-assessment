"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ListChecks,
  Satellite,
  Activity,
  FileText,
  Clock,
  Orbit,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { GLASS, FORGE } from "../../../theme";

// ─── Nav Items ──────────────────────────────────────────────────────────────

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
    section: "OVERVIEW",
  },
  { icon: ListChecks, label: "Compliance", href: "/dashboard/tracker" },
  {
    icon: Satellite,
    label: "Sentinel",
    href: "/dashboard/sentinel",
    section: "MONITORING",
  },
  {
    icon: Activity,
    label: "Ephemeris",
    href: "/dashboard/ephemeris",
    active: true,
  },
  {
    icon: FileText,
    label: "Documents",
    href: "/dashboard/documents",
    section: "RESOURCES",
  },
  { icon: Clock, label: "Timeline", href: "/dashboard/timeline" },
  {
    icon: Orbit,
    label: "Mission Control",
    href: "/dashboard/mission-control",
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ForgeFloatingSidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        position: "fixed",
        left: 12,
        top: 12,
        bottom: 12,
        zIndex: 40,
        width: expanded ? 220 : 56,
        background: GLASS.bgSidebar,
        backdropFilter: `blur(${GLASS.blur}px)`,
        WebkitBackdropFilter: `blur(${GLASS.blur}px)`,
        border: `1px solid ${GLASS.borderSidebar}`,
        borderRadius: GLASS.panelRadius + 4,
        boxShadow: `${GLASS.shadow}, ${GLASS.insetGlow}`,
        padding: "16px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
      }}
    >
      {/* Brand mark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: expanded ? "4px 8px 12px" : "4px 0 12px",
          justifyContent: expanded ? "flex-start" : "center",
          borderBottom: `1px solid rgba(0,0,0,0.06)`,
          marginBottom: 8,
          minHeight: 32,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "linear-gradient(135deg, #10B981, #059669)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          C
        </div>
        {expanded && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: FORGE.textPrimary,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            CAELEX
          </span>
        )}
      </div>

      {/* Main nav */}
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}
      >
        {NAV_ITEMS.map((item, i) => (
          <React.Fragment key={item.href}>
            {item.section && i > 0 && (
              <div
                style={{
                  height: expanded ? 24 : 8,
                  display: "flex",
                  alignItems: "center",
                  padding: expanded ? "0 8px" : 0,
                  marginTop: 4,
                }}
              >
                {expanded && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: FORGE.textMuted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.section}
                  </span>
                )}
              </div>
            )}
            <NavLink item={item} expanded={expanded} />
          </React.Fragment>
        ))}
      </div>

      {/* Bottom nav */}
      <div
        style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          paddingTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {BOTTOM_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} expanded={expanded} />
        ))}
      </div>
    </div>
  );
}

// ─── NavLink Sub-Component ──────────────────────────────────────────────────

function NavLink({ item, expanded }: { item: NavItem; expanded: boolean }) {
  const [hovered, setHovered] = useState(false);

  const bg = item.active
    ? "rgba(16,185,129,0.10)"
    : hovered
      ? "rgba(0,0,0,0.04)"
      : "transparent";

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: expanded ? "7px 10px" : "7px 0",
        justifyContent: expanded ? "flex-start" : "center",
        borderRadius: 8,
        textDecoration: "none",
        color: item.active ? "#10B981" : FORGE.textSecondary,
        background: bg,
        transition: "background 150ms ease, color 150ms ease",
        whiteSpace: "nowrap",
        overflow: "hidden",
        position: "relative",
      }}
      title={expanded ? undefined : item.label}
    >
      <item.icon
        size={17}
        strokeWidth={item.active ? 2 : 1.5}
        style={{ flexShrink: 0 }}
      />
      {expanded && (
        <span
          style={{
            fontSize: 12.5,
            fontWeight: item.active ? 600 : 500,
            opacity: expanded ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
        >
          {item.label}
        </span>
      )}
      {item.active && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 16,
            borderRadius: 2,
            background: "#10B981",
          }}
        />
      )}
    </Link>
  );
}
