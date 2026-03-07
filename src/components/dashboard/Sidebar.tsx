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
  BarChart3,
  Layers,
  FileSearch,
  Orbit,
  Sparkles,
  Users,
  ShieldAlert,
  Calendar,
  Satellite,
  Activity,
  Target,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getRequiredPlan,
  PRICING_TIERS,
  type PlanType,
} from "@/lib/stripe/pricing";
import UpgradePrompt from "@/components/dashboard/UpgradePrompt";

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
      aria-current={isActive ? "page" : undefined}
      className={`
        group flex items-center gap-2.5 h-9 px-3 mx-2 rounded-[var(--radius-sm)] text-[14px]
        transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
        ${
          isActive
            ? "bg-[linear-gradient(90deg,rgba(74,98,232,0.12)_0%,rgba(74,98,232,0.04)_100%)] text-[var(--text-primary)] font-medium shadow-[inset_2px_0_0_var(--accent-500)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-subtle)]"
        }
      `}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-[var(--duration-fast)] ${isActive ? "text-[var(--accent-400)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"}`}
        >
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="text-[11px] tracking-[0.04em] font-medium px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--accent-primary-soft)] text-[var(--accent-500)]">
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
      aria-current={!locked && isActive ? "page" : undefined}
      aria-label={
        locked ? `${label} (requires ${requiredPlan} plan)` : undefined
      }
      className={`
        group flex items-center gap-2.5 h-8 px-3 mx-2 rounded-[var(--radius-sm)] text-[13px]
        transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
        ${
          locked
            ? "text-[var(--text-disabled)] hover:text-[var(--text-tertiary)] hover:bg-[var(--fill-subtle)] cursor-default"
            : isActive
              ? "bg-[linear-gradient(90deg,rgba(74,98,232,0.12)_0%,rgba(74,98,232,0.04)_100%)] text-[var(--text-primary)] font-medium shadow-[inset_2px_0_0_var(--accent-500)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-subtle)]"
        }
      `}
    >
      <span
        aria-hidden="true"
        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-[var(--duration-fast)] ${
          locked
            ? "text-[var(--text-disabled)]"
            : isActive
              ? "text-[var(--accent-400)]"
              : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
        }`}
      >
        {icon}
      </span>
      <span className={`flex-1 ${locked ? "opacity-50" : ""}`}>{label}</span>
      {locked && (
        <span className="flex items-center gap-1" aria-hidden="true">
          {requiredPlan && (
            <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-disabled)]">
              {requiredPlan}
            </span>
          )}
          <Lock size={12} className="text-[var(--text-disabled)]" />
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
  groupId: string;
}

