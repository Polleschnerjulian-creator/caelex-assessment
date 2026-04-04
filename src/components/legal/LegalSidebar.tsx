"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
  LogOut,
  Scale,
} from "lucide-react";
import { CaelexIcon } from "@/components/ui/Logo";

interface LegalSidebarProps {
  attorneyName: string;
  firmName: string;
}

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/legal/dashboard",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "Documents",
    href: "#",
    icon: FileText,
    active: false,
    comingSoon: true,
  },
  {
    label: "Calendar",
    href: "#",
    icon: Calendar,
    active: false,
    comingSoon: true,
  },
  {
    label: "Settings",
    href: "#",
    icon: Settings,
    active: false,
    comingSoon: true,
  },
];

export default function LegalSidebar({
  attorneyName,
  firmName,
}: LegalSidebarProps) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: "/legal/login" });
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#FAFAFA] border-r border-[#e5e7eb] flex flex-col z-40">
      {/* Logo + Portal Label */}
      <div className="px-5 pt-6 pb-5 border-b border-[#e5e7eb]">
        <Link href="/legal/dashboard" className="flex items-center gap-2.5">
          <CaelexIcon size={22} className="text-[#111827]" />
          <span className="text-[15px] font-medium tracking-[-0.02em] text-[#111827]">
            caelex
          </span>
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <Scale size={13} className="text-[#9ca3af]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
            Legal Portal
          </span>
        </div>
      </div>

      {/* Attorney Info */}
      <div className="px-5 py-4 border-b border-[#e5e7eb]">
        <p className="text-[13px] font-medium text-[#111827] truncate">
          {attorneyName}
        </p>
        <p className="text-[11px] text-[#9ca3af] mt-0.5 truncate">{firmName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.active && pathname?.startsWith(item.href) && item.href !== "#";

          if (item.comingSoon) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#c4c8ce] cursor-default select-none"
              >
                <Icon size={16} />
                <span className="text-[13px]">{item.label}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider font-medium bg-[#f3f4f6] text-[#9ca3af] px-1.5 py-0.5 rounded">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-[#111827] text-white"
                  : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
              }`}
            >
              <Icon size={16} />
              <span className="text-[13px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Sign Out */}
      <div className="px-3 pb-5 mt-auto">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors w-full disabled:opacity-50"
        >
          <LogOut size={16} />
          <span className="text-[13px] font-medium">
            {signingOut ? "Signing out..." : "Sign Out"}
          </span>
        </button>
      </div>
    </aside>
  );
}
