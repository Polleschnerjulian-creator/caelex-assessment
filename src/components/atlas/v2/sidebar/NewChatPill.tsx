"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 Sidebar redesign — "Neuer Chat" primary CTA pill.
 *
 * Used at the top of the sidebar. Restrained style (not a heavy
 * primary button) — bg-elevated, icon + label, hover-darken.
 * Optional kbd-hint rendered on the right (Cmd+Shift+O default).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

interface NewChatPillProps {
  onClick: () => void;
  label?: string;
  /** Show keyboard shortcut hint on the right. Default true. */
  showKbdHint?: boolean;
}

function detectMacPlatform(): boolean {
  if (typeof navigator === "undefined") return true;
  const navWithUaData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const sig =
    navWithUaData.userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent ??
    "";
  return /Mac|iPhone|iPad|iOS/i.test(sig);
}

export function NewChatPill({
  onClick,
  label = "Neuer Chat",
  showKbdHint = true,
}: NewChatPillProps) {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(detectMacPlatform());
  }, []);

  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2 rounded-md bg-atlas-bg-elevated px-3 py-2 text-[13px] text-atlas-text-primary transition-colors hover:bg-atlas-bg-subtle"
    >
      <Plus
        size={13}
        className="text-atlas-text-secondary group-hover:text-atlas-text-primary"
      />
      <span className="flex-1 text-left">{label}</span>
      {showKbdHint && (
        <span className="flex shrink-0 items-center gap-0.5">
          <kbd className="rounded border border-atlas-border-subtle bg-atlas-bg-panel px-1 py-px text-[9.5px] text-atlas-text-muted">
            {modKey}
          </kbd>
          <kbd className="rounded border border-atlas-border-subtle bg-atlas-bg-panel px-1 py-px text-[9.5px] text-atlas-text-muted">
            ⇧
          </kbd>
          <kbd className="rounded border border-atlas-border-subtle bg-atlas-bg-panel px-1 py-px text-[9.5px] text-atlas-text-muted">
            O
          </kbd>
        </span>
      )}
    </button>
  );
}
