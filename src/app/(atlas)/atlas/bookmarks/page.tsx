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
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-10">
      <header className="mb-8 max-w-3xl">
        <div className="inline-flex items-center gap-2 mb-3 text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
          <Bookmark size={12} />
          Your Atlas
        </div>
        <h1 className="text-[36px] font-light tracking-tight text-gray-900">
          Bookmarks
        </h1>
        <p className="mt-3 text-[14px] text-gray-600 leading-relaxed">
          Items you&rsquo;ve saved across Atlas.
        </p>
        {persistence !== "loading" && (
          <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium rounded-full px-3 py-1 border bg-white border-gray-200 text-gray-700">
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
                <Link href="/login" className="underline hover:text-gray-900">
                  Sign in
                </Link>{" "}
                to sync across devices.
              </>
            )}
          </div>
        )}
      </header>

      {all.length === 0 ? (
        <div className="max-w-xl rounded-xl bg-white border border-gray-100 p-8 text-center">
          <Bookmark
            size={28}
            strokeWidth={1.2}
            className="mx-auto mb-3 text-gray-300"
          />
          <p className="text-[14px] font-medium text-gray-900 mb-1">
            No bookmarks yet
          </p>
          <p className="text-[12px] text-gray-500">
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
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
                  {label} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((b) => (
                    <div
                      key={b.id}
                      className="group flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3 hover:border-gray-300 transition"
                    >
                      <Link
                        href={b.href}
                        className="flex-1 min-w-0 flex items-center gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-gray-900 truncate">
                            {b.title}
                          </div>
                          {b.subtitle && (
                            <div className="text-[11px] text-gray-500 truncate">
                              {b.subtitle}
                            </div>
                          )}
                        </div>
                        <ArrowRight
                          size={12}
                          className="text-gray-300 group-hover:text-gray-700"
                        />
                      </Link>
                      <button
                        onClick={() => remove(b.id)}
                        title="Remove bookmark"
                        className="flex-shrink-0 text-gray-300 hover:text-red-500 transition"
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
