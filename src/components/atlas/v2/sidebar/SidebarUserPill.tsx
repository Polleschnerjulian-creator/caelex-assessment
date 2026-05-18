"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 Sidebar redesign — bottom user-pill (avatar + name +
 * theme toggle + ⋯ menu trigger).
 *
 * Theme toggle reads/writes `localStorage.atlas.theme` and flips the
 * `dark` class on `<html>`. Menu trigger is a callback to the parent
 * (actual menu rendering happens elsewhere).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { Moon, Sun, MoreHorizontal } from "lucide-react";

interface SidebarUserPillProps {
  name: string;
  /** Plan/tier label shown subtly after name, e.g. "Max", "Pro". */
  tier?: string;
  avatarUrl?: string | null;
  onMenuOpen?: () => void;
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

function readStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("atlas.theme");
  if (stored === "dark" || stored === "light") return stored;
  /* UI 2026-05-18: light ist unbedingter Default, auch wenn OS dark
     ist. User-Request: "whitemode ist standart nicht darmode. soll
     aber natürlich einstellbar sein". Dark wird nur aktiv wenn User
     den Toggle expliziert auf "dark" stellt. */
  return "light";
}

export function SidebarUserPill({
  name,
  tier,
  avatarUrl,
  onMenuOpen,
}: SidebarUserPillProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem("atlas.theme", next);
    } catch {
      /* private mode etc. — silent */
    }
  };

  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2 rounded-lg bg-atlas-bg-elevated px-2.5 py-2">
      {/* Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-atlas-amber/20 text-[11px] font-medium text-atlas-text-primary">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>

      {/* Name + tier */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-[12.5px] text-atlas-text-primary">
          {name}
        </span>
        {tier && (
          <span className="shrink-0 text-[10.5px] text-atlas-text-muted">
            · {tier}
          </span>
        )}
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Light Mode" : "Dark Mode"}
        title={theme === "dark" ? "Light Mode" : "Dark Mode"}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-atlas-text-secondary transition-colors hover:bg-atlas-bg-subtle hover:text-atlas-text-primary"
      >
        {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
      </button>

      {/* ⋯ menu */}
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Menü"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-atlas-text-secondary transition-colors hover:bg-atlas-bg-subtle hover:text-atlas-text-primary"
      >
        <MoreHorizontal size={13} />
      </button>
    </div>
  );
}
