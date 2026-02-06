"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Check,
  Shield,
  Crown,
  UserCog,
  User,
  Eye,
} from "lucide-react";

type OrganizationRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

interface RoleSelectorProps {
  value: OrganizationRole;
  onChange: (role: OrganizationRole) => void;
  disabled?: boolean;
  excludeOwner?: boolean;
  size?: "sm" | "md";
}

const roleConfig: Record<
  OrganizationRole,
  { label: string; description: string; icon: typeof Shield; color: string }
> = {
  OWNER: {
    label: "Owner",
    description: "Full access, can delete organization",
    icon: Crown,
    color: "text-amber-400",
  },
  ADMIN: {
    label: "Admin",
    description: "Manage members and settings",
    icon: Shield,
    color: "text-blue-400",
  },
  MANAGER: {
    label: "Manager",
    description: "Manage compliance and reports",
    icon: UserCog,
    color: "text-purple-400",
  },
  MEMBER: {
    label: "Member",
    description: "View and edit assigned items",
    icon: User,
    color: "text-slate-300",
  },
  VIEWER: {
    label: "Viewer",
    description: "Read-only access",
    icon: Eye,
    color: "text-slate-400",
  },
};

export function RoleSelector({
  value,
  onChange,
  disabled = false,
  excludeOwner = false,
  size = "md",
}: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentRole = roleConfig[value];
  const CurrentIcon = currentRole.icon;

  const roles = Object.entries(roleConfig).filter(
    ([role]) => !excludeOwner || role !== "OWNER",
  ) as [OrganizationRole, typeof roleConfig.OWNER][];

  const sizeClasses = {
    sm: {
      button: "px-2 py-1 text-xs",
      dropdown: "min-w-[200px]",
      icon: 12,
    },
    md: {
      button: "px-3 py-2 text-sm",
      dropdown: "min-w-[240px]",
      icon: 14,
    },
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 rounded-lg border border-white/10
          bg-white/5 hover:bg-white/10 transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${sizeClasses[size].button}
        `}
      >
        <CurrentIcon
          size={sizeClasses[size].icon}
          className={currentRole.color}
        />
        <span className="text-white">{currentRole.label}</span>
        {!disabled && (
          <ChevronDown
            size={sizeClasses[size].icon}
            className={`text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {isOpen && (
        <div
          className={`
            absolute top-full mt-1 right-0 z-50
            bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden
            ${sizeClasses[size].dropdown}
          `}
        >
          {roles.map(([role, config]) => {
            const Icon = config.icon;
            const isSelected = role === value;

            return (
              <button
                key={role}
                onClick={() => {
                  onChange(role);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-start gap-3 px-3 py-2.5 text-left
                  hover:bg-white/5 transition-colors
                  ${isSelected ? "bg-white/5" : ""}
                `}
              >
                <Icon size={16} className={`mt-0.5 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">
                    {config.label}
                  </div>
                  <div className="text-xs text-white/50">
                    {config.description}
                  </div>
                </div>
                {isSelected && (
                  <Check size={16} className="text-emerald-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RoleSelector;
