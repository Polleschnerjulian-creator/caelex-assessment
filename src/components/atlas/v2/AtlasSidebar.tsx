"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Sidebar (REDESIGN 2026-05-17, Claude-Code-inspired).
 *
 * Replaces the prior 940-LOC Linear-style sidebar with a slim flat-list
 * composition built from atomic components (SidebarItem, SidebarSection,
 * SidebarUserPill, SidebarSearchBox, NewChatPill).
 *
 * Visual model: floating-panel (parent wraps in rounded-xl + shadow),
 * pure-monochrome background (no navy, no emerald CTAs), amber-dot
 * active-state, 4px hit-area indicators on left edge of selected row.
 *
 * Cut from prior version for the redesign:
 *   - sidebar collapse toggle (always-open, fixed 260px width)
 *   - mobile overlay mode (desktop-first for v1)
 *   - per-bucket "show 16, expand more" cap (now: show all chats
 *     post-search-filter, hard-cap 100)
 *   - emerald active accent (replaced with amber-dot via SidebarItem)
 *   - inline theme toggle button (now lives in SidebarUserPill)
 *
 * Keeps the same Props signature so AtlasShellV2 keeps importing
 * `<AtlasSidebar>` without changes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Briefcase,
  Folder as FolderIcon,
  StickyNote,
  Brain,
  Cpu,
  MessageSquare,
  Library,
  ArrowLeftRight,
  ScrollText,
  Settings,
} from "lucide-react";
import type { ChatListItem, MandateListItem } from "./types";
import { SidebarItem } from "./sidebar/SidebarItem";
import { SidebarSection } from "./sidebar/SidebarSection";
import { SidebarSearchBox } from "./sidebar/SidebarSearchBox";
import { SidebarUserPill } from "./sidebar/SidebarUserPill";
import { NewChatPill } from "./sidebar/NewChatPill";

interface Props {
  activeChatId?: string | null;
  activeMandateId?: string | null;
}

/* Hard cap on rendered chats per bucket — prevents the DOM from
   ballooning when a power-user has 500+ chats. Beyond this, the
   search box is the discovery path. */
const MAX_CHATS_PER_BUCKET = 30;
/* Hard cap on rendered mandates in sidebar — full list lives on
   /atlas/mandate page. */
const MAX_MANDATES_INLINE = 5;

type ChatBucket = "Heute" | "Gestern" | "Letzte 7 Tage" | "Älter";

function bucketFor(iso: string): ChatBucket {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Heute";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  )
    return "Gestern";
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  if (d >= sevenDaysAgo) return "Letzte 7 Tage";
  return "Älter";
}

const BUCKET_ORDER: ChatBucket[] = [
  "Heute",
  "Gestern",
  "Letzte 7 Tage",
  "Älter",
];

