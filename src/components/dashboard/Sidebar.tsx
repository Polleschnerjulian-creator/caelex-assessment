"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ListChecks,
  FileText,
  Clock,
  Settings,
  LogOut,
  X,
  FileCheck,
  Shield,
  ShieldCheck,
  Trash2,
  Leaf,
  Scale,
  Eye,
  ChevronRight,
  ChevronDown,
  Lock,
  Crown,
  ClipboardCheck,
  Zap,
  Globe,
  Building2,
  Radio,
  AlertTriangle,
  Flag,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useAstra } from "@/components/astra/AstraProvider";
import { getRequiredPlan, PRICING_TIERS } from "@/lib/stripe/pricing";

interface NavItemProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  badge?: string;
}

function NavItem({ href, icon, children, onClick, badge }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px]
        transition-all duration-150
        ${
          isActive
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
            : "text-slate-800 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
        }
      `}
    >
      {icon && (
        <span
          className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-white/60 group-hover:text-slate-700 dark:group-hover:text-white/60"}`}
        >
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/70">
          {badge}
        </span>
      )}
    </Link>
  );
}

// Compact module item for use inside collapsible groups
interface CompactModuleItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  locked?: boolean;
  requiredPlan?: string;
}

function CompactModuleItem({
  href,
  icon,
  label,
  onClick,
  locked,
  requiredPlan,
}: CompactModuleItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  const targetHref = locked ? "/dashboard/settings/billing" : href;

  return (
    <Link
      href={targetHref}
      onClick={onClick}
      className={`
        group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px]
        transition-all duration-150
        ${
          locked
            ? "text-slate-400 dark:text-white/25 hover:text-slate-500 dark:hover:text-white/35 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-default"
            : isActive
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
              : "text-slate-700 dark:text-white/50 hover:text-slate-900 dark:hover:text-white/80 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
        }
      `}
    >
      <span
        className={`w-3.5 h-3.5 flex-shrink-0 ${
          locked
            ? "text-slate-300 dark:text-white/20"
            : isActive
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-slate-500 dark:text-white/40 group-hover:text-slate-600 dark:group-hover:text-white/50"
        }`}
      >
        {icon}
      </span>
      <span className={`flex-1 ${locked ? "opacity-60" : ""}`}>{label}</span>
      {locked && (
        <span className="flex items-center gap-1">
          {requiredPlan && (
            <span className="text-[8px] font-medium uppercase tracking-wider text-slate-400 dark:text-white/20">
              {requiredPlan}
            </span>
          )}
          <Lock size={10} className="text-slate-300 dark:text-white/20" />
        </span>
      )}
    </Link>
  );
}

// Collapsible module group
interface ModuleGroupProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasActiveItem?: boolean;
}

function ModuleGroup({
  title,
  count,
  isExpanded,
  onToggle,
  children,
  hasActiveItem,
}: ModuleGroupProps) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium uppercase tracking-wider
          transition-all duration-150
          ${
            hasActiveItem
              ? "text-emerald-700 dark:text-emerald-400/90"
              : "text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70"
          }
          hover:bg-slate-50 dark:hover:bg-white/[0.02]
        `}
      >
        <motion.span
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-3.5 h-3.5 flex-shrink-0"
        >
          <ChevronDown size={14} strokeWidth={2} />
        </motion.span>
        <span className="flex-1 text-left">{title}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            hasActiveItem
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/40"
          }`}
        >
          {count}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pl-2 pt-1 space-y-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Map sidebar module paths to pricing module names
const MODULE_MAP: Record<string, string> = {
  "/dashboard/modules/authorization": "authorization",
  "/dashboard/modules/cybersecurity": "cybersecurity",
  "/dashboard/modules/nis2": "nis2",
  "/dashboard/modules/debris": "debris",
  "/dashboard/modules/environmental": "environmental",
  "/dashboard/modules/insurance": "insurance",
  "/dashboard/modules/supervision": "supervision",
  "/dashboard/modules/copuos": "copuos",
  "/dashboard/modules/uk-space": "uk-space",
  "/dashboard/modules/us-regulatory": "us-regulatory",
  "/dashboard/modules/export-control": "export-control",
  "/dashboard/modules/spectrum": "spectrum",
  "/dashboard/documents": "documents",
  "/dashboard/timeline": "timeline",
  "/dashboard/audit-center": "audit-center",
};

