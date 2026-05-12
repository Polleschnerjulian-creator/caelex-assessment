"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — App Shell.
 *
 * Sidebar (256px) + Center (flex-1). Wraps every Atlas V2 page.
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

  /* Resolve active chat-id and mandate-id from the current URL so the
     sidebar can highlight the corresponding row. */
  const { activeChatId, activeMandateId } = useMemo(() => {
    const chatMatch = pathname.match(/^\/atlas\/chat\/([^/]+)/);
    const mandateMatch = pathname.match(/^\/atlas\/mandate\/([^/]+)/);
    return {
      activeChatId: chatMatch?.[1] ?? null,
      activeMandateId: mandateMatch?.[1] ?? null,
    };
  }, [pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <AtlasSidebar
        activeChatId={activeChatId}
        activeMandateId={activeMandateId}
      />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
