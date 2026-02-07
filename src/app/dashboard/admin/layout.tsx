"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 dark:text-white/60">
          <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-[13px]">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={24} className="text-red-500" />
          </div>
          <h2 className="text-[16px] font-medium text-slate-900 dark:text-white mb-1">
            Access Denied
          </h2>
          <p className="text-[13px] text-slate-600 dark:text-white/60">
            You do not have permission to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
