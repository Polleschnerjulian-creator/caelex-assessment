"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Building2, Check, Settings } from "lucide-react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  plan: string;
  role: string;
  memberCount: number;
  spacecraftCount: number;
}

interface OrganizationSwitcherProps {
  currentOrgId?: string;
  onOrganizationChange?: (orgId: string) => void;
}

export function OrganizationSwitcher({
  currentOrgId,
  onOrganizationChange,
}: OrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Escape key to close and focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = dropdownRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function fetchOrganizations() {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations);

        // Set selected org
        if (data.organizations.length > 0) {
          const org = currentOrgId
            ? data.organizations.find(
                (o: Organization) => o.id === currentOrgId,
              ) || data.organizations[0]
            : data.organizations[0];
          setSelectedOrg(org);
        }
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectOrg(org: Organization) {
    setSelectedOrg(org);
    setIsOpen(false);
    onOrganizationChange?.(org.id);
    // Store in localStorage for persistence
    localStorage.setItem("currentOrgId", org.id);
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function getRoleBadgeColor(role: string): string {
    switch (role) {
      case "OWNER":
        return "bg-amber-500/20 text-amber-400";
      case "ADMIN":
        return "bg-blue-500/20 text-blue-400";
      case "MANAGER":
        return "bg-purple-500/20 text-purple-400";
      case "MEMBER":
        return "bg-slate-500/20 text-slate-400";
      case "VIEWER":
        return "bg-slate-600/20 text-slate-500";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  }

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <Link
        href="/dashboard/organization/new"
        className="mx-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
      >
        <Plus size={16} aria-hidden="true" />
        <span className="text-sm">Create Organization</span>
      </Link>
    );
  }

  return (
    <div className="px-3 relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="org-switcher-dropdown"
        aria-label={
          selectedOrg
            ? `Organization: ${selectedOrg.name}`
            : "Select organization"
        }
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
      >
        {/* Org Avatar */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
          style={{
            backgroundColor: selectedOrg?.primaryColor || "#3B82F6",
          }}
        >
          {selectedOrg?.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={selectedOrg.logoUrl}
              alt={selectedOrg.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            getInitials(selectedOrg?.name || "")
          )}
        </div>

        {/* Org Info */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {selectedOrg?.name}
          </div>
          <div className="text-[11px] text-white/50 truncate">
            {selectedOrg?.plan} Plan
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          id="org-switcher-dropdown"
          className="absolute left-3 right-3 top-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
        >
          {/* Organization List */}
          <div
            className="max-h-64 overflow-y-auto py-1"
            role="listbox"
            aria-label="Organizations"
          >
            {organizations.map((org) => (
              <button
                key={org.id}
                role="option"
                aria-selected={selectedOrg?.id === org.id}
                onClick={() => handleSelectOrg(org)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
              >
                {/* Org Avatar */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: org.primaryColor || "#3B82F6" }}
                >
                  {org.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    getInitials(org.name)
                  )}
                </div>

                {/* Org Info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm text-white truncate">{org.name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-white/50">
                    <span>{org.memberCount} members</span>
                    <span>·</span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${getRoleBadgeColor(org.role)}`}
                    >
                      {org.role}
                    </span>
                  </div>
                </div>

                {/* Check if selected */}
                {selectedOrg?.id === org.id && (
                  <Check
                    size={16}
                    className="text-emerald-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Actions */}
          <div className="py-1">
            <Link
              href="/dashboard/organization/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings size={14} aria-hidden="true" />
              <span>Organization Settings</span>
            </Link>
            <Link
              href="/dashboard/organization/new"
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Create Organization</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationSwitcher;
