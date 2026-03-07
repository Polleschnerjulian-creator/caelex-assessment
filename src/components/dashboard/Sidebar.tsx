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
  ChevronLeft,
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
import { CaelexIcon } from "@/components/ui/Logo";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getRequiredPlan,
  PRICING_TIERS,
  type PlanType,
} from "@/lib/stripe/pricing";
import UpgradePrompt from "@/components/dashboard/UpgradePrompt";

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 72;
const SIDEBAR_KEY = "caelex-sidebar-collapsed";

// ─── Tooltip (collapsed mode) ───────────────────────────────────────────────

function Tooltip({ label, badge }: { label: React.ReactNode; badge?: string }) {
  return (
    <span
      className="
        absolute left-full ml-2 top-1/2 -translate-y-1/2
        px-2.5 py-1.5 rounded-lg
        text-[12px] font-medium whitespace-nowrap
        pointer-events-none z-50
        opacity-0 group-hover:opacity-100
        transition-opacity duration-100 delay-300
      "
      style={{
        background: "var(--sidebar-tooltip-bg)",
        color: "var(--sidebar-tooltip-color)",
        boxShadow: "var(--sidebar-tooltip-shadow)",
      }}
    >
      {label}
      {badge && <span className="ml-1.5 text-[9px] opacity-70">{badge}</span>}
    </span>
  );
}

// ─── NavItem ────────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  badge?: string;
  collapsed?: boolean;
}

