/**
 * /scholar/lists/[id] — a single reading list (e.g. a course list for teaching).
 *
 * Server Component: loads the list via getReadingList(userId, id). The query
 * filters by userId, so a list owned by another user simply resolves to null
 * → notFound(). No cross-tenant read is possible here.
 *
 * Renders: a context-aware BackLink to /scholar/saved, the list name +
 * description (PageHeader), small rename/delete controls (ListManageControls),
 * and the resolved items as a monochrome list. Each item links to its detail
 * page and carries a remove control (removeFromListAction, via SavedControls).
 * Items whose corpus id no longer resolves are already dropped by the service.
 *
 * Next.js 15: params is a Promise — await it.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * Every reading size comes from the shared SCHOLAR_TYPE tokens — no text-[Npx].
 *
 * WCAG 2.2 AA:
 *   - <main> landmark + <h1> via ScholarPage / PageHeader; h2 for the items.
 *   - BackLink, item links + remove controls carry focus-visible rings and
 *     ≥24px targets. Empty state is quiet, full-sentence guidance.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Scale } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getReadingList,
  type ResolvedItem,
} from "@/lib/scholar/saved-items.server";
import { ScholarPage } from "../../_components/ScholarPage";
import { PageHeader } from "../../_components/PageHeader";
import { BackLink } from "../../_components/BackLink";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import {
  RemoveFromListButton,
  ListManageControls,
} from "../../saved/SavedControls";
import { DownloadButton } from "../../_components/DownloadButton";
import { t, type ScholarLocale } from "../../_i18n/core";
import { SAVED } from "../../_i18n/saved";
import { getScholarLocale } from "../../_i18n/locale.server";

const CARD_CLS = "rounded-2xl bg-white border border-gray-200/70 shadow-sm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadingListPage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const locale = await getScholarLocale(userId);

  // No session → treat as not found (the layout already gates auth; this is
  // a defensive fallback that never leaks another user's list).
  const list = userId ? await getReadingList(userId, id) : null;
  if (!list) notFound();

  // Plain-text export (title + link per item) so a lecturer can share the
  // course reading list with students. Uses only already-resolved item data.
  const exportText =
    `${list.name}\n` +
    (list.description ? `${list.description}\n` : "") +
    "\n" +
    list.items
      .map(
        (it, i) => `${i + 1}. ${it.title}\n   https://www.caelex.eu${it.href}`,
      )
      .join("\n") +
    "\n";
  const exportName =
    list.name
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 48) || "reading-list";

  return (
    <ScholarPage>
      <BackLink
        fallbackHref="/scholar/saved"
        fallbackLabel={t(locale, SAVED, "backToSaved")}
      />

      <div className="mt-4">
        <PageHeader
          eyebrow={t(locale, SAVED, "listEyebrow")}
          title={list.name}
          subtitle={list.description ?? undefined}
        />
      </div>

      {/* Rename / delete controls */}
      <div className="mb-8">
        <ListManageControls listId={list.id} currentName={list.name} />
      </div>

      {/* Items */}
      <section aria-labelledby="list-items-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="list-items-heading" className={SCHOLAR_TYPE.sectionHeading}>
            {t(locale, SAVED, "itemsHeading")}
          </h2>
          <div className="flex items-center gap-3">
            {list.items.length > 0 && (
              <DownloadButton
                content={exportText}
                filename={`${exportName}.txt`}
                label={t(locale, SAVED, "exportList")}
              />
            )}
            <span className={`tabular-nums ${SCHOLAR_TYPE.meta}`}>
              {list.items.length}{" "}
              {list.items.length === 1
                ? t(locale, SAVED, "entryOne")
                : t(locale, SAVED, "entryOther")}
            </span>
          </div>
        </div>

        {list.items.length === 0 ? (
          <div className={`${CARD_CLS} px-5 py-8`}>
            <p className={SCHOLAR_TYPE.bodyMuted}>
              {t(locale, SAVED, "listEmpty")}
            </p>
          </div>
        ) : (
          <ul className="space-y-1" role="list">
            {list.items.map((item) => (
              <li key={`${item.itemType}:${item.itemId}`}>
                <ListItemRow listId={list.id} item={item} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer — mirrors the other Scholar pages */}
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

// ─── One list item: link (title → href) + remove control ──────────────────────

function ListItemRow({
  listId,
  item,
  locale,
}: {
  listId: string;
  item: ResolvedItem;
  locale: ScholarLocale;
}) {
  const Icon = item.itemType === "case" ? Scale : FileText;
  const typeLabel =
    item.itemType === "case"
      ? t(locale, SAVED, "typeCase")
      : t(locale, SAVED, "typeSource");

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
        <RemoveFromListButton
          listId={listId}
          itemType={item.itemType}
          itemId={item.itemId}
          title={item.title}
        />
      </div>
    </div>
  );
}
