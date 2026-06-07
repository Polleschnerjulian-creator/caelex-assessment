/**
 * /scholar/saved — the "Merkliste" hub.
 *
 * Server Component: reads the signed-in user's bookmarks + reading lists
 * directly from the IDOR-safe data layer (every query filters by userId).
 * The route-group layout already gates the session, but — like the library
 * page — we read auth() defensively and degrade gracefully if it is absent.
 *
 * Two sections:
 *   1. "Gemerkte Quellen & Fälle" — one-click bookmarks as a monochrome list.
 *      Each row links to the item; a small icon control removes it
 *      (removeBookmarkAction, via the SavedControls client wrapper).
 *   2. "Leselisten" — the user's named reading lists (course lists for
 *      teaching), each linking to /scholar/lists/{id}, plus an inline
 *      "Neue Liste erstellen" form (createListAction).
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * Every reading size comes from the shared SCHOLAR_TYPE tokens — no text-[Npx].
 *
 * WCAG 2.2 AA:
 *   - <main> landmark + <h1> via ScholarPage / PageHeader; h2 per section.
 *   - Item links + remove controls carry focus-visible rings and ≥24px targets.
 *   - Empty states are quiet, full-sentence guidance (no dead ends).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { Bookmark, ListChecks, FileText, Scale } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getBookmarks,
  getReadingLists,
  type ResolvedItem,
} from "@/lib/scholar/saved-items.server";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import { SCHOLAR_TYPE } from "../_components/scholar-type";
import { RemoveBookmarkButton, CreateListForm } from "./SavedControls";

// ─── Card shell (matches the light-canvas convention) ─────────────────────────
const CARD_CLS = "rounded-2xl bg-white border border-gray-200/70 shadow-sm";

export default async function SavedPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [bookmarks, lists] = userId
    ? await Promise.all([getBookmarks(userId), getReadingLists(userId)])
    : [[] as ResolvedItem[], [] as Awaited<ReturnType<typeof getReadingLists>>];

  return (
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title="Merkliste"
        subtitle="Gemerkte Quellen und Entscheidungen sowie deine Leselisten für Recherche und Lehre an einem Ort"
        icon={Bookmark}
      />

      {/* ─── Section 1: bookmarks ──────────────────────────────────────────── */}
      <section aria-labelledby="saved-bookmarks-heading" className="mb-12">
        <div className="mb-3 flex items-center gap-2">
          <Bookmark
            size={16}
            className="text-gray-600"
            strokeWidth={1.75}
            aria-hidden={true}
          />
          <h2
            id="saved-bookmarks-heading"
            className={SCHOLAR_TYPE.sectionHeading}
          >
            Gemerkte Quellen &amp; Fälle
          </h2>
        </div>

        {bookmarks.length === 0 ? (
          <div className={`${CARD_CLS} px-5 py-8`}>
            <p className={SCHOLAR_TYPE.bodyMuted}>
              Noch nichts gemerkt — nutze das Lesezeichen auf einer Quelle oder
              Entscheidung.
            </p>
          </div>
        ) : (
          <ul className="space-y-1" role="list">
            {bookmarks.map((item) => (
              <li key={`${item.itemType}:${item.itemId}`}>
                <SavedRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Section 2: reading lists ──────────────────────────────────────── */}
      <section aria-labelledby="saved-lists-heading">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks
            size={16}
            className="text-gray-600"
            strokeWidth={1.75}
            aria-hidden={true}
          />
          <h2 id="saved-lists-heading" className={SCHOLAR_TYPE.sectionHeading}>
            Leselisten
          </h2>
        </div>

        {lists.length === 0 ? (
          <div className={`${CARD_CLS} px-5 py-8 mb-6`}>
            <p className={SCHOLAR_TYPE.bodyMuted}>
              Noch keine Leselisten. Leselisten eignen sich gut als Kurslisten
              für die Lehre — bündle die Pflichtlektüre eines Seminars und teile
              sie mit deinen Studierenden.
            </p>
          </div>
        ) : (
          <ul className="space-y-1 mb-8" role="list">
            {lists.map((list) => (
              <li key={list.id}>
                <Link
                  href={`/scholar/lists/${list.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-white border border-transparent hover:border-gray-200/70 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                >
                  <ListChecks
                    size={18}
                    className="text-gray-600 flex-shrink-0"
                    strokeWidth={1.5}
                    aria-hidden={true}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate text-body-lg font-medium text-gray-900 group-hover:text-black motion-safe:transition-colors">
                      {list.name}
                    </span>
                    {list.description && (
                      <span className={`block truncate ${SCHOLAR_TYPE.meta}`}>
                        {list.description}
                      </span>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 tabular-nums ${SCHOLAR_TYPE.meta}`}
                  >
                    {list.itemCount}{" "}
                    {list.itemCount === 1 ? "Eintrag" : "Einträge"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Inline create form */}
        <div className={`${CARD_CLS} p-5`}>
          <h3 className={`${SCHOLAR_TYPE.provisionLabel} mb-3`}>
            Neue Liste erstellen
          </h3>
          <CreateListForm />
        </div>
      </section>

      {/* Footer — mirrors the library page footer */}
      <footer className="mt-20 pt-8 border-t border-gray-200 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-micro font-semibold uppercase tracking-[0.08em] text-gray-600">
              Scholar
            </span>
            <span className="text-caption text-gray-600">by Caelex</span>
          </div>
          <span className="text-caption text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}

// ─── One bookmark row: link (title → href) + remove control ───────────────────

function SavedRow({ item }: { item: ResolvedItem }) {
  const Icon = item.itemType === "case" ? Scale : FileText;
  const typeLabel = item.itemType === "case" ? "Entscheidung" : "Quelle";

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white border border-transparent hover:border-gray-200/70 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group">
      <Link
        href={item.href}
        className="flex flex-1 min-w-0 items-center gap-4 pl-5 pr-2 py-3.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
      >
        <Icon
          size={18}
          className="text-gray-600 flex-shrink-0"
          strokeWidth={1.5}
          aria-hidden={true}
        />
        <div className="flex-1 min-w-0">
          <span className="block truncate text-body-lg font-medium text-gray-900 group-hover:text-black motion-safe:transition-colors">
            {item.title}
          </span>
          <span className={`block ${SCHOLAR_TYPE.meta}`}>{typeLabel}</span>
        </div>
      </Link>
      <div className="pr-3 flex-shrink-0">
        <RemoveBookmarkButton
          itemType={item.itemType}
          itemId={item.itemId}
          title={item.title}
        />
      </div>
    </div>
  );
}
