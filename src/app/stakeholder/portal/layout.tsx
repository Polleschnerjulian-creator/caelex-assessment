"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  FolderOpen,
  FileCheck,
  LogOut,
  ChevronLeft,
  Shield,
  Building2,
} from "lucide-react";
import StakeholderPortalLayout from "@/components/network/StakeholderPortalLayout";

interface StakeholderProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  orgName: string;
  orgLogo?: string;
  role: string;
  accessLevel: string;
}

interface StakeholderContextType {
  profile: StakeholderProfile | null;
  token: string | null;
  refreshProfile: () => Promise<void>;
}

const StakeholderContext = createContext<StakeholderContextType>({
  profile: null,
  token: null,
  refreshProfile: async () => {},
});

export function useStakeholder() {
  return useContext(StakeholderContext);
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<StakeholderProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch("/api/stakeholder/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          sessionStorage.removeItem("stakeholder_token");
          return null;
        }
        throw new Error("Failed to fetch profile");
      }

      const data = await res.json();
      return data as StakeholderProfile;
    } catch {
      throw new Error("Unable to load profile. Please try again.");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const data = await fetchProfile(token);
    if (data) setProfile(data);
  }, [token, fetchProfile]);

  useEffect(() => {
    const storedToken = sessionStorage.getItem("stakeholder_token");

    if (!storedToken) {
      router.replace("/stakeholder");
      return;
    }

    setToken(storedToken);

    fetchProfile(storedToken)
      .then((data) => {
        if (data) {
          setProfile(data);
        } else {
          router.replace("/stakeholder");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchProfile, router]);

  const handleLogout = () => {
    sessionStorage.removeItem("stakeholder_token");
    router.replace("/stakeholder");
  };

  const navItems = [
    {
      label: "Data Rooms",
      href: "/stakeholder/portal",
      icon: FolderOpen,
      active: pathname === "/stakeholder/portal",
    },
    {
      label: "Attestations",
      href: "/stakeholder/portal/attest/new",
      icon: FileCheck,
      active: pathname.startsWith("/stakeholder/portal/attest"),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1E] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-body text-slate-500 dark:text-white/70">
            Loading portal...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1E] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-title font-semibold text-slate-800 dark:text-white mb-2">
            Access Error
          </h2>
          <p className="text-body text-slate-500 dark:text-white/50 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.replace("/stakeholder")}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-subtitle rounded-lg px-6 py-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <StakeholderContext.Provider value={{ profile, token, refreshProfile }}>
      <StakeholderPortalLayout
        organizationName={profile?.orgName || ""}
        organizationLogo={profile?.orgLogo}
        stakeholderName={profile?.name || ""}
      >
        <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1E]">
          {/* Top Navigation */}
          <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0A0F1E]/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between h-14">
                {/* Left: Branding */}
                <div className="flex items-center gap-4">
                  <a
                    href="/stakeholder"
                    className="flex items-center gap-2 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
                  >
                    <Shield className="w-5 h-5 text-emerald-500" />
                    <span className="text-small font-medium text-slate-800 dark:text-white">
                      Caelex
                    </span>
                  </a>

                  {profile?.orgName && (
                    <>
                      <span className="text-slate-300 dark:text-white/20">
                        /
                      </span>
                      <div className="flex items-center gap-2">
                        {profile.orgLogo ? (
                          <Image
                            src={profile.orgLogo}
                            alt={profile.orgName}
                            width={20}
                            height={20}
                            className="rounded"
                            unoptimized
                          />
                        ) : (
                          <Building2 className="w-4 h-4 text-slate-400 dark:text-white/40" />
                        )}
                        <span className="text-small font-medium text-slate-600 dark:text-white/60">
                          {profile.orgName}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Center: Navigation */}
                <nav className="hidden sm:flex items-center gap-1">
                  {navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-small font-medium transition-colors ${
                        item.active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/80 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  ))}
                </nav>

                {/* Right: Profile & Logout */}
                <div className="flex items-center gap-3">
                  {profile && (
                    <div className="hidden sm:block text-right">
                      <p className="text-small font-medium text-slate-700 dark:text-white/80">
                        {profile.name}
                      </p>
                      <p className="text-caption text-slate-400 dark:text-white/40">
                        {profile.company}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-small text-slate-500 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Mobile Navigation */}
              <div className="sm:hidden flex items-center gap-1 pb-2 -mx-1 overflow-x-auto">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-small font-medium whitespace-nowrap transition-colors ${
                      item.active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "text-slate-500 dark:text-white/50"
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </main>
        </div>
      </StakeholderPortalLayout>
    </StakeholderContext.Provider>
  );
}
