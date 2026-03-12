"use client";

import { useRef, useEffect, useState } from "react";
import { X } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface MemberPickerProps {
  members: Member[];
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
}

function getInitial(name: string | null): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export function MemberPicker({
  members,
  value,
  onChange,
  placeholder = "Assign member",
}: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMember = value
    ? (members.find((m) => m.id === value) ?? null)
    : null;

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  function handleSelect(memberId: string) {
    onChange(memberId);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="glass-surface inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-body text-slate-300 border border-white/10 hover:border-white/20 transition-colors"
      >
        {selectedMember ? (
          <>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-caption font-semibold flex-shrink-0">
              {getInitial(selectedMember.name)}
            </span>
            <span className="text-body text-slate-200">
              {selectedMember.name ?? "Unknown"}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(null);
                }
              }}
              className="ml-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              aria-label="Clear selection"
            >
              <X size={12} strokeWidth={2} />
            </span>
          </>
        ) : (
          <span className="text-slate-500">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="glass-floating absolute z-50 mt-1 min-w-[180px] rounded-lg border border-white/10 py-1 shadow-glass-elevated">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => handleSelect(member.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-body text-slate-300 hover:bg-white/5 transition-colors text-left"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-caption font-semibold flex-shrink-0">
                {getInitial(member.name)}
              </span>
              <span>{member.name ?? "Unknown"}</span>
            </button>
          ))}
          {members.length === 0 && (
            <p className="px-3 py-2 text-caption text-slate-500">No members</p>
          )}
        </div>
      )}
    </div>
  );
}