export function AtlasSidebar({ activeChatId, activeMandateId }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [mandates, setMandates] = useState<MandateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  /* Lawyer name + tier displayed in the bottom user-pill. Fetched
     post-mount from /api/atlas/auth/me so SSR doesn't have to wait. */
  const [meName, setMeName] = useState<string>("");
  const [meTier, setMeTier] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [chatsRes, mandatesRes, meRes] = await Promise.all([
          fetch("/api/atlas/chat", { cache: "no-store" }),
          fetch("/api/atlas/mandate", { cache: "no-store" }),
          fetch("/api/atlas/auth/me", { cache: "no-store" }).catch(() => null),
        ]);
        if (cancelled) return;
        if (chatsRes.ok) {
          const data = (await chatsRes.json()) as { chats: ChatListItem[] };
          setChats(data.chats ?? []);
        }
        if (mandatesRes.ok) {
          const data = (await mandatesRes.json()) as {
            mandates: MandateListItem[];
          };
          setMandates(data.mandates ?? []);
        }
        if (meRes && meRes.ok) {
          const data = (await meRes.json()) as {
            name?: string;
            tier?: string;
          };
          setMeName(data.name ?? "");
          setMeTier(data.tier);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Listen for the project-wide "atlas:chats-refresh" event so the
     sidebar refetches when a new chat is created in the main view
     (the existing chat creation flow dispatches this event). */
  useEffect(() => {
    const onRefresh = async () => {
      try {
        const res = await fetch("/api/atlas/chat", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { chats: ChatListItem[] };
          setChats(data.chats ?? []);
        }
      } catch {
        /* swallow — best-effort refresh */
      }
    };
    window.addEventListener("atlas:chats-refresh", onRefresh);
    return () => window.removeEventListener("atlas:chats-refresh", onRefresh);
  }, []);

  /* Filter + bucket the chats. Search is case-insensitive substring
     match on the title (which is now AI-generated post-D2/Sprint-E,
     so titles are 3-5 word summaries instead of raw user input). */
  const bucketedChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? chats.filter((c) => (c.title ?? "").toLowerCase().includes(q))
      : chats;
    const byBucket: Record<ChatBucket, ChatListItem[]> = {
      Heute: [],
      Gestern: [],
      "Letzte 7 Tage": [],
      Älter: [],
    };
    for (const c of filtered) {
      const b = bucketFor(c.updatedAt ?? c.createdAt);
      if (byBucket[b].length < MAX_CHATS_PER_BUCKET) byBucket[b].push(c);
    }
    return byBucket;
  }, [chats, searchQuery]);

  const handleNewChat = () => {
    router.push("/atlas");
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Top: Wordmark + Search ──────────────────────────────── */}
      <div className="flex flex-col gap-3 px-3 pt-4 pb-2">
        <div className="flex items-center justify-between px-1">
          <span
            className="text-[20px] font-medium tracking-tight text-atlas-text-primary [font-family:ui-serif,Georgia,'Cambria_Style',serif]"
            aria-label="Atlas"
          >
            Atlas
          </span>
        </div>
        <SidebarSearchBox value={searchQuery} onChange={setSearchQuery} />
        <NewChatPill onClick={handleNewChat} />
      </div>

      {/* ── Scrollable middle ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-2">
        {/* Primary nav — no section header, just the 5 main destinations */}
        <SidebarSection label="" hideLabel>
          <SidebarItem
            href="/atlas/mandate"
            icon={<Briefcase size={14} />}
            label="Mandate"
            active={pathname?.startsWith("/atlas/mandate") ?? false}
          />
          <SidebarItem
            href="/atlas/vault"
            icon={<FolderIcon size={14} />}
            label="Vault"
            active={pathname?.startsWith("/atlas/vault") ?? false}
          />
          <SidebarItem
            href="/atlas/notes"
            icon={<StickyNote size={14} />}
            label="Notizen"
            active={pathname?.startsWith("/atlas/notes") ?? false}
          />
          <SidebarItem
            href="/atlas/knowledge"
            icon={<Brain size={14} />}
            label="Wissensbasis"
            active={pathname?.startsWith("/atlas/knowledge") ?? false}
          />
          <SidebarItem
            href="/atlas/agent"
            icon={<Cpu size={14} />}
            label="Agent-Mode"
            active={pathname?.startsWith("/atlas/agent") ?? false}
          />
        </SidebarSection>

        {/* ── Chats — date-bucketed, search-filtered ─────────────── */}
        {loading ? (
          <SidebarSection label="Chats">
            <div className="px-3 py-1.5 text-[12px] text-atlas-text-muted">
              Lädt…
            </div>
          </SidebarSection>
        ) : (
          BUCKET_ORDER.map((bucket) => {
            const items = bucketedChats[bucket];
            if (items.length === 0) return null;
            return (
              <SidebarSection key={bucket} label={bucket}>
                {items.map((c) => (
                  <SidebarItem
                    key={c.id}
                    href={`/atlas/chat/${c.id}`}
                    icon={<MessageSquare size={13} />}
                    label={c.title || "Unbenannter Chat"}
                    active={activeChatId === c.id}
                  />
                ))}
              </SidebarSection>
            );
          })
        )}

        {/* Search empty-state hint */}
        {searchQuery.trim() &&
          !loading &&
          BUCKET_ORDER.every((b) => bucketedChats[b].length === 0) && (
            <SidebarSection label="">
              <div className="px-3 py-2 text-[12px] text-atlas-text-muted">
                Keine Chats gefunden für „{searchQuery}"
              </div>
            </SidebarSection>
          )}

        {/* ── Mandate (top 5, link to full list) ─────────────────── */}
        {!loading && mandates.length > 0 && (
          <SidebarSection label="Mandate">
            {mandates.slice(0, MAX_MANDATES_INLINE).map((m) => (
              <SidebarItem
                key={m.id}
                href={`/atlas/mandate/${m.id}`}
                icon={<Briefcase size={13} />}
                label={m.name}
                active={activeMandateId === m.id}
              />
            ))}
            {mandates.length > MAX_MANDATES_INLINE && (
              <SidebarItem
                href="/atlas/mandate"
                label={`Alle ${mandates.length} anzeigen →`}
              />
            )}
          </SidebarSection>
        )}

        {/* ── Korpus (knowledge resources, secondary) ────────────── */}
        <SidebarSection label="Korpus">
          <SidebarItem
            href="/atlas/sources"
            icon={<Library size={13} />}
            label="Quellen"
            active={pathname === "/atlas/sources"}
          />
          <SidebarItem
            href="/atlas/workflows"
            icon={<ArrowLeftRight size={13} />}
            label="Workflows"
            active={pathname === "/atlas/workflows"}
          />
          <SidebarItem
            href="/atlas/clauses"
            icon={<ScrollText size={13} />}
            label="Klauseln"
            active={pathname === "/atlas/clauses"}
          />
        </SidebarSection>
      </div>

      {/* ── Bottom: Settings link + UserPill ─────────────────────── */}
      <div className="border-t border-atlas-border-subtle px-3 pt-2 pb-3">
        <SidebarItem
          href="/atlas/settings"
          icon={<Settings size={13} />}
          label="Einstellungen"
          active={pathname?.startsWith("/atlas/settings") ?? false}
        />
        <div className="mt-2">
          <SidebarUserPill
            name={meName || "Anwalt"}
            tier={meTier}
            onMenuOpen={() => {
              /* v1: settings is the catch-all menu. Future: open
                 a contextual ⋯ menu (rename chat / share / etc.). */
              router.push("/atlas/settings");
            }}
          />
        </div>
      </div>
    </div>
  );
}
