/**
 * Atlas Drafting — recently-used + draft-history persistence (Q2 + Q6).
 *
 * Two stores in one module:
 *
 *   - recentDispatch{Auth,Brief,Compare}: per-tile last-N inputs that
 *     produced a draft. Surfaces as "recently used" chips so Marie can
 *     re-fire a previous draft without re-typing.
 *
 *   - draftLibrary: append-only log of every dispatched draft prompt
 *     with timestamp + tile-kind + the final prompt text. Lets us
 *     auto-archive without forcing the user to click "save". /atlas/
 *     drafting/history (bundle 32) reads from this.
 *
 * MVP via localStorage. Stage-2 = backend persistence + per-mandate
 * binding (bundle 36). The same defensive shape-check pattern as
 * comparator-annotations.ts is used so a schema drift doesn't crash.
 */

const RECENT_AUTH_KEY = "atlas-drafting-recent-auth";
const RECENT_BRIEF_KEY = "atlas-drafting-recent-brief";
const RECENT_COMPARE_KEY = "atlas-drafting-recent-compare";
/* Bundle 34: two new tiles get their own recently-used rings. */
const RECENT_NDA_KEY = "atlas-drafting-recent-nda";
const RECENT_COVER_KEY = "atlas-drafting-recent-cover";
const LIBRARY_KEY = "atlas-drafting-library";

const RECENT_CAP = 5;
const LIBRARY_CAP = 50;

/* ── Recently-used per tile ─────────────────────────────────────── */

export interface RecentAuthEntry {
  jurisdiction: string;
  operator: string;
  mission: string;
  /** Display label, computed once. */
  label: string;
  ts: number;
}

export interface RecentBriefEntry {
  topic: string;
  /** Truncated label for the chip (~40 chars). */
  label: string;
  ts: number;
}

export interface RecentCompareEntry {
  jurisdictions: string[];
  label: string;
  ts: number;
}

/* Bundle 34 — NDA tile recent. */
export interface RecentNdaEntry {
  ndaType: "mutual" | "one_way";
  partyA: string;
  partyB: string;
  jurisdiction: string;
  termYears: string;
  label: string;
  ts: number;
}

/* Bundle 34 — Filing-Cover-Letter tile recent. */
export interface RecentCoverEntry {
  filingType: "authorization" | "notification" | "renewal" | "amendment";
  authority: string;
  reference: string;
  label: string;
  ts: number;
}

function safeRead<T>(key: string, isOk: (v: unknown) => v is T): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isOk);
  } catch {
    return [];
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private browsing — silent. */
  }
}

function pushBounded<T>(list: T[], next: T, cap: number): T[] {
  /* New entry leads, dedupe by label, cap from the tail. */
  const dedup = list.filter(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      "label" in e &&
      "label" in (next as object) &&
      (e as { label: string }).label !== (next as { label: string }).label,
  );
  return [next, ...dedup].slice(0, cap);
}

const isAuth = (v: unknown): v is RecentAuthEntry =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as RecentAuthEntry).jurisdiction === "string" &&
  typeof (v as RecentAuthEntry).operator === "string" &&
  typeof (v as RecentAuthEntry).label === "string";

const isBrief = (v: unknown): v is RecentBriefEntry =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as RecentBriefEntry).topic === "string" &&
  typeof (v as RecentBriefEntry).label === "string";

const isCompare = (v: unknown): v is RecentCompareEntry =>
  typeof v === "object" &&
  v !== null &&
  Array.isArray((v as RecentCompareEntry).jurisdictions) &&
  typeof (v as RecentCompareEntry).label === "string";

const isNda = (v: unknown): v is RecentNdaEntry =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as RecentNdaEntry).partyA === "string" &&
  typeof (v as RecentNdaEntry).partyB === "string" &&
  typeof (v as RecentNdaEntry).label === "string";

const isCover = (v: unknown): v is RecentCoverEntry =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as RecentCoverEntry).authority === "string" &&
  typeof (v as RecentCoverEntry).label === "string";

export function getRecentAuth(): RecentAuthEntry[] {
  return safeRead(RECENT_AUTH_KEY, isAuth);
}

export function getRecentBrief(): RecentBriefEntry[] {
  return safeRead(RECENT_BRIEF_KEY, isBrief);
}

export function getRecentCompare(): RecentCompareEntry[] {
  return safeRead(RECENT_COMPARE_KEY, isCompare);
}

export function pushRecentAuth(entry: Omit<RecentAuthEntry, "ts">): void {
  const list = getRecentAuth();
  safeWrite(
    RECENT_AUTH_KEY,
    pushBounded(list, { ...entry, ts: Date.now() }, RECENT_CAP),
  );
}

export function pushRecentBrief(entry: Omit<RecentBriefEntry, "ts">): void {
  const list = getRecentBrief();
  safeWrite(
    RECENT_BRIEF_KEY,
    pushBounded(list, { ...entry, ts: Date.now() }, RECENT_CAP),
  );
}

