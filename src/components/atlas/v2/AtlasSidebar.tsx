"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Sidebar (UI refresh 2026-05-12).
 *
 * ChatGPT-style restraint:
 *   - No hard border-r — soft separation via background only
 *   - Section labels in title-case (not aggressive uppercase)
 *   - No emerald active-states — subtle white-on-near-black
 *   - More padding, less density
 *   - Plus-icon "Neuer Chat" button matches ChatGPT
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { ChatListItem, MandateListItem } from "./types";

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
    "Letzte 7 Tage",
    "Älter",
  ];

  if (collapsed) {
    return (
      <aside className="flex h-full w-12 shrink-0 flex-col items-center gap-3 bg-[#171717] py-3 text-slate-300">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Sidebar einblenden"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
        >
          <PanelLeftOpen size={16} />
        </button>
        <button
          type="button"
          onClick={() => router.push("/atlas")}
          title="Neuer Chat"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
        >
          <Plus size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col bg-[#171717] text-slate-200">
      {/* Top row */}
      <div className="flex items-center justify-between gap-1 px-3 pt-3">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Sidebar ausblenden"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
        >
          <PanelLeftClose size={16} />
        </button>
        <button
          type="button"
          onClick={() => router.push("/atlas")}
          title="Neuer Chat"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Search-stub */}
      <div className="px-3 pt-2 pb-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[13px] text-slate-500">
          <Search size={13} />
          <span>Suchen…</span>
        </div>
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
      </div>

      {/* Scrollable middle */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {/* CHATS */}
        <Section label="Chats">
          {loading && chats.length === 0 ? (
            <Empty>lädt…</Empty>
          ) : chats.length === 0 ? (
            <Empty>Noch keine Chats.</Empty>
          ) : (
            order.map((b) =>
              grouped[b] && grouped[b].length > 0 ? (
                <div key={b} className="mb-1">
                  <div className="px-3 pb-1 pt-2 text-[11px] text-slate-500">
                    {b}
                  </div>
                  {grouped[b].slice(0, 16).map((c) => {
                    const active = c.id === activeChatId;
                    return (
                      <Link
                        key={c.id}
                        href={`/atlas/chat/${c.id}`}
                        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] transition-colors ${
                          active
                            ? "bg-white/[0.06] text-slate-100"
                            : "text-slate-300 hover:bg-white/[0.03]"
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
                </div>
              ) : null,
            )
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
                      ? "bg-white/[0.06] text-slate-100"
                      : "text-slate-300 hover:bg-white/[0.03]"
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
        </Section>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.05] px-2 py-2">
        <NavLink
          href="/atlas/settings"
          label="Einstellungen"
          icon={<Settings size={12} />}
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
          ? "bg-white/[0.06] text-slate-100"
          : "text-slate-300 hover:bg-white/[0.03]"
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
          ? "bg-white/[0.06] text-slate-100"
          : "text-slate-300 hover:bg-white/[0.03]"
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
