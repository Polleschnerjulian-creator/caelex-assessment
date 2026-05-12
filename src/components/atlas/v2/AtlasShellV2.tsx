"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — App Shell (UI refresh 2026-05-12).
 *
 * Sidebar + Center. ChatGPT-tone backgrounds: sidebar slightly darker
 * (#171717) than main canvas (#212121). No hard separator — the tone
 * difference does the visual divide.
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#212121] text-slate-100">
      <AtlasSidebar
        activeChatId={activeChatId}
        activeMandateId={activeMandateId}
      />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
