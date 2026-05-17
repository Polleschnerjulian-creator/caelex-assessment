"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 Sidebar redesign — search input (filters chat list by title).
 *
 * Controlled component. Cmd+K (or Ctrl+K on non-Mac) focuses the input.
 * Esc clears + blurs.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

interface SidebarSearchBoxProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function SidebarSearchBox({
  value,
  onChange,
  placeholder = "Chats durchsuchen…",
}: SidebarSearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative">
      <Search
        size={12}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-atlas-text-muted"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md bg-atlas-bg-elevated py-1.5 pl-7 pr-2.5 text-[12.5px] text-atlas-text-primary placeholder:text-atlas-text-muted focus:outline-none focus:ring-1 focus:ring-atlas-border-strong"
      />
    </div>
  );
}
