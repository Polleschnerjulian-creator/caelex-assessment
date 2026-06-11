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

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  Bell,
  Bot,
  Briefcase,
  EyeOff,
  FileDiff,
  FileOutput,
  Folder as FolderIcon,
  StickyNote,
  MessageSquare,
  PenSquare,
  Scale,
  Settings,
  Search,
  HelpCircle,
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
/* localStorage key for the collapsed-state of the "Werkzeuge" section. */
const TOOLS_COLLAPSED_KEY = "atlas-v2-sidebar-tools-collapsed";

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
  /* Sprint 19b (2026-05-19) — auto-hide scrollbar.
     User-request: scrollbar nur sichtbar in den ersten paar sekunden
     nach mount + wenn user scrollt, sonst ausgeblendet. Ref hängt an
     der scroll-container-div weiter unten; CSS lebt in globals.css
     (.atlas-scrollbar-autohide + [data-scroll-active] attribute). */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    let hideTimer: number | undefined;
    const showScrollbar = () => {
      el.setAttribute("data-scroll-active", "true");
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        el.setAttribute("data-scroll-active", "false");
      }, 1500);
    };
    /* Initial mount — show for 2s so user clocks that scrolling is
       available, then fade away. */
    el.setAttribute("data-scroll-active", "true");
    hideTimer = window.setTimeout(() => {
      el.setAttribute("data-scroll-active", "false");
    }, 2000);
    el.addEventListener("scroll", showScrollbar, { passive: true });
    return () => {
      el.removeEventListener("scroll", showScrollbar);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);
  /* Lawyer name + tier displayed in the bottom user-pill. Fetched
     post-mount from /api/atlas/auth/me so SSR doesn't have to wait. */
  const [meName, setMeName] = useState<string>("");
  const [meTier, setMeTier] = useState<string | undefined>(undefined);

  /* 2026-06-11 — unread-badge for the Benachrichtigungen footer link.
     ONE lightweight fetch on mount (limit=1 — the endpoint computes
     unreadCount independently of limit), NO polling. Best-effort: a
     failed fetch simply renders the link without a counter. */
  const [alertsUnread, setAlertsUnread] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/atlas/alerts/notifications?limit=1", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { unreadCount?: number };
        if (!cancelled) setAlertsUnread(data.unreadCount ?? 0);
      } catch {
        /* swallow — badge is a nicety, never an error surface */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* 2026-06-11 — "Werkzeuge" collapse-state, persisted per browser so
     a lawyer who tucks the section away keeps it tucked. Read post-
     mount (not in the useState initializer) to stay hydration-safe. */
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(TOOLS_COLLAPSED_KEY) === "1") {
        setToolsCollapsed(true);
      }
    } catch {
      /* localStorage unavailable (private mode) — default expanded */
    }
  }, []);
  const toggleToolsCollapsed = () => {
    setToolsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(TOOLS_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* non-fatal */
      }
      return next;
    });
  };

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

  /* AUDIT-FIX 2026-05-17: refetch BOTH chats AND mandates when surfaces
     dispatch the "atlas-v2-sidebar-refresh" event. Previously the sidebar
     only listened for "atlas:chats-refresh" (chats-only) — every mandate
     mutation (CreateMandateForm, MandateDetailView, ChatInput, etc.)
     dispatched a different event that the sidebar ignored. Result: new
     mandates didn't appear, archived mandates didn't disappear until
     page reload. Now both lists stay in sync. */
  useEffect(() => {
    const onRefresh = async () => {
      try {
        const [chatsRes, mandatesRes] = await Promise.all([
          fetch("/api/atlas/chat", { cache: "no-store" }),
          fetch("/api/atlas/mandate", { cache: "no-store" }),
        ]);
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
      } catch {
        /* swallow — best-effort refresh */
      }
    };
    window.addEventListener("atlas-v2-sidebar-refresh", onRefresh);
    return () =>
      window.removeEventListener("atlas-v2-sidebar-refresh", onRefresh);
  }, []);

  /* Filter + bucket the chats. Search is case-insensitive substring
     match on the title (which is now AI-generated post-D2/Sprint-E,
     so titles are 3-5 word summaries instead of raw user input).
     `overflowCount` tracks how many chats were dropped by the per-bucket
     DOM cap so we can show a subtle hint row when the cap fires. */
  const { bucketedChats, overflowCount } = useMemo(() => {
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
    const overflow: Record<ChatBucket, number> = {
      Heute: 0,
      Gestern: 0,
      "Letzte 7 Tage": 0,
      Älter: 0,
    };
    for (const c of filtered) {
      const b = bucketFor(c.updatedAt ?? c.createdAt);
      if (byBucket[b].length < MAX_CHATS_PER_BUCKET) {
        byBucket[b].push(c);
      } else {
        overflow[b]++;
      }
    }
    return { bucketedChats: byBucket, overflowCount: overflow };
  }, [chats, searchQuery]);

  const handleNewChat = () => {
    router.push("/atlas");
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Top: Wordmark + Search ──────────────────────────────── */}
      <div className="flex flex-col gap-3 px-3 pt-4 pb-2">
        <div className="flex items-center justify-between px-1">
          <span className="inline-flex items-center gap-2" aria-label="Atlas">
            <Image
              src="/brand/atlas-icon.png"
              alt=""
              width={24}
              height={24}
              priority
              /* Logo is solid black on transparent; invert to white in
                 dark mode so it reads on the dark sidebar panel. */
              className="h-6 w-6 shrink-0 object-contain dark:invert"
            />
            <span className="text-[20px] font-medium tracking-tight text-atlas-text-primary [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
              Atlas
            </span>
          </span>
        </div>
        <SidebarSearchBox value={searchQuery} onChange={setSearchQuery} />
        <NewChatPill onClick={handleNewChat} />
      </div>

      {/* ── Scrollable middle ─────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="atlas-scrollbar-autohide flex-1 overflow-y-auto pb-2"
      >
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
          {/* Sprint 18 (2026-05-19) — Wissensbasis + Datenbank zu EINEM
              Eintrag "Suche" zusammengefasst (user-feedback: "warum gibt
              es zwei? ich will eine wie bei v1"). Die Suche durchsucht
              jetzt beide quellen parallel (knowledge-base via embeddings
              + legal-sources via text-match). Die alten URLs bleiben für
              power-user erreichbar via direct-link am footer der search-
              seite (snippet hinzufügen + sources durchstöbern). */}
          <SidebarItem
            href="/atlas/search"
            icon={<Search size={14} />}
            label="Suche"
            active={
              pathname?.startsWith("/atlas/search") ||
              pathname?.startsWith("/atlas/knowledge") ||
              pathname?.startsWith("/atlas/sources") ||
              false
            }
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
            const overflow = overflowCount[bucket];
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
                {overflow > 0 && (
                  <div className="px-3 py-1 text-[11px] text-atlas-text-muted">
                    … +{overflow} weitere (suchen)
                  </div>
                )}
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
        {/* AUDIT-FIX M08 (2026-05-17): show empty-state CTA for
            mandate section too. Previously the section was hidden when
            mandates.length === 0 — first-time users had no path to
            create a mandate from the sidebar. */}
        {!loading && (
          <SidebarSection label="Mandate">
            {mandates.length === 0 ? (
              <SidebarItem
                href="/atlas/mandate/new"
                icon={<Briefcase size={13} />}
                label="Erstes Mandat anlegen"
              />
            ) : (
              <>
                {mandates.slice(0, MAX_MANDATES_INLINE).map((m) => (
                  <SidebarItem
                    key={m.id}
                    href={`/atlas/mandate/${m.id}`}
                    icon={<Briefcase size={13} />}
                    label={m.name}
                    active={activeMandateId === m.id}
                    /* Sprint 6a (2026-05-18) — Status-Dot.
                       Visual indicator: emerald = active, amber =
                       wartend (pending action), slate = archived/closed.
                       Helps the lawyer scan workload state at a glance. */
                    rightAction={<MandateStatusDot status={m.status} />}
                    alwaysVisibleRightAction
                  />
                ))}
                {mandates.length > MAX_MANDATES_INLINE && (
                  <SidebarItem
                    href="/atlas/mandate"
                    label={`Alle ${mandates.length} anzeigen →`}
                  />
                )}
              </>
            )}
          </SidebarSection>
        )}

        {/* Sprint 19d (2026-05-19) — komplette "Korpus"-section entfernt.
            User-request: "workflows und klauseln bitte noch aus dem menü
            streichen als punkte". Die routen /atlas/workflows und
            /atlas/clauses bleiben erreichbar (direkter URL-aufruf,
            command-palette, etc.) — nur die sidebar-einträge sind weg
            um die menü-fläche aufgeräumter zu halten.

            2026-06-11 — "Werkzeuge" als KOLLABIERBARE Sektion ergänzt:
            sechs bislang nur per Direkt-URL erreichbare Produktflächen
            (Drafting, Agent, Redline, Anonymisieren, Rechtsprechung,
            DATEV) werden sichtbar. Workflows + Klauseln bleiben bewusst
            draußen (siehe 19d oben) und leben weiter in der Command-
            Palette. Collapse-State persistiert via localStorage, damit
            die aufgeräumte Menü-Fläche eine User-Entscheidung bleibt. */}
        <SidebarSection
          label="Werkzeuge"
          collapsible
          collapsed={toolsCollapsed}
          onToggleCollapsed={toggleToolsCollapsed}
        >
          <SidebarItem
            href="/atlas/drafting"
            icon={<PenSquare size={13} />}
            label="Drafting Studio"
            active={pathname?.startsWith("/atlas/drafting") ?? false}
          />
          <SidebarItem
            href="/atlas/agent"
            icon={<Bot size={13} />}
            label="Agent"
            active={pathname?.startsWith("/atlas/agent") ?? false}
          />
          <SidebarItem
            href="/atlas/tools/redline"
            icon={<FileDiff size={13} />}
            label="Redline"
            active={pathname?.startsWith("/atlas/tools/redline") ?? false}
          />
          <SidebarItem
            href="/atlas/tools/anonymize"
            icon={<EyeOff size={13} />}
            label="Anonymisieren"
            active={pathname?.startsWith("/atlas/tools/anonymize") ?? false}
          />
          <SidebarItem
            href="/atlas/cases"
            icon={<Scale size={13} />}
            label="Rechtsprechung"
            active={pathname?.startsWith("/atlas/cases") ?? false}
          />
          <SidebarItem
            href="/atlas/exports/datev"
            icon={<FileOutput size={13} />}
            label="DATEV-Export"
            active={pathname?.startsWith("/atlas/exports/datev") ?? false}
          />
        </SidebarSection>
      </div>

      {/* ── Bottom: Alerts + Tour-Trigger + Settings link + UserPill ── */}
      <div className="border-t border-atlas-border-subtle px-3 pt-2 pb-3">
        {/* 2026-06-11 — Glocke → /atlas/alerts. Die Alerts-Seite war
            bislang nur per Direkt-URL erreichbar. Unread-Count kommt
            aus EINEM fetch beim Mount (kein Polling, siehe oben). */}
        <SidebarItem
          href="/atlas/alerts"
          icon={<Bell size={13} />}
          label="Benachrichtigungen"
          active={pathname?.startsWith("/atlas/alerts") ?? false}
          rightAction={
            alertsUnread > 0 ? (
              <span
                aria-label={`${alertsUnread} ungelesene Benachrichtigungen`}
                className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500/15 px-1 text-[10px] font-medium tabular-nums text-amber-600 dark:text-amber-400"
              >
                {alertsUnread > 99 ? "99+" : alertsUnread}
              </span>
            ) : undefined
          }
          alwaysVisibleRightAction
        />
        {/* Sprint 19 (2026-05-19) — "Tour öffnen" trigger.
            User-request: "Wir brauchen ein supergutes Onboarding, was
            auch immer wieder aufrufbar sein soll. Einfach so 'n
            kleinen Symbol im Leistmenü." — also wichtig: die Tour
            muss für die v1→v2-Umstellung der Anwälte JEDERZEIT
            aufrufbar sein, nicht nur beim ersten Login. Dispatcht
            `atlas-v2-open-tour` — OnboardingTour.tsx hört darauf
            (siehe useEffect dort). */}
        <SidebarItem
          icon={<HelpCircle size={13} />}
          label="Tour öffnen"
          onClick={() => {
            window.dispatchEvent(new Event("atlas-v2-open-tour"));
          }}
        />
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

/* Sprint 6a (2026-05-18) — Status-Dot für Mandat-Sidebar-Items.
   active   → emerald (laufendes Mandat)
   pending  → amber   (wartet auf Bescheid / Termin / Frist)
   closed   → slate   (abgeschlossen — bleibt sichtbar zum Nachlesen)
   archived → slate-300 dünner (langfristig weg)
   Visible on hover (matches the rightAction opacity-0/100 pattern). */
function MandateStatusDot({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.active;
  return (
    <span
      aria-label={`Status: ${meta.label}`}
      title={`Status: ${meta.label}`}
      className={`inline-block h-2 w-2 rounded-full ${meta.color}`}
    />
  );
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "bg-emerald-500" },
  pending: { label: "Wartend", color: "bg-amber-500" },
  closed: { label: "Abgeschlossen", color: "bg-slate-400" },
  archived: {
    label: "Archiviert",
    color: "bg-slate-300 dark:bg-slate-600",
  },
};
