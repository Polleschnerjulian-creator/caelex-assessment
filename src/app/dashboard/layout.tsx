"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { OrganizationProvider } from "@/components/providers/OrganizationProvider";
import ErrorBoundary from "@/components/dashboard/ErrorBoundary";
import OnboardingOverlay from "@/components/dashboard/OnboardingOverlay";
import { AstraProvider } from "@/components/astra/AstraProvider";
import AstraChatPanel from "@/components/astra/AstraChatPanel";
import AstraFAB from "@/components/astra/AstraFAB";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useAnalyticsTracking();

  return (
    <LanguageProvider>
      <OrganizationProvider>
        <ToastProvider>
          <AstraProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-[#0E0E10]">
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
                  <TopBar onMenuClick={() => setSidebarOpen(true)} />
                  <main className="flex-1 p-6 lg:p-8">
                    <div className="max-w-[1400px] mx-auto">
                      <ErrorBoundary>{children}</ErrorBoundary>
                    </div>
                  </main>
                </div>
              </div>

              {/* ASTRA Chat Panel */}
              <AstraChatPanel />

              {/* ASTRA Floating Action Button */}
              <AstraFAB />

              {/* Onboarding overlay for new users */}
              <OnboardingOverlay />
            </div>
          </AstraProvider>
        </ToastProvider>
      </OrganizationProvider>
    </LanguageProvider>
  );
}