export function pushRecentCompare(entry: Omit<RecentCompareEntry, "ts">): void {
  const list = getRecentCompare();
  safeWrite(
    RECENT_COMPARE_KEY,
    pushBounded(list, { ...entry, ts: Date.now() }, RECENT_CAP),
  );
}

export function getRecentNda(): RecentNdaEntry[] {
  return safeRead(RECENT_NDA_KEY, isNda);
}

export function getRecentCover(): RecentCoverEntry[] {
  return safeRead(RECENT_COVER_KEY, isCover);
}

export function pushRecentNda(entry: Omit<RecentNdaEntry, "ts">): void {
  const list = getRecentNda();
  safeWrite(
    RECENT_NDA_KEY,
    pushBounded(list, { ...entry, ts: Date.now() }, RECENT_CAP),
  );
}

export function pushRecentCover(entry: Omit<RecentCoverEntry, "ts">): void {
  const list = getRecentCover();
  safeWrite(
    RECENT_COVER_KEY,
    pushBounded(list, { ...entry, ts: Date.now() }, RECENT_CAP),
  );
}

/* ── Draft library — auto-archive every dispatched prompt ─────── */

export type DraftKind = "auth" | "brief" | "compare" | "nda" | "cover";

/* Bundle 40 — auto-versioning. Each library entry tracks every
   prompt the user dispatched against it: the initial creation prompt
   plus any "edit & regenerate" prompts. Marie can compare prompts
   side-by-side to see what changed between Klaus's review rounds. */
export interface PromptVersion {
  prompt: string;
  ts: number;
  /** Where the version came from. "initial" = first dispatch from the
   *  studio, "edit-regenerate" = user edited the prompt in the My Drafts
   *  view and re-fired. */
  source: "initial" | "edit-regenerate";
}

export interface DraftLibraryEntry {
  id: string;
  kind: DraftKind;
  /** Short human-readable summary used in the library list. */
  title: string;
  /** The actual prompt text dispatched to AI Mode. Always reflects the
   *  LATEST version — older versions live in `versions`. */
  prompt: string;
  /** Output locale ("de" | "en") at dispatch time. */
  outputLocale: string;
  /** Whether the privilege-marker was active. */
  privileged: boolean;
  /** Bundle 36 — active mandate id at dispatch time. Optional for
   *  backward compat with entries created before B1. */
  mandateId?: string;
  /** Snapshot of the mandate name at dispatch time so deleting the
   *  mandate later doesn't orphan the library entry's display label. */
  mandateName?: string;
  /** Bundle 40 — version history. Optional for backward compat with
   *  pre-B5 entries; new entries always include at least the initial
   *  version. */
  versions?: PromptVersion[];
  ts: number;
}

const isDraft = (v: unknown): v is DraftLibraryEntry =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as DraftLibraryEntry).id === "string" &&
  typeof (v as DraftLibraryEntry).kind === "string" &&
  typeof (v as DraftLibraryEntry).title === "string" &&
  typeof (v as DraftLibraryEntry).prompt === "string";

export function getDraftLibrary(): DraftLibraryEntry[] {
  return safeRead(LIBRARY_KEY, isDraft);
}

export function pushDraftLibrary(
  entry: Omit<DraftLibraryEntry, "id" | "ts" | "versions">,
): DraftLibraryEntry {
  const ts = Date.now();
  const next: DraftLibraryEntry = {
    ...entry,
    id: `drft-${ts}-${Math.random().toString(36).slice(2, 8)}`,
    ts,
    /* Bundle 40: seed the initial version on creation so subsequent
       edit-regenerate cycles always have a baseline to diff against. */
    versions: [{ prompt: entry.prompt, ts, source: "initial" }],
  };
  const list = getDraftLibrary();
  safeWrite(LIBRARY_KEY, [next, ...list].slice(0, LIBRARY_CAP));
  return next;
}

/**
 * Bundle 40 — append a new prompt version to an existing entry. Used
 * by the My Drafts page when Marie clicks "Edit & regenerate". The
 * entry's `prompt` field is also updated to the new version (so the
 * default "Restore" action fires the latest version, not the original).
 */
export function addPromptVersion(
  entryId: string,
  newPrompt: string,
  source: PromptVersion["source"] = "edit-regenerate",
): void {
  const list = getDraftLibrary();
  const ts = Date.now();
  const next = list.map((e) => {
    if (e.id !== entryId) return e;
    const versions = e.versions ?? [
      { prompt: e.prompt, ts: e.ts, source: "initial" as const },
    ];
    return {
      ...e,
      prompt: newPrompt,
      ts,
      versions: [...versions, { prompt: newPrompt, ts, source }],
    };
  });
  safeWrite(LIBRARY_KEY, next);
}

export function deleteDraftLibraryEntry(id: string): void {
  const list = getDraftLibrary();
  safeWrite(
    LIBRARY_KEY,
    list.filter((e) => e.id !== id),
  );
}

export function clearDraftLibrary(): void {
  safeWrite(LIBRARY_KEY, []);
}