function NavItem({
  href,
  icon,
  children,
  onClick,
  badge,
  collapsed,
}: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  if (collapsed) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        className="group relative flex items-center justify-center w-11 h-11 mx-auto rounded-[10px] transition-colors duration-[120ms]"
        style={{
          background: isActive ? "var(--sidebar-nav-active-bg)" : undefined,
        }}
      >
        <span
          className={`w-5 h-5 flex-shrink-0 transition-colors duration-[120ms] ${
            isActive
              ? "text-[var(--sidebar-nav-active-icon)]"
              : "text-[var(--sidebar-nav-icon-color)] group-hover:text-[var(--sidebar-nav-hover-color)]"
          }`}
        >
          {icon}
        </span>
        <Tooltip label={children} badge={badge} />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`
        group flex items-center gap-2.5 h-9 px-3 rounded-[10px] text-[13.5px]
        transition-all duration-[120ms] ease-out
        ${
          isActive
            ? "bg-[var(--sidebar-nav-active-bg)] text-[var(--sidebar-nav-active-color)] font-medium"
            : "text-[var(--sidebar-nav-color)] hover:bg-[var(--sidebar-nav-hover-bg)] hover:text-[var(--sidebar-nav-hover-color)]"
        }
      `}
    >
      {icon && (
        <span
          className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-[120ms] ${
            isActive
              ? "text-[var(--sidebar-nav-active-icon)]"
              : "text-[var(--sidebar-nav-icon-color)] group-hover:text-[var(--sidebar-nav-hover-color)]"
          }`}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {badge && (
        <span
          className="text-[9.5px] font-semibold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded"
          style={{
            background: "var(--sidebar-badge-bg)",
            color: "var(--sidebar-badge-color)",
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── CompactModuleItem ──────────────────────────────────────────────────────

interface CompactModuleItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  locked?: boolean;
  requiredPlan?: string;
  collapsed?: boolean;
}

function CompactModuleItem({
  href,
  icon,
  label,
  onClick,
  locked,
  requiredPlan,
  collapsed,
}: CompactModuleItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  const targetHref = locked ? "/dashboard/settings/billing" : href;

  if (collapsed) {
    return (
      <Link
        href={targetHref}
        onClick={onClick}
        aria-current={!locked && isActive ? "page" : undefined}
        className={`group relative flex items-center justify-center w-11 h-11 mx-auto rounded-[10px] transition-colors duration-[120ms] ${locked ? "opacity-40" : ""}`}
        style={{
          background:
            !locked && isActive ? "var(--sidebar-nav-active-bg)" : undefined,
        }}
      >
        <span
          className={`w-5 h-5 flex-shrink-0 ${
            locked
              ? "text-[var(--text-disabled)]"
              : isActive
                ? "text-[var(--sidebar-nav-active-icon)]"
                : "text-[var(--sidebar-nav-icon-color)] group-hover:text-[var(--sidebar-nav-hover-color)]"
          }`}
        >
          {icon}
        </span>
        <Tooltip label={label} />
      </Link>
    );
  }

  return (
    <Link
      href={targetHref}
      onClick={onClick}
      aria-current={!locked && isActive ? "page" : undefined}
      aria-label={
        locked ? `${label} (requires ${requiredPlan} plan)` : undefined
      }
      className={`
        group flex items-center gap-2.5 h-8 pl-8 pr-3 rounded-[10px] text-[13px]
        transition-all duration-[120ms] ease-out
        ${
          locked
            ? "text-[var(--text-disabled)] hover:text-[var(--text-tertiary)] hover:bg-[var(--sidebar-nav-hover-bg)] cursor-default"
            : isActive
              ? "bg-[var(--sidebar-nav-active-bg)] text-[var(--sidebar-nav-active-color)] font-medium"
              : "text-[var(--sidebar-nav-color)] hover:bg-[var(--sidebar-nav-hover-bg)] hover:text-[var(--sidebar-nav-hover-color)]"
        }
      `}
    >
      <span
        className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-[120ms] ${
          locked
            ? "text-[var(--text-disabled)]"
            : isActive
              ? "text-[var(--sidebar-nav-active-icon)]"
              : "text-[var(--sidebar-nav-icon-color)]"
        }`}
      >
        {icon}
      </span>
      <span className={`flex-1 truncate ${locked ? "opacity-50" : ""}`}>
        {label}
      </span>
      {locked && (
        <span className="flex items-center gap-1">
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

// ─── ModuleGroup ────────────────────────────────────────────────────────────

interface ModuleGroupProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasActiveItem?: boolean;
  groupId: string;
  collapsed?: boolean;
}

function ModuleGroup({
  title,
  count,
  isExpanded,
  onToggle,
  children,
  hasActiveItem,
  groupId,
  collapsed,
}: ModuleGroupProps) {
  const panelId = `module-group-${groupId}`;

  // In collapsed mode, render children directly (icon-only)
  if (collapsed) {
    return <>{children}</>;
  }

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className={`
          w-full flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[12px] font-medium tracking-[0.03em]
          transition-all duration-[120ms] ease-out
          hover:bg-[var(--sidebar-nav-hover-bg)]
          ${hasActiveItem ? "text-[var(--sidebar-nav-color)]" : "text-[var(--sidebar-section-color)]"}
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
          className="text-[10px] min-w-[18px] text-center px-1 py-0.5 rounded-[8px] font-medium"
          style={{
            background: hasActiveItem
              ? "var(--sidebar-badge-bg)"
              : "var(--sidebar-count-bg)",
            color: hasActiveItem
              ? "var(--sidebar-badge-color)"
              : "var(--sidebar-count-color)",
          }}
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
            <div className="pt-1 space-y-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({
  children,
  collapsed,
}: {
  children: React.ReactNode;
  collapsed?: boolean;
}) {
  if (collapsed) return null;
  return (
    <p
      className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em]"
      style={{ color: "var(--sidebar-section-color)" }}
    >
      {children}
    </p>
  );
}

// ─── Module & group data ────────────────────────────────────────────────────

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

// ─── Sidebar ────────────────────────────────────────────────────────────────

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  } & { organization?: string };
  isOpen?: boolean;
  onClose?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function Sidebar({
  user,
  isOpen,
  onClose,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const { hasModuleAccess, isLoading, organization } = useOrganization();
  const { t } = useLanguage();
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [upgradeModule, setUpgradeModule] = useState<string | undefined>();

  // Collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Desktop detection — collapse only on lg+
  const [isLg, setIsLg] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsLg(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Load collapse state
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored === "true") {
      setIsCollapsed(true);
      onCollapsedChange?.(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      onCollapsedChange?.(next);
      return next;
    });
  };

  // Only collapsed on desktop
  const collapsed = isCollapsed && isLg;
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  // Active group detection
  const getActiveGroup = (): string | null => {
    if (EU_MODULES.some((m) => pathname.startsWith(m))) return "eu";
    if (INTERNATIONAL_MODULES.some((m) => pathname.startsWith(m)))
      return "international";
    if (US_MODULES.some((m) => pathname.startsWith(m))) return "us";
    return null;
  };

  const activeGroup = getActiveGroup();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      eu: activeGroup === "eu",
      international: activeGroup === "international",
      us: activeGroup === "us",
    },
  );

  useEffect(() => {
    const g = getActiveGroup();
    if (g) setExpandedGroups((prev) => ({ ...prev, [g]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
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

  // Transition config
  const widthTransition = mounted
    ? `width ${isCollapsed ? "250ms cubic-bezier(0.25,0.46,0.45,0.94)" : "300ms cubic-bezier(0.34,1.56,0.64,1)"}`
    : "none";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ═══ Glass Panel ═══ */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed z-40 flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-[calc(100%+24px)]"}
          lg:translate-x-0
        `}
        style={{
          width: sidebarWidth,
          height: "calc(100vh - 24px)",
          left: 12,
          top: 12,
          background: "var(--sidebar-glass-bg)",
          backdropFilter: "blur(40px) saturate(1.8)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8)",
          border: "1px solid var(--sidebar-glass-border)",
          borderRadius: 22,
          boxShadow: "var(--sidebar-glass-shadow)",
          overflow: "hidden",
          transition: widthTransition,
          willChange: "width",
        }}
      >
        {/* Mobile close */}
        <button
          onClick={onClose}
          aria-label="Close navigation menu"
          className="lg:hidden absolute top-4 right-4 p-2 rounded-[10px] z-10 text-[var(--sidebar-nav-icon-color)] hover:text-[var(--sidebar-nav-hover-color)] transition-colors duration-[120ms]"
        >
          <X size={20} />
        </button>

        {/* Collapse toggle — desktop only, visible on hover */}
        <button
          onClick={toggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex items-center justify-center absolute z-[41] cursor-pointer"
          style={{
            right: -14,
            top: "50%",
            transform: "translateY(-50%)",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--sidebar-toggle-bg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--sidebar-toggle-border)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            opacity: isHovered ? 1 : 0,
            transition:
              "opacity 200ms ease-out, background 150ms, box-shadow 150ms",
          }}
        >
          {collapsed ? (
            <ChevronRight
              size={14}
              className="text-[var(--sidebar-nav-icon-color)]"
            />
          ) : (
            <ChevronLeft
              size={14}
              className="text-[var(--sidebar-nav-icon-color)]"
            />
          )}
        </button>

        {/* ─── Logo ─── */}
        <div
          className="flex items-center flex-shrink-0"
          style={{
            padding: collapsed ? "20px 0 16px" : "20px 14px 16px",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <Link href="/" className="flex items-center gap-2">
            <CaelexIcon
              size={collapsed ? 24 : 28}
              className="text-[var(--text-primary)] flex-shrink-0"
            />
            {!collapsed && (
              <>
                <span
                  className="text-[16px] font-semibold text-[var(--text-primary)]"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  caelex
                </span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    color: "var(--sidebar-section-color)",
                    background: "var(--sidebar-count-bg)",
                  }}
                >
                  v0.1
                </span>
              </>
            )}
          </Link>
        </div>

        {/* ─── Navigation ─── */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
          style={{ padding: collapsed ? "0 4px" : "0 14px" }}
        >
          {/* Overview */}
          <div style={{ marginBottom: collapsed ? 8 : 20 }}>
            <SectionHeader collapsed={collapsed}>
              {t("sidebar.overview")}
            </SectionHeader>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.dashboard")}
              </NavItem>
              <NavItem
                href="/dashboard/tracker"
                icon={<ListChecks size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.complianceTracker")}
              </NavItem>
            </div>
          </div>

          {/* Compliance Modules */}
          <div style={{ marginBottom: collapsed ? 8 : 20 }}>
            <SectionHeader collapsed={collapsed}>
              {t("sidebar.complianceModules")}
            </SectionHeader>

            <ModuleGroup
              title={t("sidebar.euRegulations")}
              count={7}
              isExpanded={expandedGroups.eu}
              onToggle={() => toggleGroup("eu")}
              hasActiveItem={activeGroup === "eu"}
              groupId="eu"
              collapsed={collapsed}
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
                collapsed={collapsed}
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
                collapsed={collapsed}
              />
              <CompactModuleItem
                href="/dashboard/modules/nis2"
                icon={<ShieldCheck size={14} strokeWidth={1.5} />}
                label={t("modules.nis2")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/nis2")}
                requiredPlan={getRequiredPlanLabel("/dashboard/modules/nis2")}
                collapsed={collapsed}
              />
              <CompactModuleItem
                href="/dashboard/modules/debris"
                icon={<Trash2 size={14} strokeWidth={1.5} />}
                label={t("modules.debris")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/debris")}
                requiredPlan={getRequiredPlanLabel("/dashboard/modules/debris")}
                collapsed={collapsed}
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
                collapsed={collapsed}
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
                collapsed={collapsed}
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
                collapsed={collapsed}
              />
            </ModuleGroup>

            <ModuleGroup
              title={t("sidebar.international")}
              count={2}
              isExpanded={expandedGroups.international}
              onToggle={() => toggleGroup("international")}
              hasActiveItem={activeGroup === "international"}
              groupId="international"
              collapsed={collapsed}
            >
              <CompactModuleItem
                href="/dashboard/modules/copuos"
                icon={<Globe size={14} strokeWidth={1.5} />}
                label={t("modules.copuos")}
                onClick={handleNavClick}
                locked={isModuleLocked("/dashboard/modules/copuos")}
                requiredPlan={getRequiredPlanLabel("/dashboard/modules/copuos")}
                collapsed={collapsed}
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
                collapsed={collapsed}
              />
            </ModuleGroup>

            <ModuleGroup
              title={t("sidebar.usRegulations")}
              count={3}
              isExpanded={expandedGroups.us}
              onToggle={() => toggleGroup("us")}
              hasActiveItem={activeGroup === "us"}
              groupId="us"
              collapsed={collapsed}
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
                collapsed={collapsed}
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
                collapsed={collapsed}
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
                collapsed={collapsed}
              />
            </ModuleGroup>
          </div>

          {/* AI Agent */}
          <div style={{ marginBottom: collapsed ? 8 : 20 }}>
            <SectionHeader collapsed={collapsed}>
              {t("sidebar.aiAgent")}
            </SectionHeader>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/astra"
                icon={<Zap size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                Astra
              </NavItem>
              <NavItem
                href="/dashboard/sentinel"
                icon={<Satellite size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
                collapsed={collapsed}
              >
                Sentinel
              </NavItem>
              <NavItem
                href="/dashboard/ephemeris"
                icon={<Activity size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
                collapsed={collapsed}
              >
                Ephemeris
              </NavItem>
              <NavItem
                href="/dashboard/optimizer"
                icon={<Target size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                Optimizer
              </NavItem>
            </div>
          </div>

          {/* Resources */}
          <div style={{ marginBottom: collapsed ? 8 : 20 }}>
            <SectionHeader collapsed={collapsed}>
              {t("sidebar.resources")}
            </SectionHeader>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/nca-portal"
                icon={<Building2 size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
                collapsed={collapsed}
              >
                {t("sidebar.ncaPortal")}
              </NavItem>
              <NavItem
                href="/dashboard/documents"
                icon={<FileText size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.documents")}
              </NavItem>
              <NavItem
                href="/dashboard/generate"
                icon={<Sparkles size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.documentGenerator")}
              </NavItem>
              <NavItem
                href="/dashboard/audit-center"
                icon={<ClipboardCheck size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.auditCenter")}
              </NavItem>
              <NavItem
                href="/dashboard/timeline"
                icon={<Clock size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.timeline")}
              </NavItem>
              <NavItem
                href="/dashboard/digital-twin"
                icon={<Layers size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.digitalTwin")}
              </NavItem>
              <NavItem
                href="/dashboard/incidents"
                icon={<AlertTriangle size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.incidents")}
              </NavItem>
              <NavItem
                href="/dashboard/regulatory-feed"
                icon={<Radio size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
                collapsed={collapsed}
              >
                {t("sidebar.regulatoryFeed")}
              </NavItem>
              <NavItem
                href="/dashboard/mission-control"
                icon={<Orbit size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.missionControl")}
              </NavItem>
              <NavItem
                href="/dashboard/evidence"
                icon={<FileCheck size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
                collapsed={collapsed}
              >
                Evidence
              </NavItem>
            </div>
          </div>

          {/* Assure */}
          <div style={{ marginBottom: collapsed ? 8 : 20 }}>
            <SectionHeader collapsed={collapsed}>Assure</SectionHeader>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/assure"
                icon={<ShieldAlert size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
                collapsed={collapsed}
              >
                Regulatory Readiness
              </NavItem>
              <NavItem
                href="/dashboard/assure/rating"
                icon={<BarChart3 size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                Credit Rating
              </NavItem>
            </div>
          </div>

          {/* Network */}
          <div style={{ marginBottom: collapsed ? 8 : 20 }}>
            <SectionHeader collapsed={collapsed}>
              {t("sidebar.network") || "Network"}
            </SectionHeader>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/network"
                icon={<Users size={18} strokeWidth={1.5} />}
                onClick={handleNavClick}
                collapsed={collapsed}
              >
                {t("sidebar.complianceNetwork") || "Compliance Network"}
              </NavItem>
            </div>
          </div>

          {/* Admin */}
          {user?.role === "admin" && (
            <div style={{ marginBottom: collapsed ? 8 : 20 }}>
              <SectionHeader collapsed={collapsed}>
                {t("sidebar.admin")}
              </SectionHeader>
              <div className="space-y-0.5">
                <NavItem
                  href="/dashboard/admin"
                  icon={<Crown size={18} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                  collapsed={collapsed}
                >
                  {t("sidebar.adminPanel")}
                </NavItem>
                <NavItem
                  href="/dashboard/admin/bookings"
                  icon={<Calendar size={18} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                  collapsed={collapsed}
                >
                  {t("sidebar.bookings") || "Bookings"}
                </NavItem>
                <NavItem
                  href="/dashboard/admin/analytics"
                  icon={<BarChart3 size={18} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                  collapsed={collapsed}
                >
                  {t("sidebar.analytics")}
                </NavItem>
                <NavItem
                  href="/dashboard/admin/audit"
                  icon={<FileSearch size={18} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                  collapsed={collapsed}
                >
                  {t("sidebar.auditLogs")}
                </NavItem>
              </div>
            </div>
          )}
        </nav>

        {/* ─── Settings / Logout ─── */}
        <div
          style={{
            padding: collapsed ? "8px 4px" : "8px 14px",
            borderTop: `1px solid var(--sidebar-divider)`,
          }}
        >
          <div className="space-y-0.5">
            <NavItem
              href="/dashboard/settings"
              icon={<Settings size={18} strokeWidth={1.5} />}
              onClick={handleNavClick}
              collapsed={collapsed}
            >
              {t("sidebar.settings")}
            </NavItem>
            {collapsed ? (
              <button
                onClick={handleLogout}
                className="group relative flex items-center justify-center w-11 h-11 mx-auto rounded-[10px] text-[var(--sidebar-nav-icon-color)] hover:text-[var(--status-danger)] hover:bg-[var(--accent-danger-soft)] transition-colors duration-[120ms]"
              >
                <LogOut size={20} />
                <Tooltip label={t("sidebar.signOut")} />
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="
                  w-full flex items-center gap-2.5 h-9 px-3 rounded-[10px] text-[13.5px]
                  text-[var(--sidebar-nav-color)] hover:text-[var(--status-danger)] hover:bg-[var(--accent-danger-soft)]
                  transition-all duration-[120ms] ease-out
                "
              >
                <LogOut
                  size={18}
                  className="text-[var(--sidebar-nav-icon-color)]"
                  aria-hidden="true"
                />
                <span>{t("sidebar.signOut")}</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── User ─── */}
        <div
          style={{
            padding: collapsed ? "12px 4px" : "12px 14px",
            borderTop: `1px solid var(--sidebar-divider)`,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 0 : 10,
          }}
        >
          {/* Avatar */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full"
            style={{
              width: 34,
              height: 34,
              background: "var(--bg-surface-3, #f7f7fa)",
              border: "2px solid var(--sidebar-user-ring)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {user?.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.image}
                alt={user?.name ? `${user.name}'s avatar` : "User avatar"}
                className="w-[30px] h-[30px] rounded-full object-cover"
              />
            ) : (
              <span
                className="text-[12px] font-medium"
                style={{ color: "var(--sidebar-nav-color)" }}
              >
                {initials}
              </span>
            )}
          </div>

          {/* Info — hidden when collapsed */}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-medium truncate leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {user?.name || t("common.user")}
              </p>
              <p
                className="text-[11.5px] truncate leading-tight mt-0.5"
                style={{ color: "var(--sidebar-section-color)" }}
              >
                {user?.email || ""}
              </p>
            </div>
          )}
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
