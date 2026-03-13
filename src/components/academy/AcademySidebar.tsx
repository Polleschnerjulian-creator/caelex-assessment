"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  Terminal,
  TrendingUp,
  Users,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { CaelexIcon } from "@/components/ui/Logo";

// ─── Types ───

interface AcademySidebarProps {
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
    href: "/academy/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={16} strokeWidth={1.5} />,
  },
  {
    href: "/academy/courses",
    label: "Courses",
    icon: <BookOpen size={16} strokeWidth={1.5} />,
  },
  {
    href: "/academy/simulations",
    label: "Simulations",
    icon: <FlaskConical size={16} strokeWidth={1.5} />,
  },
  {
    href: "/academy/sandbox",
    label: "Sandbox",
    icon: <Terminal size={16} strokeWidth={1.5} />,
  },
  {
    href: "/academy/progress",
    label: "My Progress",
    icon: <TrendingUp size={16} strokeWidth={1.5} />,
  },
  {
    href: "/academy/classroom",
    label: "Classroom",
    icon: <Users size={16} strokeWidth={1.5} />,
  },
];

// ─── NavItem ───

function AcademyNavItem({
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
        group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px]
        transition-all duration-150
        ${
          isActive
            ? "bg-emerald-500/10 text-emerald-400 font-medium"
            : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
        }
      `}
    >
      <span
        aria-hidden="true"
        className={`w-4 h-4 flex-shrink-0 ${
          isActive
            ? "text-emerald-400"
            : "text-white/30 group-hover:text-white/60"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
    </Link>
  );
}

// ─── Component ───

export default function AcademySidebar({
  isOpen,
  onClose,
}: AcademySidebarProps) {
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
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
          bg-black border-r border-white/[0.06]
          flex flex-col z-50
          transition-transform duration-300 lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          aria-label="Close navigation menu"
          className="lg:hidden absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Header / Branding */}
        <div className="h-16 flex items-center px-6 border-b border-white/[0.06]">
          <Link href="/academy/dashboard" className="flex items-center gap-3">
            <CaelexIcon size={28} className="text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-white/90 tracking-[-0.02em] leading-none">
                caelex
              </span>
              <span className="text-[9px] font-medium text-emerald-400/70 tracking-[0.15em] leading-none mt-1 uppercase">
                Academy
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Academy navigation"
          className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar"
        >
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <AcademyNavItem
                key={item.href}
                {...item}
                onClick={handleNavClick}
              />
            ))}
          </div>
        </nav>

        {/* Footer — Switch to Comply */}
        <div className="p-3 border-t border-white/[0.06]">
          <Link
            href="/dashboard"
            className="
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px]
              text-white/30 hover:text-white/60 hover:bg-white/[0.04]
              transition-all duration-150
            "
          >
            <ArrowLeftRight
              size={16}
              className="text-white/30"
              aria-hidden="true"
            />
            <span>Switch to Comply</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
