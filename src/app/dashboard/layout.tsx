"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { OrganizationProvider } from "@/components/providers/OrganizationProvider";
import ErrorBoundary from "@/components/dashboard/ErrorBoundary";
import OnboardingOverlay from "@/components/dashboard/OnboardingOverlay";
import { AstraProvider } from "@/components/astra/AstraProvider";
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
  "/dashboard/settings": "sidebar.settings",
  "/dashboard/admin": "sidebar.adminPanel",
};

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  useAnalyticsTracking();

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

  const isFullscreenPage =
    pathname === "/dashboard/generate" ||
    pathname === "/dashboard/mission-control";

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
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
        />

        {/* Main content */}
        <div className="flex flex-col min-h-screen">
          <TopBar title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
          <main
            id="main-content"
            className={`flex-1 ${isFullscreenPage ? "" : "p-6 lg:p-10"}`}
          >
            {isFullscreenPage ? (
              <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
            ) : (
              <div className="max-w-[1400px] mx-auto">
                <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Onboarding overlay for new users */}
      <OnboardingOverlay />
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
