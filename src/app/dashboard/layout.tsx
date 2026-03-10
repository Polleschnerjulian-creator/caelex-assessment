"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { OrganizationProvider } from "@/components/providers/OrganizationProvider";
import ErrorBoundary from "@/components/dashboard/ErrorBoundary";
import { AstraProvider } from "@/components/astra/AstraProvider";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import {
  LanguageProvider,
  useLanguage,
} from "@/components/providers/LanguageProvider";
// Caelex cube-corner logo (inline SVG for FAB)

const ROUTE_TITLE_MAP: Record<string, string> = {
  "/dashboard": "sidebar.dashboard",
  "/dashboard/tracker": "sidebar.complianceTracker",
  "/dashboard/generate": "sidebar.documentGenerator",
  "/dashboard/mission-control": "sidebar.missionControl",
  "/dashboard/documents": "sidebar.documents",
  "/dashboard/audit-center": "sidebar.auditCenter",
  "/dashboard/timeline": "sidebar.timeline",
  "/dashboard/digital-twin": "sidebar.digitalTwin",
  "/dashboard/incidents": "sidebar.incidents",
  "/dashboard/regulatory-feed": "sidebar.regulatoryFeed",
  "/dashboard/nca-portal": "sidebar.ncaPortal",
  "/dashboard/network": "sidebar.complianceNetwork",
  "/dashboard/assure": "_literal:Regulatory Readiness",
  "/dashboard/assure/score": "_literal:RRS Score Details",
  "/dashboard/assure/share": "_literal:Share Links",
  "/dashboard/assure/packages": "_literal:DD Packages",
  "/dashboard/assure/rating": "_literal:Regulatory Credit Rating",
  "/dashboard/assure/rating/report": "_literal:Rating Report",
  "/dashboard/assure/rating/methodology": "_literal:Rating Methodology",
  "/dashboard/assure/rating/appeal": "_literal:Rating Appeals",
  "/dashboard/evidence": "_literal:Evidence Coverage",
  "/dashboard/sentinel": "_literal:Sentinel",
  "/dashboard/ephemeris": "_literal:Ephemeris",
  "/dashboard/optimizer": "_literal:Regulatory Arbitrage Optimizer",
  "/dashboard/settings": "sidebar.settings",
  "/dashboard/admin": "sidebar.adminPanel",
};

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [layoutMounted, setLayoutMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Read sidebar state — default collapsed
    const stored = localStorage.getItem("caelex-sidebar-collapsed");
    if (stored === "false") setSidebarCollapsed(false);
    setLayoutMounted(true);
  }, []);
  const router = useRouter();
  const { t } = useLanguage();
  useAnalyticsTracking();

  // Redirect new users to onboarding
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.onboardingCompleted === false) {
          router.replace("/onboarding");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, router]);

  // Derive page title from route
  let pageTitle: string | undefined;
  if (pathname === "/dashboard/astra") {
    pageTitle = "ASTRA";
  } else if (pathname.startsWith("/dashboard/modules/")) {
    const moduleName = pathname.split("/dashboard/modules/")[1]?.split("/")[0];
    if (moduleName) {
      pageTitle = moduleName
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  } else {
    const i18nKey = ROUTE_TITLE_MAP[pathname];
    if (i18nKey) {
      pageTitle = i18nKey.startsWith("_literal:")
        ? i18nKey.slice("_literal:".length)
        : t(i18nKey);
    }
  }

  const isEphemerisPage = pathname.startsWith("/dashboard/ephemeris");

  const isFullscreenPage =
    pathname === "/dashboard/generate" ||
    pathname === "/dashboard/mission-control" ||
    isEphemerisPage;

  const contentMargin = sidebarCollapsed ? 96 : 284; // sidebar width + 24px gap

  const isAstraPage = pathname === "/dashboard/astra";

  // Track forge mode so we can hide the global Astra button (Forge has its own)
  const [forgeActive, setForgeActive] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      setForgeActive((e as CustomEvent).detail.active);
    };
    window.addEventListener("forge-mode-change", handler);
    return () => window.removeEventListener("forge-mode-change", handler);
  }, []);

  return (
    <div className="caelex-v2 min-h-screen bg-[var(--bg-base)]">
      {/* Sidebar */}
      <Sidebar
        user={
          session?.user as {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            organization?: string;
          }
        }
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main content */}
      <style>{`
        @media (min-width: 1024px) {
          .sidebar-content-area {
            margin-left: ${contentMargin}px;
            ${layoutMounted ? "transition: margin-left 300ms ease-out;" : ""}
            will-change: margin-left;
          }
        }
      `}</style>
      <div className="sidebar-content-area flex flex-col min-h-screen">
        {!isEphemerisPage && !isFullscreenPage && (
          <TopBar title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
        )}
        <main
          id="main-content"
          className={`flex-1 ${isFullscreenPage ? "" : "p-6 lg:p-10"}`}
        >
          {isFullscreenPage ? (
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          ) : (
            <div className="max-w-[1360px] mx-auto">
              <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
            </div>
          )}
        </main>
      </div>

      {/* Floating Astra button — hidden when Forge is active (Forge has its own) */}
      {!isAstraPage && !forgeActive && (
        <Link
          href="/dashboard/astra"
          aria-label="Open Astra AI Assistant"
          className="fixed bottom-7 right-7 z-[100] flex items-center justify-center transition-all duration-200 ease-out hover:scale-[1.08] active:scale-95"
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(80px) saturate(1.6)",
            WebkitBackdropFilter: "blur(80px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 16px 32px rgba(0,0,0,0.3), inset 0 0 0 0.5px rgba(255,255,255,0.08)",
          }}
        >
          <svg width={22} height={22} viewBox="-14 -14 28 28" fill="none">
            <path
              d="M 0 -10 L 0 3"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 0 3 L 10 10"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 0 3 L -10 10"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="0" cy="3" r="2.5" fill="white" />
          </svg>
        </Link>
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <OrganizationProvider>
        <ToastProvider>
          <AstraProvider>
            <DashboardContent>{children}</DashboardContent>
          </AstraProvider>
        </ToastProvider>
      </OrganizationProvider>
    </LanguageProvider>
  );
}
