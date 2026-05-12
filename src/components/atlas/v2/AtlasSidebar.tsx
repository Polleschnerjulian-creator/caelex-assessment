"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Sidebar (UI refresh 2026-05-12, theme-aware).
 *
 * ChatGPT-style restraint:
 *   - No hard border-r — soft separation via background only
 *   - Section labels in title-case (not aggressive uppercase)
 *   - No emerald active-states — subtle slate on near-white in light,
 *     subtle white on near-black in dark
 *   - More padding, less density
 *   - Plus-icon "Neuer Chat" button matches ChatGPT
 *   - Footer carries the theme toggle (Sun/Moon)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Briefcase,
  Library,
  Gavel,
  ScrollText,
  Landmark,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Loader2,
  Library as LibraryIcon,
  Folder as FolderIcon,
  StickyNote,
  Shield as ShieldIcon,
  ArrowLeftRight,
  PenLine,
} from "lucide-react";
import type { ChatListItem, MandateListItem } from "./types";
import { useAtlasTheme } from "@/app/(atlas)/atlas/_components/AtlasThemeProvider";
import { MandateContextSection } from "./MandateContextSection";
import { AtlasLogo, AtlasMark } from "./AtlasLogo";

interface Props {
  activeChatId?: string | null;
  activeMandateId?: string | null;
}

