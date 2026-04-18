"use client";

import { useEffect, useState } from "react";
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

function readAll(): BookmarkRef[] {
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

function writeAll(items: BookmarkRef[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Notify same-tab listeners
  window.dispatchEvent(new CustomEvent("atlas:bookmarks-changed"));
}

export function useBookmarks(): {
  all: BookmarkRef[];
  has: (id: string) => boolean;
  toggle: (item: BookmarkRef) => void;
  remove: (id: string) => void;
} {
  const [all, setAll] = useState<BookmarkRef[]>([]);

  useEffect(() => {
    setAll(readAll());
    const onChange = () => setAll(readAll());
    window.addEventListener("atlas:bookmarks-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("atlas:bookmarks-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const has = (id: string) => all.some((b) => b.id === id);

  const toggle = (item: BookmarkRef) => {
    const next = has(item.id)
      ? all.filter((b) => b.id !== item.id)
      : [...all, item];
    writeAll(next);
    setAll(next);
  };

  const remove = (id: string) => {
    const next = all.filter((b) => b.id !== id);
    writeAll(next);
    setAll(next);
  };

  return { all, has, toggle, remove };
}

// ─── Button component ─────────────────────────────────────────────────

export function BookmarkButton({ item }: { item: BookmarkRef }) {
  const { has, toggle } = useBookmarks();
  const saved = has(item.id);

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      title={saved ? "Remove bookmark" : "Save to bookmarks"}
      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border transition-colors ${
        saved
          ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
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
