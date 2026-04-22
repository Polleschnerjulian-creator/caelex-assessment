"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Bookmark } from "lucide-react";

const STORAGE_KEY = "atlas:bookmarks:v1";

export interface BookmarkRef {
  id: string;
  type: "source" | "jurisdiction" | "authority";
  title: string;
  href: string;
  subtitle?: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────

function readLocal(): BookmarkRef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as BookmarkRef[];
  } catch {
    return [];
  }
}

function writeLocal(items: BookmarkRef[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("atlas:bookmarks-changed"));
}

function clearLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// ─── API calls ────────────────────────────────────────────────────────

async function fetchFromApi(): Promise<BookmarkRef[]> {
  const res = await fetch("/api/atlas/bookmarks", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { bookmarks: BookmarkRef[] };
  return data.bookmarks ?? [];
}

async function createOnApi(item: BookmarkRef): Promise<boolean> {
  const res = await fetch("/api/atlas/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemId: item.id,
      itemType: item.type,
      title: item.title,
      subtitle: item.subtitle ?? null,
      href: item.href,
    }),
  });
  return res.ok;
}

async function deleteOnApi(itemId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/atlas/bookmarks?itemId=${encodeURIComponent(itemId)}`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch (err) {
    // L5: surface network failures to the caller instead of swallowing.
    // eslint-disable-next-line no-console
    console.warn("Atlas bookmark delete failed", err);
    return false;
  }
}

async function bulkImport(items: BookmarkRef[]): Promise<boolean> {
  if (items.length === 0) return true;
  const res = await fetch("/api/atlas/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((i) => ({
        itemId: i.id,
        itemType: i.type,
        title: i.title,
        subtitle: i.subtitle ?? null,
        href: i.href,
      })),
    }),
  });
  return res.ok;
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useBookmarks(): {
  all: BookmarkRef[];
  has: (id: string) => boolean;
  toggle: (item: BookmarkRef) => void;
  remove: (id: string) => void;
  /** "local" = anonymous session persists in localStorage;
   *  "remote" = signed in, persists to DB across devices;
   *  "loading" = auth status not yet known. */
  persistence: "local" | "remote" | "loading";
} {
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated" && !!session?.user?.id;

  const [all, setAll] = useState<BookmarkRef[]>([]);
  const migratedRef = useRef(false);

  // Load: from API if authed, else from localStorage
  useEffect(() => {
    if (status === "loading") return;

    if (isAuthed) {
      // 1. optimistic: show localStorage immediately (avoids flicker)
      const local = readLocal();
      if (local.length > 0 && !migratedRef.current) {
        setAll(local);
      }

      // 2. fetch authoritative list from DB
      fetchFromApi().then(async (remote) => {
        if (!migratedRef.current && local.length > 0) {
          // First authed load with pending local bookmarks → migrate
          migratedRef.current = true;
          const toMigrate = local.filter(
            (l) => !remote.some((r) => r.id === l.id),
          );
          if (toMigrate.length > 0) {
            const ok = await bulkImport(toMigrate);
            if (ok) {
              clearLocal();
              const merged = await fetchFromApi();
              setAll(merged);
              return;
            }
          } else {
            clearLocal();
          }
        }
        setAll(remote);
      });
    } else {
      setAll(readLocal());
    }
  }, [isAuthed, status]);

  // Cross-tab / same-tab sync for the local branch
  useEffect(() => {
    if (isAuthed) return;
    const onChange = () => setAll(readLocal());
    window.addEventListener("atlas:bookmarks-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("atlas:bookmarks-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [isAuthed]);

  const has = useCallback((id: string) => all.some((b) => b.id === id), [all]);

  const toggle = useCallback(
    (item: BookmarkRef) => {
      let isSaved = false;
      // H10: compute next state from the live state snapshot via a functional
      // updater. Capturing `all` in the closure meant two rapid toggles would
      // roll back each other on failure.
      setAll((prev) => {
        isSaved = prev.some((b) => b.id === item.id);
        return isSaved ? prev.filter((b) => b.id !== item.id) : [...prev, item];
      });

      if (isAuthed) {
        const op = isSaved ? deleteOnApi(item.id) : createOnApi(item);
        op.catch(() => {
          // Roll back THIS toggle only — leave any other concurrent toggle alone.
          setAll((prev) =>
            isSaved ? [...prev, item] : prev.filter((b) => b.id !== item.id),
          );
        });
      } else {
        // localStorage: fetch the freshest state after the functional update
        // and persist that.
        const next = isSaved
          ? readLocal().filter((b) => b.id !== item.id)
          : [...readLocal(), item];
        writeLocal(next);
      }
    },
    [isAuthed],
  );

  const remove = useCallback(
    (id: string) => {
      const next = all.filter((b) => b.id !== id);
      setAll(next);
      if (isAuthed) {
        deleteOnApi(id).catch(() => setAll(all));
      } else {
        writeLocal(next);
      }
    },
    [all, isAuthed],
  );

  const persistence: "local" | "remote" | "loading" =
    status === "loading" ? "loading" : isAuthed ? "remote" : "local";

  return { all, has, toggle, remove, persistence };
}

// ─── Button component ─────────────────────────────────────────────────

export function BookmarkButton({ item }: { item: BookmarkRef }) {
  const { has, toggle, persistence } = useBookmarks();
  const saved = has(item.id);

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      title={
        saved
          ? persistence === "remote"
            ? "Remove bookmark (synced to your account)"
            : "Remove bookmark (stored in this browser)"
          : persistence === "remote"
            ? "Save to bookmarks (synced to your account)"
            : "Save to bookmarks (stored in this browser — sign in to sync)"
      }
      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border transition-colors ${
        saved
          ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
          : "bg-[var(--atlas-bg-surface)] border-[var(--atlas-border)] text-[var(--atlas-text-secondary)] hover:border-[var(--atlas-border-strong)] hover:text-[var(--atlas-text-primary)]"
      }`}
    >
      <Bookmark
        size={10}
        strokeWidth={2}
        fill={saved ? "currentColor" : "none"}
      />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
