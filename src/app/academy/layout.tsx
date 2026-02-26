"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AcademySidebar from "@/components/academy/AcademySidebar";
import TopBar from "@/components/dashboard/TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { OrganizationProvider } from "@/components/providers/OrganizationProvider";
import ErrorBoundary from "@/components/dashboard/ErrorBoundary";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

// ─── Route Title Map ───

const ROUTE_TITLE_MAP: Record<string, string> = {
  "/academy/dashboard": "Academy",
  "/academy/courses": "Course Catalog",
  "/academy/simulations": "Simulation Lab",
  "/academy/sandbox": "Compliance Sandbox",
  "/academy/progress": "My Progress",
  "/academy/classroom": "Classroom",
  "/academy/instructor": "Instructor Panel",
};

// ─── Layout Content ───

function AcademyLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Derive page title from route
  let pageTitle: string | undefined;

  // Check exact match first
  if (ROUTE_TITLE_MAP[pathname]) {
    pageTitle = ROUTE_TITLE_MAP[pathname];
  } else {
    // Find the closest parent route
    const matchedKey = Object.keys(ROUTE_TITLE_MAP)
      .filter((key) => pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0];
    if (matchedKey) {
      pageTitle = ROUTE_TITLE_MAP[matchedKey];
    }
  }

  // Skip layout for landing page (public)
  const isUnlayouted = pathname === "/academy";

  if (isUnlayouted) {
    return <div className="dark">{children}</div>;
  }

  return (
    <div className="dark min-h-screen bg-navy-950">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <AcademySidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <div className="flex flex-col min-h-screen">
          <TopBar title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
          <main id="main-content" className="flex-1 p-6 lg:p-10">
            <div className="max-w-[1400px] mx-auto">
              <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Layout Export ───

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <OrganizationProvider>
        <ToastProvider>
          <AcademyLayoutContent>{children}</AcademyLayoutContent>
        </ToastProvider>
      </OrganizationProvider>
    </LanguageProvider>
  );
}
