"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { ToastProvider } from "@/components/ui/Toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0B]">
        <div className="lg:grid lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <Sidebar
            user={
              session?.user as {
                name?: string | null;
                email?: string | null;
                image?: string | null;
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
              <div className="max-w-[1400px] mx-auto">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
