"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { OrganizationProvider } from "@/components/providers/OrganizationProvider";
import ErrorBoundary from "@/components/dashboard/ErrorBoundary";
import { AstraProvider } from "@/components/astra/AstraProvider";
import AstraWidget from "@/components/astra/AstraWidget";
import { GenerationProgressRing } from "@/components/generate2/GenerationProgressRing";
import GlassSpecular from "@/components/dashboard/GlassSpecular";
import DemoTour from "@/components/demo/DemoTour";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import {
  LanguageProvider,
  useLanguage,
} from "@/components/providers/LanguageProvider";

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
  "/dashboard/ontology": "_literal:Regulatory Ontology",
  "/dashboard/sentinel": "_literal:Sentinel",
  "/dashboard/ephemeris": "_literal:Ephemeris",
  "/dashboard/optimizer": "_literal:Regulatory Arbitrage Optimizer",
  "/dashboard/hub": "_literal:HUB",
  "/dashboard/hub/projects": "_literal:Projects",
  "/dashboard/hub/tasks": "_literal:Tasks",
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

  const isSettingsPage = pathname.startsWith("/dashboard/settings");

  const isFullscreenPage =
    pathname === "/dashboard" ||
    pathname === "/dashboard/generate" ||
    pathname === "/dashboard/documents" ||
    pathname === "/dashboard/tracker" ||
    pathname === "/dashboard/mission-control" ||
    pathname === "/dashboard/audit-center" ||
    pathname === "/dashboard/nca-portal" ||
    pathname === "/dashboard/timeline" ||
    pathname === "/dashboard/incidents" ||
    pathname === "/dashboard/regulatory-feed" ||
    pathname === "/dashboard/evidence" ||
    pathname === "/dashboard/network" ||
    pathname === "/dashboard/ontology" ||
    pathname === "/dashboard/shield" ||
    pathname?.startsWith("/dashboard/shield/") ||
    isSettingsPage ||
    isEphemerisPage;

  const contentMargin = sidebarCollapsed ? 96 : 284; // sidebar width + 24px gap

  const isAstraPage = pathname === "/dashboard/astra";

  // Track forge mode so we can hide the global Astra button (Forge has its own)
  const [forgeActive, setForgeActive] = useState(false);
  const [astraWidgetOpen, setAstraWidgetOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      setForgeActive((e as CustomEvent).detail.active);
    };
    window.addEventListener("forge-mode-change", handler);
    return () => window.removeEventListener("forge-mode-change", handler);
  }, []);

  // Listen for Cmd+K toggle from AstraWidget
  useEffect(() => {
    const handler = () => setAstraWidgetOpen((prev) => !prev);
    window.addEventListener("astra-toggle", handler);
    return () => window.removeEventListener("astra-toggle", handler);
  }, []);

  return (
    <div data-shell="caelex" className="caelex-v2 dashboard-wallpaper">
      <GlassSpecular />
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
            margin-right: ${astraWidgetOpen ? 480 : 0}px;
            ${layoutMounted ? "transition: margin-left 300ms ease-out, margin-right 280ms cubic-bezier(0.16, 1, 0.3, 1);" : ""}
            will-change: margin-left, margin-right;
          }
        }
      `}</style>
      <div
        data-content="caelex"
        className="sidebar-content-area flex flex-col min-h-screen lg:my-3 lg:mr-3 lg:rounded-[var(--glass-radius-xl)] lg:overflow-hidden glass-subtle"
      >
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

      {/* Floating Astra FAB — hidden when Forge is active or widget is open */}
      {!isAstraPage && !forgeActive && !astraWidgetOpen && (
        <div className="fixed bottom-7 right-7 z-[100] transition-all duration-200 ease-out hover:scale-[1.08] active:scale-95">
          <GenerationProgressRing size={68}>
            <button
              onClick={() => setAstraWidgetOpen(true)}
              aria-label="Open Astra AI Assistant"
              className="flex items-center justify-center"
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(24px) saturate(1.4)",
                WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow:
                  "0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-black.png"
                alt=""
                width={30}
                height={30}
                style={{ objectFit: "contain" }}
              />
            </button>
          </GenerationProgressRing>
        </div>
      )}

      {/* Astra Chat Widget */}
      {!forgeActive && (
        <AstraWidget
          isOpen={astraWidgetOpen}
          onClose={() => setAstraWidgetOpen(false)}
          sidebarMargin={contentMargin}
        />
      )}

      {/* Demo Tour Overlay */}
      <DemoTour />
    </div>
  );
}

export default function DashboardShell({
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
