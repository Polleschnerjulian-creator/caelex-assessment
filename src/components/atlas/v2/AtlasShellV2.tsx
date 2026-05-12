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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 dark:bg-[#212121] dark:text-slate-100">
      <AtlasSidebar
        activeChatId={activeChatId}
        activeMandateId={activeMandateId}
      />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
