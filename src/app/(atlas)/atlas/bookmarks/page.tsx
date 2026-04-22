"use client";

import Link from "next/link";
import { Bookmark, Trash2, ArrowRight, Cloud, Laptop } from "lucide-react";
import { useBookmarks } from "../_components/BookmarkButton";

export default function BookmarksPage() {
  const { all, remove, persistence } = useBookmarks();

  const grouped = {
    source: all.filter((b) => b.type === "source"),
    jurisdiction: all.filter((b) => b.type === "jurisdiction"),
    authority: all.filter((b) => b.type === "authority"),
  };

  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-10">
      <header className="mb-8 max-w-3xl">
        <div className="inline-flex items-center gap-2 mb-3 text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
          <Bookmark size={12} />
          Your Atlas
        </div>
        <h1 className="text-[36px] font-light tracking-tight text-[var(--atlas-text-primary)]">
          Bookmarks
        </h1>
        <p className="mt-3 text-[14px] text-[var(--atlas-text-secondary)] leading-relaxed">
          Items you&rsquo;ve saved across Atlas.
        </p>
        {persistence !== "loading" && (
          <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium rounded-full px-3 py-1 border bg-[var(--atlas-bg-surface)] border-[var(--atlas-border)] text-[var(--atlas-text-secondary)]">
            {persistence === "remote" ? (
              <>
                <Cloud size={11} className="text-emerald-500" />
                Synced to your account — available on every device you sign in
                on.
              </>
            ) : (
              <>
                <Laptop size={11} className="text-amber-500" />
                Stored in this browser only.{" "}
                <Link
                  href="/atlas-login"
                  className="underline hover:text-[var(--atlas-text-primary)]"
                >
                  Sign in
                </Link>{" "}
                to sync across devices.
              </>
            )}
          </div>
        )}
      </header>

      {all.length === 0 ? (
        <div className="max-w-xl rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] p-8 text-center">
          <Bookmark
            size={28}
            strokeWidth={1.2}
            className="mx-auto mb-3 text-[var(--atlas-text-faint)]"
          />
          <p className="text-[14px] font-medium text-[var(--atlas-text-primary)] mb-1">
            No bookmarks yet
          </p>
          <p className="text-[12px] text-[var(--atlas-text-muted)]">
            Click the <span className="font-medium">Save</span> pill on any
            source, authority, or country card — it&rsquo;ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8 max-w-4xl">
          {(
            [
              ["jurisdiction", "Countries"],
              ["source", "Legal sources"],
              ["authority", "Authorities"],
            ] as const
          ).map(([key, label]) => {
            const items = grouped[key];
            if (items.length === 0) return null;
            return (
              <section key={key}>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-muted)] mb-3">
                  {label} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((b) => (
                    <div
                      key={b.id}
                      className="group flex items-center justify-between gap-3 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] px-4 py-3 hover:border-[var(--atlas-border-strong)] transition"
                    >
                      <Link
                        href={b.href}
                        className="flex-1 min-w-0 flex items-center gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-[var(--atlas-text-primary)] truncate">
                            {b.title}
                          </div>
                          {b.subtitle && (
                            <div className="text-[11px] text-[var(--atlas-text-muted)] truncate">
                              {b.subtitle}
                            </div>
                          )}
                        </div>
                        <ArrowRight
                          size={12}
                          className="text-[var(--atlas-text-faint)] group-hover:text-[var(--atlas-text-secondary)]"
                        />
                      </Link>
                      <button
                        onClick={() => remove(b.id)}
                        title="Remove bookmark"
                        className="flex-shrink-0 text-[var(--atlas-text-faint)] hover:text-red-500 transition"
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