// Module groups configuration
const EU_MODULES = [
  "/dashboard/modules/authorization",
  "/dashboard/modules/cybersecurity",
  "/dashboard/modules/nis2",
  "/dashboard/modules/debris",
  "/dashboard/modules/environmental",
  "/dashboard/modules/insurance",
  "/dashboard/modules/supervision",
];

const INTERNATIONAL_MODULES = [
  "/dashboard/modules/copuos",
  "/dashboard/modules/uk-space",
];

const US_MODULES = [
  "/dashboard/modules/us-regulatory",
  "/dashboard/modules/export-control",
  "/dashboard/modules/spectrum",
];

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  } & { organization?: string };
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasModuleAccess, isLoading } = useOrganization();
  const { openGeneral } = useAstra();

  // Determine which group has the active route
  const getActiveGroup = (): string | null => {
    if (EU_MODULES.some((m) => pathname.startsWith(m))) return "eu";
    if (INTERNATIONAL_MODULES.some((m) => pathname.startsWith(m)))
      return "international";
    if (US_MODULES.some((m) => pathname.startsWith(m))) return "us";
    return null;
  };

  const activeGroup = getActiveGroup();

  // Track expanded state for each group
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      eu: activeGroup === "eu",
      international: activeGroup === "international",
      us: activeGroup === "us",
    },
  );

  // Update expanded state when route changes
  useEffect(() => {
    const newActiveGroup = getActiveGroup();
    if (newActiveGroup) {
      setExpandedGroups((prev) => ({
        ...prev,
        [newActiveGroup]: true,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  const isModuleLocked = (path: string): boolean => {
    if (isLoading) return false;
    const moduleName = MODULE_MAP[path];
    if (!moduleName) return false;
    return !hasModuleAccess(moduleName);
  };

  const getRequiredPlanLabel = (path: string): string | undefined => {
    const moduleName = MODULE_MAP[path];
    if (!moduleName) return undefined;
    const requiredPlan = getRequiredPlan(moduleName);
    return PRICING_TIERS[requiredPlan].name;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 top-0 left-0 bottom-0
          w-[280px] lg:w-[260px] lg:h-screen
          bg-white dark:bg-[#0A0A0B] border-r border-slate-200 dark:border-white/10
          flex flex-col z-50
          transition-transform duration-300 lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={22} className="text-slate-900 dark:text-white" />
            <span className="text-[10px] font-mono text-slate-500 dark:text-white/60 uppercase tracking-wider">
              Beta
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          {/* Overview Section */}
          <div className="mb-5">
            <p className="px-3 mb-2 text-[11px] font-medium text-slate-500 dark:text-white/50 uppercase tracking-wider">
              Overview
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Dashboard
              </NavItem>
              <NavItem
                href="/dashboard/tracker"
                icon={<ListChecks size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Compliance Tracker
              </NavItem>
            </div>
          </div>

          {/* Compliance Modules Section */}
          <div className="mb-5">
            <p className="px-3 mb-2 text-[11px] font-medium text-slate-500 dark:text-white/50 uppercase tracking-wider">
              Compliance Modules
            </p>

            {/* EU Regulations Group */}
            <ModuleGroup
              title="EU Regulations"
              count={7}
              isExpanded={expandedGroups.eu}
              onToggle={() => toggleGroup("eu")}
              hasActiveItem={activeGroup === "eu"}
            >
              <CompactModuleItem
                href="/dashboard/modules/authorization"
                icon={<FileCheck size={14} strokeWidth={1.5} />}
                label="Authorization"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/authorization")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/authorization",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/cybersecurity"
                icon={<Shield size={14} strokeWidth={1.5} />}
                label="Cybersecurity"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/cybersecurity")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/cybersecurity",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/nis2"
                icon={<ShieldCheck size={14} strokeWidth={1.5} />}
                label="NIS2 Directive"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/nis2")}
                requiredPlan={getRequiredPlanLabel("/dashboard/modules/nis2")}
              />
              <CompactModuleItem
                href="/dashboard/modules/debris"
                icon={<Trash2 size={14} strokeWidth={1.5} />}
                label="Debris Mitigation"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/debris")}
                requiredPlan={getRequiredPlanLabel("/dashboard/modules/debris")}
              />
              <CompactModuleItem
                href="/dashboard/modules/environmental"
                icon={<Leaf size={14} strokeWidth={1.5} />}
                label="Environmental"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/environmental")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/environmental",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/insurance"
                icon={<Scale size={14} strokeWidth={1.5} />}
                label="Insurance"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/insurance")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/insurance",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/supervision"
                icon={<Eye size={14} strokeWidth={1.5} />}
                label="Supervision"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/supervision")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/supervision",
                )}
              />
            </ModuleGroup>

            {/* International Group */}
            <ModuleGroup
              title="International"
              count={2}
              isExpanded={expandedGroups.international}
              onToggle={() => toggleGroup("international")}
              hasActiveItem={activeGroup === "international"}
            >
              <CompactModuleItem
                href="/dashboard/modules/copuos"
                icon={<Globe size={14} strokeWidth={1.5} />}
                label="COPUOS/IADC"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/copuos")}
                requiredPlan={getRequiredPlanLabel("/dashboard/modules/copuos")}
              />
              <CompactModuleItem
                href="/dashboard/modules/uk-space"
                icon={<Building2 size={14} strokeWidth={1.5} />}
                label="UK Space Act"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/uk-space")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/uk-space",
                )}
              />
            </ModuleGroup>

            {/* US Regulations Group */}
            <ModuleGroup
              title="US Regulations"
              count={3}
              isExpanded={expandedGroups.us}
              onToggle={() => toggleGroup("us")}
              hasActiveItem={activeGroup === "us"}
            >
              <CompactModuleItem
                href="/dashboard/modules/us-regulatory"
                icon={<Flag size={14} strokeWidth={1.5} />}
                label="US Regulatory"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/us-regulatory")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/us-regulatory",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/export-control"
                icon={<AlertTriangle size={14} strokeWidth={1.5} />}
                label="Export Control"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/export-control")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/export-control",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/spectrum"
                icon={<Radio size={14} strokeWidth={1.5} />}
                label="Spectrum & ITU"
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/spectrum")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/spectrum",
                )}
              />
            </ModuleGroup>
          </div>

          {/* AI Agent Section */}
          <div className="mb-5">
            <p className="px-3 mb-2 text-[11px] font-medium text-slate-500 dark:text-white/50 uppercase tracking-wider">
              AI Agent
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  openGeneral();
                  handleNavClick();
                }}
                className="group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] w-full text-left
                  text-slate-800 dark:text-cyan-400/80 hover:text-slate-900 dark:hover:text-cyan-300
                  hover:bg-slate-100 dark:hover:bg-cyan-500/[0.06] transition-all duration-150"
              >
                <span className="w-4 h-4 flex-shrink-0 text-cyan-500 dark:text-cyan-400">
                  <Zap size={16} strokeWidth={1.5} />
                </span>
                <span className="flex-1">ASTRA</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-medium uppercase tracking-wider">
                  Beta
                </span>
              </button>
            </div>
          </div>

          {/* Resources Section */}
          <div>
            <p className="px-3 mb-2 text-[11px] font-medium text-slate-500 dark:text-white/50 uppercase tracking-wider">
              Resources
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/documents"
                icon={<FileText size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Documents
              </NavItem>
              <NavItem
                href="/dashboard/audit-center"
                icon={<ClipboardCheck size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Audit Center
              </NavItem>
              <NavItem
                href="/dashboard/timeline"
                icon={<Clock size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Timeline
              </NavItem>
            </div>
          </div>

          {/* Admin — only for cs@ahrensandco.de */}
          {user?.email === "cs@ahrensandco.de" && (
            <div className="mt-5">
              <div className="space-y-0.5">
                <NavItem
                  href="/dashboard/admin"
                  icon={<Crown size={16} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                >
                  Admin Panel
                </NavItem>
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-1">
          <NavItem
            href="/dashboard/settings"
            icon={<Settings size={16} strokeWidth={1.5} />}
            onClick={handleNavClick}
          >
            Settings
          </NavItem>

          <button
            onClick={handleLogout}
            className="
              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px]
              text-slate-700 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10
              transition-all duration-150
            "
          >
            <LogOut size={16} className="text-slate-500 dark:text-white/60" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-white/10">
              {user?.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.image}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <span className="text-[12px] font-medium text-slate-600 dark:text-white/60">
                  {initials}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-white/70 truncate">
                {user?.email || ""}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
