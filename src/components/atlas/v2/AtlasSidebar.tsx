"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Sidebar.
 *
 * 4 sections, top to bottom:
 *   1. New chat button + new mandate button
 *   2. Recent chats (max 20, grouped by date bucket)
 *   3. Active mandates (max 12)
 *   4. Korpus browse (Sources / Cases / Treaties / Authorities)
 *   5. Settings link
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import type { ChatListItem, MandateListItem } from "./types";

interface Props {
  activeChatId?: string | null;
  activeMandateId?: string | null;
}

function bucket(iso: string): "Heute" | "Gestern" | "Diese Woche" | "Älter" {
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
  if (d >= sevenDaysAgo) return "Diese Woche";
  return "Älter";
}

export function AtlasSidebar({ activeChatId, activeMandateId }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [mandates, setMandates] = useState<MandateListItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    /* Listen for refresh events fired by the chat-view after a new
       chat lands so the sidebar updates without full page reload. */
    const handler = () => void refresh();
    window.addEventListener("atlas-v2-sidebar-refresh", handler);
    return () =>
      window.removeEventListener("atlas-v2-sidebar-refresh", handler);
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
    "Diese Woche",
    "Älter",
  ];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-200">
      {/* Top action area */}
      <div className="flex flex-col gap-2 p-3">
        <button
          onClick={() => router.push("/atlas")}
          className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium hover:border-emerald-500/50 hover:bg-slate-800"
        >
          <Plus size={14} />
          Neuer Chat
        </button>
        <button
          onClick={() => router.push("/atlas/mandate/new")}
          className="flex items-center gap-2 rounded-md border border-slate-700/60 bg-transparent px-3 py-2 text-xs text-slate-300 hover:border-emerald-500/40 hover:bg-slate-900"
        >
          <Briefcase size={12} />
          Neues Mandat
        </button>
      </div>

      {/* Search (placeholder for now) */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-xs text-slate-500">
          <Search size={12} />
          <span>Suchen…</span>
        </div>
      </div>

      {/* Scrollable middle */}
      <div className="flex-1 overflow-y-auto px-1">
        {/* CHATS */}
        <Section label="Chats">
          {loading && chats.length === 0 ? (
            <p className="px-3 text-xs text-slate-500">Lädt…</p>
          ) : chats.length === 0 ? (
            <p className="px-3 text-xs text-slate-500">
              Noch keine Chats. Stelle deine erste Frage rechts.
            </p>
          ) : (
            order.map((b) =>
              grouped[b] && grouped[b].length > 0 ? (
                <div key={b} className="mb-2">
                  <div className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wider text-slate-500">
                    {b}
                  </div>
                  {grouped[b].slice(0, 12).map((c) => {
                    const active = c.id === activeChatId;
                    return (
                      <Link
                        key={c.id}
                        href={`/atlas/chat/${c.id}`}
                        className={`group flex items-center gap-2 rounded px-3 py-1.5 text-[13px] ${
                          active
                            ? "bg-emerald-500/10 text-emerald-200"
                            : "text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        <MessageSquare
                          size={11}
                          className="shrink-0 opacity-50"
                        />
                        <span className="line-clamp-1 flex-1">{c.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null,
            )
          )}
        </Section>

        {/* MANDATE */}
        <Section label="Mandate">
          {mandates.length === 0 ? (
            <p className="px-3 text-xs text-slate-500">Noch keine Mandate.</p>
          ) : (
            mandates.slice(0, 12).map((m) => {
              const active = m.id === activeMandateId;
              return (
                <Link
                  key={m.id}
                  href={`/atlas/mandate/${m.id}`}
                  className={`group flex items-center gap-2 rounded px-3 py-1.5 text-[13px] ${
                    active
                      ? "bg-emerald-500/10 text-emerald-200"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <Briefcase size={11} className="shrink-0 opacity-50" />
                  <span className="line-clamp-1 flex-1">{m.name}</span>
                  {m._count.chats > 0 && (
                    <span className="shrink-0 text-[10px] text-slate-500">
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
            icon={<Library size={11} />}
            active={pathname === "/atlas/sources"}
          />
          <NavLink
            href="/atlas/cases"
            label="Cases"
            icon={<Gavel size={11} />}
            active={pathname === "/atlas/cases"}
          />
          <NavLink
            href="/atlas/treaties"
            label="Treaties"
            icon={<ScrollText size={11} />}
            active={pathname === "/atlas/treaties"}
          />
          <NavLink
            href="/atlas/jurisdictions"
            label="Jurisdiktionen"
            icon={<Landmark size={11} />}
            active={pathname === "/atlas/jurisdictions"}
          />
        </Section>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-2">
        <NavLink
          href="/atlas/settings"
          label="Einstellungen"
          icon={<Settings size={11} />}
          active={pathname === "/atlas/settings"}
        />
      </div>
    </aside>
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
      <div className="px-3 pb-1 pt-3 text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      {children}
    </div>
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
      className={`flex items-center gap-2 rounded px-3 py-1.5 text-[13px] ${
        active
          ? "bg-emerald-500/10 text-emerald-200"
          : "text-slate-300 hover:bg-slate-900"
      }`}
    >
      <span className="shrink-0 opacity-60">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