function bucket(iso: string): "Heute" | "Gestern" | "Letzte 7 Tage" | "Älter" {
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

export function AtlasSidebar({ activeChatId, activeMandateId }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [mandates, setMandates] = useState<MandateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  /* Per-bucket "show all" toggle. Each bucket initially renders up to
     16 entries; clicking "+ N weitere" adds the bucket name here to
     reveal the full list. Resets to default-collapsed when the chat
     list refetches (refresh event). */
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(
    new Set(),
  );
  /* Mobile detection — drives whether the expanded sidebar renders
     as an overlay (covering content + backdrop) or as a flex sibling
     (pushing content). Set post-hydration to avoid SSR mismatch. */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setIsMobile(mq.matches);
      /* On first detect, also collapse so mobile users don't see the
         260px sidebar squashing their chat content. They explicitly
         tap to open the overlay. */
      if (mq.matches) setCollapsed(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [chatRes, mandateRes] = await Promise.all([
        fetch("/api/atlas/chat", { cache: "no-store" }),
        fetch("/api/atlas/mandate", { cache: "no-store" }),
      ]);
      const chatData = chatRes.ok
        ? ((await chatRes.json()) as { chats: ChatListItem[] })
        : { chats: [] };
      const mandateData = mandateRes.ok
        ? ((await mandateRes.json()) as { mandates: MandateListItem[] })
        : { mandates: [] };
      setChats(chatData.chats ?? []);
      setMandates(mandateData.mandates ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const refreshHandler = () => void refresh();
    /* ⌘\ via the keyboard-shortcuts hook fires `atlas-v2-sidebar-
       toggle`. We respond by flipping the local collapsed state. */
    const toggleHandler = () => setCollapsed((v) => !v);
    window.addEventListener("atlas-v2-sidebar-refresh", refreshHandler);
    window.addEventListener("atlas-v2-sidebar-toggle", toggleHandler);
    return () => {
      window.removeEventListener("atlas-v2-sidebar-refresh", refreshHandler);
      window.removeEventListener("atlas-v2-sidebar-toggle", toggleHandler);
    };
  }, [refresh, pathname]);

  const grouped = chats.reduce<Record<string, ChatListItem[]>>((acc, c) => {
    const b = bucket(c.updatedAt);
    if (!acc[b]) acc[b] = [];
    acc[b].push(c);
    return acc;
  }, {});
  const order: Array<keyof typeof grouped> = [
    "Heute",
    "Gestern",
    "Letzte 7 Tage",
    "Älter",
  ];

  if (collapsed) {
    return (
      <aside className="flex h-full w-12 shrink-0 flex-col items-center gap-3 bg-[#f9f9f9] py-3 text-slate-600 dark:bg-[#171717] dark:text-slate-300">
        {/* Atlas brand mark — clicking it lands on the homepage so the
            mark doubles as a "home" affordance. Same UX as Claude's
            sidebar logo + ChatGPT's top-left brand.

            Button auto-widens (no w-8 constraint) because AtlasMark
            renders at 3:1 aspect — at size=10 that's a 30×10 strip
            which fits the 48 px collapsed-rail with margin. */}
        <button
          type="button"
          onClick={() => router.push("/atlas")}
          title="Atlas — zur Startseite"
          aria-label="Atlas"
          className="flex h-7 items-center justify-center rounded-md px-1.5 text-slate-900 transition-colors hover:bg-black/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.05]"
        >
          <AtlasMark size={10} />
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Sidebar einblenden"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100"
        >
          <PanelLeftOpen size={16} />
        </button>
        <button
          type="button"
          onClick={() => router.push("/atlas")}
          title="Neuer Chat"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100"
        >
          <Plus size={16} />
        </button>
        <div className="flex-1" />
        <ThemeToggleButton compact />
      </aside>
    );
  }

  return (
    <>
      {/* Mobile backdrop — only renders when expanded on mobile.
          Tap closes the sidebar back to collapsed-rail. */}
      {isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
          onClick={() => setCollapsed(true)}
          aria-label="Sidebar schließen"
        />
      )}
      <aside
        className={`flex h-full w-[260px] shrink-0 flex-col bg-[#f9f9f9] text-slate-700 dark:bg-[#171717] dark:text-slate-200 ${
          isMobile
            ? "fixed inset-y-0 left-0 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.18)]"
            : ""
        }`}
      >
        {/* Top row — brand left, collapse-toggle right. Mirrors
            Claude.ai's sidebar layout (logo+wordmark anchors the
            user, collapse-button stays at the corner where the
            sidebar's visual edge meets the chat content). The "+
            Neuer Chat" affordance moved one row down into the
            primary-actions section so the brand row stays clean. */}
        <div className="flex items-center justify-between gap-1 px-3 pt-3">
          <button
            type="button"
            onClick={() => router.push("/atlas")}
            title="Atlas — zur Startseite"
            className="flex h-8 items-center gap-2 rounded-md px-1.5 text-slate-900 transition-colors hover:bg-black/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.05]"
          >
            {/* size=14 height → ~42 px wide mark. With 8 px gap +
                Atlas-wordmark (~38 px), total ~88 px. Fits 260 px
                sidebar with the collapse-toggle still visible right. */}
            <AtlasLogo size={14} withWordmark />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Sidebar ausblenden"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {/* Search — live chat-search powered by /api/atlas/search. */}
        <div className="px-3 pt-2 pb-3">
          <SidebarSearch />
        </div>

        {/* Primary actions */}
        <div className="px-2 pb-2">
          <SidebarItem
            href="/atlas"
            label="Neuer Chat"
            icon={<Plus size={14} />}
            active={pathname === "/atlas"}
          />
          <SidebarItem
            href="/atlas/mandate/new"
            label="Neues Mandat"
            icon={<Briefcase size={14} />}
            active={pathname === "/atlas/mandate/new"}
          />
          {/* Vault — top-level access to every mandate file the user
              has access to. Lawyers think in "documents" first, the
              vault treats all docs as one searchable pile. */}
          <SidebarItem
            href="/atlas/vault"
            label="Vault"
            icon={<FolderIcon size={14} />}
            active={pathname === "/atlas/vault"}
          />
          <SidebarItem
            href="/atlas/notes"
            label="Notizen"
            icon={<StickyNote size={14} />}
            active={pathname === "/atlas/notes"}
          />
          <SidebarItem
            href="/atlas/draft"
            label="Drafting Canvas"
            icon={<PenLine size={14} />}
            active={pathname === "/atlas/draft"}
          />
        </div>

        {/* Active mandate context — resolves from the URL path
            (mandate detail page) OR from the active chat's mandateId
            (sidebar lookup against the loaded chats list). When
            present, surfaces the mandate's vault + deadlines inline
            so the lawyer doesn't have to leave the chat. */}
        {(() => {
          const fromPath = activeMandateId;
          const fromChat = activeChatId
            ? (chats.find((c) => c.id === activeChatId)?.mandateId ?? null)
            : null;
          const mandateToShow = fromPath ?? fromChat;
          return mandateToShow ? (
            <MandateContextSection mandateId={mandateToShow} />
          ) : null;
        })()}

        {/* Scrollable middle */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {/* CHATS */}
          <Section label="Chats">
            {loading && chats.length === 0 ? (
              <ChatListSkeleton />
            ) : chats.length === 0 ? (
              <Empty>Noch keine Chats.</Empty>
            ) : (
              order.map((b) => {
                const bucketChats = grouped[b];
                if (!bucketChats || bucketChats.length === 0) return null;
                const expanded = expandedBuckets.has(b as string);
                const visible = expanded
                  ? bucketChats
                  : bucketChats.slice(0, 16);
                const remaining = bucketChats.length - visible.length;
                return (
                  <div key={b} className="mb-1">
                    <div className="px-3 pb-1 pt-2 text-[11px] text-slate-500">
                      {b}
                    </div>
                    {visible.map((c) => {
                      const active = c.id === activeChatId;
                      return (
                        <Link
                          key={c.id}
                          href={`/atlas/chat/${c.id}`}
                          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] transition-colors ${
                            active
                              ? "bg-black/[0.06] text-slate-900 dark:bg-white/[0.06] dark:text-slate-100"
                              : "text-slate-700 hover:bg-black/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.03]"
                          }`}
                        >
                          <MessageSquare
                            size={12}
                            className="shrink-0 opacity-40"
                          />
                          <span className="line-clamp-1 flex-1">{c.title}</span>
                        </Link>
                      );
                    })}
                    {remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedBuckets((prev) => {
                            const next = new Set(prev);
                            next.add(b as string);
                            return next;
                          });
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-1 text-[11.5px] text-slate-500 transition-colors hover:bg-black/[0.04] hover:text-slate-800 dark:hover:bg-white/[0.03] dark:hover:text-slate-300"
                      >
                        <span className="opacity-40">+</span>
                        <span>{remaining} weitere</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </Section>

          {/* MANDATE */}
          <Section label="Mandate">
            {mandates.length === 0 ? (
              <Empty>Noch keine Mandate.</Empty>
            ) : (
              mandates.slice(0, 14).map((m) => {
                const active = m.id === activeMandateId;
                return (
                  <Link
                    key={m.id}
                    href={`/atlas/mandate/${m.id}`}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] transition-colors ${
                      active
                        ? "bg-black/[0.06] text-slate-900 dark:bg-white/[0.06] dark:text-slate-100"
                        : "text-slate-700 hover:bg-black/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <Briefcase size={12} className="shrink-0 opacity-40" />
                    <span className="line-clamp-1 flex-1">{m.name}</span>
                    {m._count.chats > 0 && (
                      <span className="shrink-0 text-[11px] text-slate-500">
                        {m._count.chats}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </Section>

          {/* KORPUS */}
          <Section label="Korpus">
            <NavLink
              href="/atlas/sources"
              label="Sources"
              icon={<Library size={12} />}
              active={pathname === "/atlas/sources"}
            />
            <NavLink
              href="/atlas/cases"
              label="Cases"
              icon={<Gavel size={12} />}
              active={pathname === "/atlas/cases"}
            />
            <NavLink
              href="/atlas/treaties"
              label="Treaties"
              icon={<ScrollText size={12} />}
              active={pathname === "/atlas/treaties"}
            />
            <NavLink
              href="/atlas/jurisdictions"
              label="Jurisdiktionen"
              icon={<Landmark size={12} />}
              active={pathname === "/atlas/jurisdictions"}
            />
            <NavLink
              href="/atlas/workflows"
              label="Workflows"
              icon={<MessageSquare size={12} />}
              active={pathname === "/atlas/workflows"}
            />
            <NavLink
              href="/atlas/clauses"
              label="Klauseln"
              icon={<LibraryIcon size={12} />}
              active={pathname === "/atlas/clauses"}
            />
            <NavLink
              href="/atlas/tools/anonymize"
              label="Anonymisierung"
              icon={<ShieldIcon size={12} />}
              active={pathname === "/atlas/tools/anonymize"}
            />
            <NavLink
              href="/atlas/tools/redline"
              label="Redline"
              icon={<ArrowLeftRight size={12} />}
              active={pathname === "/atlas/tools/redline"}
            />
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1 border-t border-black/[0.05] px-2 py-2 dark:border-white/[0.05]">
          <div className="flex-1">
            <NavLink
              href="/atlas/settings"
              label="Einstellungen"
              icon={<Settings size={12} />}
              active={pathname === "/atlas/settings"}
            />
          </div>
          <ThemeToggleButton />
        </div>
      </aside>
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="px-3 pb-1 pt-3 text-[11px] font-medium text-slate-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function SidebarItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13.5px] transition-colors ${
        active
          ? "bg-black/[0.06] text-slate-900 dark:bg-white/[0.06] dark:text-slate-100"
          : "text-slate-700 hover:bg-black/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.03]"
      }`}
    >
      <span className="shrink-0 opacity-50">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] transition-colors ${
        active
          ? "bg-black/[0.06] text-slate-900 dark:bg-white/[0.06] dark:text-slate-100"
          : "text-slate-700 hover:bg-black/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.03]"
      }`}
    >
      <span className="shrink-0 opacity-50">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-1 text-[12px] text-slate-500">{children}</p>;
}

/**
 * Chat-search input + result dropdown. Live-fetches /api/atlas/search
 * with debounced 250ms keystrokes. Closes when the user clicks outside
 * or selects a result.
 *
 * Why we keep it inline in the sidebar (vs a full search-page): most
 * legal-AI use is "find that chat from last Tuesday about Spire" —
 * which is faster to satisfy with a sidebar dropdown than a full
 * search-results page. We can upgrade to ⌘K command-palette later
 * without breaking this baseline.
 */
function SidebarSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{
      id: string;
      title: string;
      updatedAt: string;
      mandateName: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Debounced search. 250ms is the ChatGPT/Linear sweet-spot — long
     enough to skip in-progress typing, short enough to feel live. */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/atlas/search?q=${encodeURIComponent(query.trim())}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as {
          results: typeof results;
        };
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  /* Click-outside closes the dropdown. */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[13px] dark:bg-white/[0.04]">
        <Search size={13} className="shrink-0 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Chats durchsuchen…"
          aria-label="Chats durchsuchen"
          className="w-full bg-transparent text-[13px] text-slate-800 outline-none focus-visible:outline-none placeholder:text-slate-500 dark:text-slate-200"
        />
        {loading && (
          <Loader2 size={11} className="shrink-0 animate-spin text-slate-400" />
        )}
      </div>
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[320px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.10)] dark:border-white/[0.08] dark:bg-[#1f1f1f] dark:shadow-[0_8px_24px_rgba(0,0,0,0.40)]">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-slate-500">
              {loading ? "Sucht…" : "Keine Treffer."}
            </p>
          ) : (
            results.map((r) => (
              <Link
                key={r.id}
                href={`/atlas/chat/${r.id}`}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className="block rounded-md px-2.5 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.05]"
              >
                <div className="line-clamp-1">{r.title}</div>
                {r.mandateName && (
                  <div className="line-clamp-1 text-[10.5px] text-slate-500">
                    {r.mandateName}
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton placeholder for the chat list while loading. Renders the
 * same approximate vertical rhythm as a real chat row so the sidebar
 * doesn't visually jump when the data lands.
 */
function ChatListSkeleton() {
  return (
    <div aria-label="Chats werden geladen" className="space-y-1 px-2 pt-1">
      {[60, 75, 50, 65, 80].map((w, i) => (
        <div key={i} className="flex items-center gap-2 px-1 py-1.5">
          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-white/[0.06]" />
          <div
            className="h-2.5 animate-pulse rounded-full bg-slate-200 dark:bg-white/[0.06]"
            style={{ width: `${w}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Sun/Moon toggle. Sits in the sidebar footer (or vertically in the
 * collapsed rail). Reads + writes via AtlasThemeProvider so the choice
 * persists in localStorage.
 */
function ThemeToggleButton({ compact }: { compact?: boolean } = {}) {
  const { resolvedTheme, toggle } = useAtlasTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Heller Modus" : "Dunkler Modus"}
      aria-label={
        isDark ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln"
      }
      className={`flex h-8 ${compact ? "w-8" : "w-8"} shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100`}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
