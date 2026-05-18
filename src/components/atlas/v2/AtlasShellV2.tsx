"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — App Shell (UI refresh 2026-05-12).
 *
 * Floating-panel layout (redesign 2026-05-17):
 *   - Page background uses `bg-atlas-bg-page` (the gap colour between panels)
 *   - Sidebar and main content are white floating panels with rounded corners + shadow
 *   - Small padding + gap between panels and viewport edge (p-2 gap-2)
 *   - Theme-aware via CSS custom properties set by AtlasV2Bootstrap
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { AtlasSidebar } from "./AtlasSidebar";
import { KeyboardHelpOverlay } from "./KeyboardHelpOverlay";
import { CommandPalette } from "./CommandPalette";
import { useAtlasKeyboardShortcuts } from "@/hooks/useAtlasKeyboardShortcuts";

interface Props {
  children: React.ReactNode;
}

export function AtlasShellV2({ children }: Props) {
  const pathname = usePathname();

  const { activeChatId, activeMandateId } = useMemo(() => {
    const chatMatch = pathname.match(/^\/atlas\/chat\/([^/]+)/);
    const mandateMatch = pathname.match(/^\/atlas\/mandate\/([^/]+)/);
    return {
      activeChatId: chatMatch?.[1] ?? null,
      activeMandateId: mandateMatch?.[1] ?? null,
    };
  }, [pathname]);

  /* Global keyboard shortcuts — dispatches custom events that
     AtlasSidebar + ChatInput listen for. The help-overlay state
     lives here so the modal can be rendered as a peer of the shell. */
  const kbd = useAtlasKeyboardShortcuts();

  return (
    <div className="flex h-screen w-screen bg-atlas-bg-page p-2 gap-2 text-slate-900 dark:text-slate-100">
      <aside className="w-[260px] shrink-0 overflow-hidden rounded-xl bg-atlas-bg-panel shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.06),0_24px_64px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.4)] dark:ring-white/[0.06]">
        <AtlasSidebar
          activeChatId={activeChatId}
          activeMandateId={activeMandateId}
        />
      </aside>
      {/* `overflow-y-auto` (not `overflow-hidden`) so sub-pages that
          don't bring their own scroll container (CreateMandateForm,
          /atlas/clauses, /atlas/workflows, /atlas/settings/*, etc.)
          still scroll their content. Pages that need fixed-height
          internal scroll (AtlasChatView → message list) can still set
          `h-full flex flex-col` on their root and an inner
          `flex-1 overflow-y-auto` — the dual-scroll plays nicely
          because the inner container consumes wheel events first. */}
      <main className="flex-1 overflow-y-auto rounded-xl bg-atlas-bg-panel shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.06),0_24px_64px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.4)] dark:ring-white/[0.06]">
        {children}
      </main>
      <KeyboardHelpOverlay open={kbd.helpOpen} onClose={kbd.closeHelp} />
      {/* Sprint 5b (2026-05-18) — Cmd+K Quick-Switcher (Linear-style) */}
      <CommandPalette />
    </div>
  );
}