function ModuleGroup({
  title,
  count,
  isExpanded,
  onToggle,
  children,
  hasActiveItem,
  groupId,
}: ModuleGroupProps) {
  const panelId = `module-group-${groupId}`;

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className={`
          w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-[var(--radius-sm)] text-[12px] font-medium tracking-[0.03em]
          transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
          ${
            hasActiveItem
              ? "text-[var(--text-secondary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          }
          hover:bg-[var(--fill-subtle)]
        `}
      >
        <motion.span
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-3.5 h-3.5 flex-shrink-0"
          aria-hidden="true"
        >
          <ChevronDown size={14} strokeWidth={2} />
        </motion.span>
        <span className="flex-1 text-left">{title}</span>
        <span
          aria-label={`${count} modules`}
          className={`text-[10px] min-w-[18px] text-center px-1 py-0.5 rounded-[var(--radius-xs)] font-medium ${
            hasActiveItem
              ? "bg-[var(--accent-primary-soft)] text-[var(--accent-500)]"
              : "bg-[var(--fill-light)] text-[var(--text-tertiary)]"
          }`}
        >
          {count}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={panelId}
            role="group"
            aria-label={title}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-3 pt-1 space-y-0.5">{children}</div>
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
  "/dashboard/network": "network",
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
  const { hasModuleAccess, isLoading, organization } = useOrganization();
  const { t } = useLanguage();
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [upgradeModule, setUpgradeModule] = useState<string | undefined>();

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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 top-0 left-0 bottom-0
          w-[280px] lg:w-[240px] lg:h-screen
          bg-[var(--bg-surface-1)]
          flex flex-col z-50
          transition-transform duration-[var(--duration-medium)] ease-[var(--ease-smooth)]
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          shadow-[4px_0_16px_rgba(0,0,0,0.08)]
        `}
        style={{
          borderRight: "1px solid var(--separator)",
        }}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          aria-label="Close navigation menu"
          className="lg:hidden absolute top-4 right-4 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--fill-medium)] transition-colors duration-[var(--duration-fast)]"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="h-14 flex items-center px-5 border-b border-[var(--separator)]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={22} className="text-[var(--text-primary)]" />
            <span className="text-[11px] tracking-[0.04em] font-medium text-[var(--text-disabled)] group-hover:text-[var(--text-tertiary)] transition-colors duration-[var(--duration-fast)]">
              v0.1
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto py-5 custom-scrollbar"
        >
          {/* Overview Section */}
          <div className="mb-6">
            <p className="px-5 mb-2 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.04em]">
              {t("sidebar.overview")}
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.dashboard")}
              </NavItem>
              <NavItem
                href="/dashboard/tracker"
                icon={<ListChecks size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.complianceTracker")}
              </NavItem>
            </div>
          </div>

          {/* Compliance Modules Section */}
          <div className="mb-6">
            <p className="px-5 mb-2 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.04em]">
              {t("sidebar.complianceModules")}
            </p>

            {/* EU Regulations Group */}
            <ModuleGroup
              title={t("sidebar.euRegulations")}
              count={7}
              isExpanded={expandedGroups.eu}
              onToggle={() => toggleGroup("eu")}
              hasActiveItem={activeGroup === "eu"}
              groupId="eu"
            >
              <CompactModuleItem
                href="/dashboard/modules/authorization"
                icon={<FileCheck size={14} strokeWidth={1.5} />}
                label={t("modules.authorization")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/authorization")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/authorization",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/cybersecurity"
                icon={<Shield size={14} strokeWidth={1.5} />}
                label={t("modules.cybersecurity")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/cybersecurity")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/cybersecurity",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/nis2"
                icon={<ShieldCheck size={14} strokeWidth={1.5} />}
                label={t("modules.nis2")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/nis2")}
                requiredPlan={getRequiredPlanLabel("/dashboard/modules/nis2")}
              />
              <CompactModuleItem
                href="/dashboard/modules/debris"
                icon={<Trash2 size={14} strokeWidth={1.5} />}
                label={t("modules.debris")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/debris")}
                requiredPlan={getRequiredPlanLabel("/dashboard/modules/debris")}
              />
              <CompactModuleItem
                href="/dashboard/modules/environmental"
                icon={<Leaf size={14} strokeWidth={1.5} />}
                label={t("modules.environmental")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/environmental")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/environmental",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/insurance"
                icon={<Scale size={14} strokeWidth={1.5} />}
                label={t("modules.insurance")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/insurance")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/insurance",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/supervision"
                icon={<Eye size={14} strokeWidth={1.5} />}
                label={t("modules.supervision")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/supervision")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/supervision",
                )}
              />
            </ModuleGroup>

            {/* International Group */}
            <ModuleGroup
              title={t("sidebar.international")}
              count={2}
              isExpanded={expandedGroups.international}
              onToggle={() => toggleGroup("international")}
              hasActiveItem={activeGroup === "international"}
              groupId="international"
            >
              <CompactModuleItem
                href="/dashboard/modules/copuos"
                icon={<Globe size={14} strokeWidth={1.5} />}
                label={t("modules.copuos")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/copuos")}
                requiredPlan={getRequiredPlanLabel("/dashboard/modules/copuos")}
              />
              <CompactModuleItem
                href="/dashboard/modules/uk-space"
                icon={<Building2 size={14} strokeWidth={1.5} />}
                label={t("modules.ukSpace")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/uk-space")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/uk-space",
                )}
              />
            </ModuleGroup>

            {/* US Regulations Group */}
            <ModuleGroup
              title={t("sidebar.usRegulations")}
              count={3}
              isExpanded={expandedGroups.us}
              onToggle={() => toggleGroup("us")}
              hasActiveItem={activeGroup === "us"}
              groupId="us"
            >
              <CompactModuleItem
                href="/dashboard/modules/us-regulatory"
                icon={<Flag size={14} strokeWidth={1.5} />}
                label={t("modules.usRegulatory")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/us-regulatory")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/us-regulatory",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/export-control"
                icon={<AlertTriangle size={14} strokeWidth={1.5} />}
                label={t("modules.exportControl")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/export-control")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/export-control",
                )}
              />
              <CompactModuleItem
                href="/dashboard/modules/spectrum"
                icon={<Radio size={14} strokeWidth={1.5} />}
                label={t("modules.spectrum")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/spectrum")}
                requiredPlan={getRequiredPlanLabel(
                  "/dashboard/modules/spectrum",
                )}
              />
            </ModuleGroup>
          </div>

          {/* AI Agent Section */}
          <div className="mb-6">
            <p className="px-5 mb-2 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.04em]">
              {t("sidebar.aiAgent")}
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/astra"
                icon={<Zap size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Astra
              </NavItem>
              <NavItem
                href="/dashboard/sentinel"
                icon={<Satellite size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                Sentinel
              </NavItem>
              <NavItem
                href="/dashboard/ephemeris"
                icon={<Activity size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                Ephemeris
              </NavItem>
              <CompactModuleItem
                href="/dashboard/optimizer"
                icon={<Target className="w-4 h-4" />}
                label="Optimizer"
                onClick={handleNavClick}
              />
            </div>
          </div>

          {/* Resources Section */}
          <div className="mb-6">
            <p className="px-5 mb-2 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.04em]">
              {t("sidebar.resources")}
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/nca-portal"
                icon={<Building2 size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                {t("sidebar.ncaPortal")}
              </NavItem>
              <NavItem
                href="/dashboard/documents"
                icon={<FileText size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.documents")}
              </NavItem>
              <NavItem
                href="/dashboard/generate"
                icon={<Sparkles size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.documentGenerator")}
              </NavItem>
              <NavItem
                href="/dashboard/audit-center"
                icon={<ClipboardCheck size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.auditCenter")}
              </NavItem>
              <NavItem
                href="/dashboard/timeline"
                icon={<Clock size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.timeline")}
              </NavItem>
              <NavItem
                href="/dashboard/digital-twin"
                icon={<Layers size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.digitalTwin")}
              </NavItem>
              <NavItem
                href="/dashboard/incidents"
                icon={<AlertTriangle size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.incidents")}
              </NavItem>
              <NavItem
                href="/dashboard/regulatory-feed"
                icon={<Radio size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                {t("sidebar.regulatoryFeed")}
              </NavItem>
              <NavItem
                href="/dashboard/mission-control"
                icon={<Orbit size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.missionControl")}
              </NavItem>
              <NavItem
                href="/dashboard/evidence"
                icon={<FileCheck size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                Evidence
              </NavItem>
            </div>
          </div>

          {/* Assure Section */}
          <div className="mb-6">
            <p className="px-5 mb-2 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.04em]">
              Assure
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/assure"
                icon={<ShieldAlert size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                Regulatory Readiness
              </NavItem>
              <NavItem
                href="/dashboard/assure/rating"
                icon={<BarChart3 size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Credit Rating
              </NavItem>
            </div>
          </div>

          {/* Network Section */}
          <div className="mb-6">
            <p className="px-5 mb-2 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.04em]">
              {t("sidebar.network") || "Network"}
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/network"
                icon={<Users size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.complianceNetwork") || "Compliance Network"}
              </NavItem>
            </div>
          </div>

          {/* Admin — only for admin role users */}
          {user?.role === "admin" && (
            <div className="mb-6">
              <p className="px-5 mb-2 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.04em]">
                {t("sidebar.admin")}
              </p>
              <div className="space-y-0.5">
                <NavItem
                  href="/dashboard/admin"
                  icon={<Crown size={18} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                >
                  {t("sidebar.adminPanel")}
                </NavItem>
                <NavItem
                  href="/dashboard/admin/bookings"
                  icon={<Calendar size={18} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                >
                  {t("sidebar.bookings") || "Bookings"}
                </NavItem>
                <NavItem
                  href="/dashboard/admin/analytics"
                  icon={<BarChart3 size={18} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                >
                  {t("sidebar.analytics")}
                </NavItem>
                <NavItem
                  href="/dashboard/admin/audit"
                  icon={<FileSearch size={18} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                >
                  {t("sidebar.auditLogs")}
                </NavItem>
              </div>
            </div>
          )}
        </nav>

        {/* Footer — Settings & Logout */}
        <div className="px-3 py-2 border-t border-[var(--separator)] space-y-0.5">
          <NavItem
            href="/dashboard/settings"
            icon={<Settings size={18} strokeWidth={1.5} />}
            onClick={handleNavClick}
          >
            {t("sidebar.settings")}
          </NavItem>
          <button
            onClick={handleLogout}
            className="
              w-full flex items-center gap-2.5 h-9 px-3 mx-2 rounded-[var(--radius-sm)] text-[14px]
              text-[var(--text-secondary)] hover:text-[var(--status-danger)] hover:bg-[var(--accent-danger-soft)]
              transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
            "
          >
            <LogOut
              size={18}
              className="text-[var(--text-tertiary)]"
              aria-hidden="true"
            />
            <span>{t("sidebar.signOut")}</span>
          </button>
        </div>

        {/* User Info */}
        <div className="px-5 py-4 border-t border-[var(--separator)]">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-3)] flex items-center justify-center flex-shrink-0 ring-2 ring-[var(--fill-strong)]">
              {user?.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.image}
                  alt={user?.name ? `${user.name}'s avatar` : "User avatar"}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  {initials}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate leading-tight">
                {user?.name || t("common.user")}
              </p>
              <p className="text-[12px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                {user?.email || ""}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        isOpen={upgradePromptOpen}
        onClose={() => setUpgradePromptOpen(false)}
        moduleName={upgradeModule}
        currentPlan={(organization?.plan || "FREE") as PlanType}
      />
    </>
  );
}
