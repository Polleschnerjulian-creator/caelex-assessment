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
        group flex items-center gap-3 px-3 py-2 rounded-lg text-body
        transition-all duration-150
        ${
          isActive
            ? "bg-[#F1F3F5] text-[#111827] font-medium"
            : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA]"
        }
      `}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#111827]" : "text-[#9CA3AF] group-hover:text-[#4B5563]"}`}
        >
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="text-micro px-1.5 py-0.5 rounded bg-[#F1F3F5] text-[#4B5563]">
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
        group flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-small
        transition-all duration-150
        ${
          locked
            ? "text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F7F8FA] cursor-default"
            : isActive
              ? "bg-[#F1F3F5] text-[#111827] font-medium"
              : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA]"
        }
      `}
    >
      <span
        aria-hidden="true"
        className={`w-3.5 h-3.5 flex-shrink-0 ${
          locked
            ? "text-[#D1D5DB]"
            : isActive
              ? "text-[#111827]"
              : "text-[#9CA3AF] group-hover:text-[#4B5563]"
        }`}
      >
        {icon}
      </span>
      <span className={`flex-1 ${locked ? "opacity-60" : ""}`}>{label}</span>
      {locked && (
        <span className="flex items-center gap-1" aria-hidden="true">
          {requiredPlan && (
            <span className="text-[8px] font-medium uppercase tracking-wider text-[#9CA3AF]">
              {requiredPlan}
            </span>
          )}
          <Lock size={14} className="text-[#D1D5DB]" />
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
    <div className="mb-2">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg text-caption font-medium uppercase tracking-wider
          transition-all duration-150
          ${
            hasActiveItem
              ? "text-[#111827]"
              : "text-[#9CA3AF] hover:text-[#4B5563]"
          }
          hover:bg-[#F7F8FA]
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
          className={`text-micro px-1.5 py-0.5 rounded-full font-medium ${
            hasActiveItem
              ? "bg-[#111827] text-white"
              : "bg-[#F1F3F5] text-[#9CA3AF]"
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
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pl-3 pt-2 space-y-1">{children}</div>
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
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 top-0 left-0 bottom-0
          w-[280px] lg:w-[260px] lg:h-screen
          bg-white border-r border-[#E5E7EB]
          flex flex-col z-50
          transition-transform duration-300 lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          aria-label="Close navigation menu"
          className="lg:hidden absolute top-4 right-4 p-2 text-[#4B5563] hover:text-[#111827] rounded-lg hover:bg-[#F1F3F5] transition-colors"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-[#E5E7EB]">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={22} className="text-[#111827]" />
            <span className="text-micro text-[#9CA3AF] tracking-wider">
              v0.1
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar"
        >
          {/* Overview Section */}
          <div className="mb-5">
            <p className="px-3 mb-2 text-micro font-semibold text-[#9CA3AF] uppercase tracking-[0.15em]">
              {t("sidebar.overview")}
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.dashboard")}
              </NavItem>
              <NavItem
                href="/dashboard/tracker"
                icon={<ListChecks size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.complianceTracker")}
              </NavItem>
            </div>
          </div>

          {/* Compliance Modules Section */}
          <div className="mb-5">
            <p className="px-3 mb-2 text-micro font-semibold text-[#9CA3AF] uppercase tracking-[0.15em]">
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
          <div className="mb-5">
            <p className="px-3 mb-2 text-micro font-semibold text-[#9CA3AF] uppercase tracking-[0.15em]">
              {t("sidebar.aiAgent")}
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/astra"
                icon={<Zap size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Astra
              </NavItem>
              <NavItem
                href="/dashboard/sentinel"
                icon={<Satellite size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                Sentinel
              </NavItem>
              <NavItem
                href="/dashboard/ephemeris"
                icon={<Activity size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                Ephemeris
              </NavItem>
            </div>
          </div>

          {/* Resources Section */}
          <div>
            <p className="px-3 mb-2 text-micro font-semibold text-[#9CA3AF] uppercase tracking-[0.15em]">
              {t("sidebar.resources")}
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/nca-portal"
                icon={<Building2 size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                {t("sidebar.ncaPortal")}
              </NavItem>
              <NavItem
                href="/dashboard/documents"
                icon={<FileText size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.documents")}
              </NavItem>
              <NavItem
                href="/dashboard/generate"
                icon={<Sparkles size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.documentGenerator")}
              </NavItem>
              <NavItem
                href="/dashboard/audit-center"
                icon={<ClipboardCheck size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.auditCenter")}
              </NavItem>
              <NavItem
                href="/dashboard/timeline"
                icon={<Clock size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.timeline")}
              </NavItem>
              <NavItem
                href="/dashboard/digital-twin"
                icon={<Layers size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.digitalTwin")}
              </NavItem>
              <NavItem
                href="/dashboard/incidents"
                icon={<AlertTriangle size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.incidents")}
              </NavItem>
              <NavItem
                href="/dashboard/regulatory-feed"
                icon={<Radio size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                {t("sidebar.regulatoryFeed")}
              </NavItem>
              <NavItem
                href="/dashboard/mission-control"
                icon={<Orbit size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.missionControl")}
              </NavItem>
              <NavItem
                href="/dashboard/evidence"
                icon={<FileCheck size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                Evidence
              </NavItem>
            </div>
          </div>

          {/* Assure Section */}
          <div className="mt-5">
            <p className="px-3 mb-2 text-micro font-semibold text-[#9CA3AF] uppercase tracking-[0.15em]">
              Assure
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/assure"
                icon={<ShieldAlert size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
                badge={t("sidebar.new")}
              >
                Regulatory Readiness
              </NavItem>
              <NavItem
                href="/dashboard/assure/rating"
                icon={<BarChart3 size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Credit Rating
              </NavItem>
            </div>
          </div>

          {/* Network Section */}
          <div className="mt-5">
            <p className="px-3 mb-2 text-micro font-semibold text-[#9CA3AF] uppercase tracking-[0.15em]">
              {t("sidebar.network") || "Network"}
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard/network"
                icon={<Users size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                {t("sidebar.complianceNetwork") || "Compliance Network"}
              </NavItem>
            </div>
          </div>

          {/* Admin — only for admin role users */}
          {user?.role === "admin" && (
            <div className="mt-5">
              <p className="px-3 mb-2 text-micro font-semibold text-[#9CA3AF] uppercase tracking-[0.15em]">
                {t("sidebar.admin")}
              </p>
              <div className="space-y-0.5">
                <NavItem
                  href="/dashboard/admin"
                  icon={<Crown size={16} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                >
                  {t("sidebar.adminPanel")}
                </NavItem>
                <NavItem
                  href="/dashboard/admin/bookings"
                  icon={<Calendar size={16} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                >
                  {t("sidebar.bookings") || "Bookings"}
                </NavItem>
                <NavItem
                  href="/dashboard/admin/analytics"
                  icon={<BarChart3 size={16} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                >
                  {t("sidebar.analytics")}
                </NavItem>
                <NavItem
                  href="/dashboard/admin/audit"
                  icon={<FileSearch size={16} strokeWidth={1.5} />}
                  onClick={handleNavClick}
                >
                  {t("sidebar.auditLogs")}
                </NavItem>
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#E5E7EB] space-y-1">
          <NavItem
            href="/dashboard/settings"
            icon={<Settings size={16} strokeWidth={1.5} />}
            onClick={handleNavClick}
          >
            {t("sidebar.settings")}
          </NavItem>
          <button
            onClick={handleLogout}
            className="
              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-body
              text-[#4B5563] hover:text-red-600 hover:bg-red-50
              transition-all duration-150
            "
          >
            <LogOut size={16} className="text-[#9CA3AF]" aria-hidden="true" />
            <span>{t("sidebar.signOut")}</span>
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#F1F3F5] flex items-center justify-center flex-shrink-0 border border-[#E5E7EB]">
              {user?.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.image}
                  alt={user?.name ? `${user.name}'s avatar` : "User avatar"}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <span className="text-small font-medium text-[#4B5563]">
                  {initials}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-[#111827] truncate">
                {user?.name || t("common.user")}
              </p>
              <p className="text-caption text-[#9CA3AF] truncate">
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
