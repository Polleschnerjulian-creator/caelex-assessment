"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — App Shell (UI refresh 2026-05-12).
 *
 * Sidebar + Center. ChatGPT-tone backgrounds, theme-aware:
 *   - Light (default): canvas #ffffff, sidebar #f9f9f9
 *   - Dark:            canvas #212121, sidebar #171717
 * No hard separator — the tone difference does the visual divide.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { AtlasSidebar } from "./AtlasSidebar";
import { KeyboardHelpOverlay } from "./KeyboardHelpOverlay";
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
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 dark:bg-[#212121] dark:text-slate-100">
      <AtlasSidebar
        activeChatId={activeChatId}
        activeMandateId={activeMandateId}
      />
      {/* `overflow-y-auto` (not `overflow-hidden`) so sub-pages that
          don't bring their own scroll container (CreateMandateForm,
          /atlas/clauses, /atlas/workflows, /atlas/settings/*, etc.)
          still scroll their content. Pages that need fixed-height
          internal scroll (AtlasChatView → message list) can still set
          `h-full flex flex-col` on their root and an inner
          `flex-1 overflow-y-auto` — the dual-scroll plays nicely
          because the inner container consumes wheel events first. */}
      <main className="flex-1 overflow-y-auto">{children}</main>
      <KeyboardHelpOverlay open={kbd.helpOpen} onClose={kbd.closeHelp} />
    </div>
  );
}
