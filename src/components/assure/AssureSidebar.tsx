"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  ShieldAlert,
  FileText,
  FolderLock,
  BarChart3,
  Users,
  Settings,
  X,
  ArrowLeftRight,
  Shield,
} from "lucide-react";

// ─── Types ───

interface AssureSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItemConfig {
  href: string;
  label: string;
  icon: React.ReactNode;
}

// ─── Nav Items ───

const NAV_ITEMS: NavItemConfig[] = [
  {
    href: "/assure/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={16} strokeWidth={1.5} />,
  },
  {
    href: "/assure/profile",
    label: "Company Profile",
    icon: <Building2 size={16} strokeWidth={1.5} />,
  },
  {
    href: "/assure/score",
    label: "Investment Readiness",
    icon: <TrendingUp size={16} strokeWidth={1.5} />,
  },
  {
    href: "/assure/risks",
    label: "Risk Intelligence",
    icon: <ShieldAlert size={16} strokeWidth={1.5} />,
  },
  {
    href: "/assure/materials",
    label: "Materials",
    icon: <FileText size={16} strokeWidth={1.5} />,
  },
  {
    href: "/assure/dataroom",
    label: "Data Room",
    icon: <FolderLock size={16} strokeWidth={1.5} />,
  },
  {
    href: "/assure/benchmarks",
    label: "Benchmarks",
    icon: <BarChart3 size={16} strokeWidth={1.5} />,
  },
  {
    href: "/assure/investors",
    label: "Investor Relations",
    icon: <Users size={16} strokeWidth={1.5} />,
  },
  {
    href: "/assure/settings",
    label: "Settings",
    icon: <Settings size={16} strokeWidth={1.5} />,
  },
];

// ─── NavItem ───

function AssureNavItem({
  href,
  icon,
  label,
  onClick,
}: NavItemConfig & { onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`
        group flex items-center gap-3 px-3 py-2.5 rounded-lg text-body
        transition-all duration-150
        ${
          isActive
            ? "bg-emerald-500/10 text-emerald-400 font-medium"
            : "text-white/60 hover:text-white hover:bg-white/[0.06]"
        }
      `}
    >
      <span
        aria-hidden="true"
        className={`w-4 h-4 flex-shrink-0 ${
          isActive
            ? "text-emerald-400"
            : "text-white/40 group-hover:text-white/70"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
    </Link>
  );
}

// ─── Component ───

export default function AssureSidebar({ isOpen, onClose }: AssureSidebarProps) {
  const handleNavClick = () => {
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 top-0 left-0 bottom-0
          w-[280px] lg:w-[260px] lg:h-screen
          bg-navy-950 border-r border-white/10
          flex flex-col z-50
          transition-transform duration-300 lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          aria-label="Close navigation menu"
          className="lg:hidden absolute top-4 right-4 p-2 text-white/45 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Header / Branding */}
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link href="/assure/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Shield size={16} className="text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-body-lg font-semibold text-white tracking-wide">
                CAELEX
              </span>
              <span className="text-micro font-medium text-emerald-400 tracking-[0.2em] -mt-0.5">
                ASSURE
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Assure navigation"
          className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar"
        >
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <AssureNavItem
                key={item.href}
                {...item}
                onClick={handleNavClick}
              />
            ))}
          </div>
        </nav>

        {/* Footer — Switch to Comply */}
        <div className="p-3 border-t border-white/10">
          <Link
            href="/dashboard"
            className="
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-body
              text-white/40 hover:text-white/70 hover:bg-white/[0.06]
              transition-all duration-150
            "
          >
            <ArrowLeftRight
              size={16}
              className="text-white/40"
              aria-hidden="true"
            />
            <span>Switch to Comply</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
