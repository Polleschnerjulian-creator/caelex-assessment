"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
  Trash2,
  Leaf,
  Scale,
  Eye,
  ChevronRight,
} from "lucide-react";
import Logo from "@/components/ui/Logo";

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

interface ModuleNavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function ModuleNavItem({ href, icon, label, onClick }: ModuleNavItemProps) {
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
      <span
        className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-white/60 group-hover:text-slate-700 dark:group-hover:text-white/60"}`}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight
        size={14}
        className={`opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "text-emerald-700 dark:text-emerald-400 opacity-100" : "text-slate-400 dark:text-white/30"}`}
      />
    </Link>
  );
}

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } & { organization?: string };
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
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
          fixed lg:static top-0 left-0 bottom-0
          w-[280px] lg:w-[260px]
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
          <div className="mb-6">
            <p className="px-3 mb-2 text-[11px] font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">
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

          {/* Modules Section */}
          <div className="mb-6">
            <p className="px-3 mb-2 text-[11px] font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">
              Compliance Modules
            </p>
            <div className="space-y-0.5">
              <ModuleNavItem
                href="/dashboard/modules/authorization"
                icon={<FileCheck size={16} strokeWidth={1.5} />}
                label="Authorization"
                onClick={handleNavClick}
              />
              <ModuleNavItem
                href="/dashboard/modules/cybersecurity"
                icon={<Shield size={16} strokeWidth={1.5} />}
                label="Cybersecurity"
                onClick={handleNavClick}
              />
              <ModuleNavItem
                href="/dashboard/modules/debris"
                icon={<Trash2 size={16} strokeWidth={1.5} />}
                label="Debris Mitigation"
                onClick={handleNavClick}
              />
              <ModuleNavItem
                href="/dashboard/modules/environmental"
                icon={<Leaf size={16} strokeWidth={1.5} />}
                label="Environmental"
                onClick={handleNavClick}
              />
              <ModuleNavItem
                href="/dashboard/modules/insurance"
                icon={<Scale size={16} strokeWidth={1.5} />}
                label="Insurance"
                onClick={handleNavClick}
              />
              <ModuleNavItem
                href="/dashboard/modules/supervision"
                icon={<Eye size={16} strokeWidth={1.5} />}
                label="Supervision"
                onClick={handleNavClick}
              />
            </div>
          </div>

          {/* Resources Section */}
          <div>
            <p className="px-3 mb-2 text-[11px] font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">
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
                href="/dashboard/timeline"
                icon={<Clock size={16} strokeWidth={1.5} />}
                onClick={handleNavClick}
              >
                Timeline
              </NavItem>
            </div>
          </div>
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
