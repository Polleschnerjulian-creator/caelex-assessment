"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Satellite,
  AlertTriangle,
  TrendingUp,
  Workflow,
  Network,
  Cloud,
  ArrowLeft,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/dashboard/ephemeris",
    label: "Fleet Overview",
    icon: Satellite,
    exact: true,
  },
  {
    href: "/dashboard/ephemeris/alerts",
    label: "Alerts",
    icon: AlertTriangle,
    badge: null as string | null,
  },
  {
    href: "/dashboard/ephemeris/forecast",
    label: "Forecast",
    icon: TrendingUp,
  },
  {
    href: "/dashboard/ephemeris/forge",
    label: "Scenario Builder",
    icon: Workflow,
  },
  {
    href: "/dashboard/ephemeris/dependencies",
    label: "Dependencies",
    icon: Network,
  },
  {
    href: "/dashboard/ephemeris/weather",
    label: "Space Weather",
    icon: Cloud,
  },
];

export default function EphemerisSidebar() {
  const pathname = usePathname();

  return (
    <div
      style={{
        width: 240,
        minWidth: 240,
        minHeight: "100vh",
        background: "rgba(255,255,255,0.03)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        padding: "24px 12px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 12px", marginBottom: 48 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: "white",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "black",
              fontSize: 22,
              fontWeight: 800,
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1,
            }}
          >
            e
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                color: isActive
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.5)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{item.label}</span>
              {"badge" in item && item.badge && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Back to Caelex */}
      <div style={{ marginTop: "auto", padding: "0 12px" }}>
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(255,255,255,0.3)",
            fontSize: 12,
            textDecoration: "none",
            transition: "color 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.3)";
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to Caelex
        </Link>
      </div>
    </div>
  );
}
