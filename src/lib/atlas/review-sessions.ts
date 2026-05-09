/**
 * Atlas Drafting — Review Sessions (Bundle 38, B3).
 *
 * Marie generates a draft. Klaus needs to review it. Without a review
 * surface she copies-pastes the draft into email, Klaus replies with
 * comments, she manually integrates them. With this module:
 *
 *   1. From /atlas/drafting/history Marie clicks "Share for review"
 *      on a saved draft. A ReviewSession record is created.
 *   2. The session has a unique id. Marie sends the share-link
 *      (/atlas/drafting/review/{id}) to Klaus.
 *   3. Klaus opens the link, sees the draft, adds comments. Marie
 *      sees them on next refresh.
 *   4. Marie can edit the draft body inline. Each edit + comment is
 *      timestamped.
 *
 * MVP CAVEAT: localStorage is per-browser. The "share link" only
 * resolves on the same machine until B3-stage-2 (Bundle 36's eventual
 * backend lift) puts review sessions in Postgres. This bundle ships
 * the data shape + UI flow; cross-user sharing is a backend swap away.
 */

export const REVIEW_SESSIONS_KEY = "atlas-drafting-review-sessions";

const REVIEW_CAP = 100;

export interface ReviewComment {
  id: string;
  /** Free-text author label ("Marie", "Klaus"). MVP — no auth. */
  author: string;
  body: string;
  ts: number;
  /** Resolution timestamp. Undefined = unresolved. */
  resolvedAt?: number;
}

export interface ReviewSession {
  id: string;
  /** Reference to the draft library entry that spawned the session. */
  draftId: string;
  /** Snapshot at share-time so the session is self-contained even if
   *  the draft library entry is later deleted. */
  draftTitle: string;
  draftPrompt: string;
  /** Generated body — Marie pastes the AI response here so Klaus
   *  sees the actual deliverable, not just the prompt that produced it. */
  draftBody: string;
  comments: ReviewComment[];
  createdAt: number;
  updatedAt: number;
}

const isComment = (v: unknown): v is ReviewComment =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as ReviewComment).id === "string" &&
  typeof (v as ReviewComment).author === "string" &&
  typeof (v as ReviewComment).body === "string" &&
  typeof (v as ReviewComment).ts === "number";

const isSession = (v: unknown): v is ReviewSession =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as ReviewSession).id === "string" &&
  typeof (v as ReviewSession).draftId === "string" &&
  typeof (v as ReviewSession).draftTitle === "string" &&
  typeof (v as ReviewSession).draftPrompt === "string" &&
  typeof (v as ReviewSession).draftBody === "string" &&
  Array.isArray((v as ReviewSession).comments) &&
  (v as ReviewSession).comments.every(isComment);

function readSessions(): ReviewSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEW_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSession);
  } catch {
    return [];
  }
}

function writeSessions(list: ReviewSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REVIEW_SESSIONS_KEY, JSON.stringify(list));
  } catch {
    /* quota — silent. */
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listReviewSessions(): ReviewSession[] {
  return readSessions().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getReviewSession(id: string): ReviewSession | null {
  return readSessions().find((s) => s.id === id) ?? null;
}

export function createReviewSession(args: {
  draftId: string;
  draftTitle: string;
  draftPrompt: string;
  draftBody?: string;
}): ReviewSession {
  const session: ReviewSession = {
    id: genId("rev"),
    draftId: args.draftId,
    draftTitle: args.draftTitle,
    draftPrompt: args.draftPrompt,
    draftBody: args.draftBody ?? "",
    comments: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const list = readSessions();
  writeSessions([session, ...list].slice(0, REVIEW_CAP));
  return session;
}

export function updateReviewSession(
  id: string,
  patch: Partial<Pick<ReviewSession, "draftBody">>,
): void {
  const list = readSessions();
  writeSessions(
    list.map((s) =>
      s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s,
    ),
  );
}

export function addReviewComment(
  sessionId: string,
  fields: Omit<ReviewComment, "id" | "ts">,
): ReviewComment {
  const list = readSessions();
  const c: ReviewComment = {
    ...fields,
    id: genId("cmt"),
    ts: Date.now(),
  };
  writeSessions(
    list.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            comments: [...s.comments, c],
            updatedAt: Date.now(),
          }
        : s,
    ),
  );
  return c;
}

export function resolveReviewComment(
  sessionId: string,
  commentId: string,
): void {
  const list = readSessions();
  writeSessions(
    list.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            comments: s.comments.map((c) =>
              c.id === commentId
                ? { ...c, resolvedAt: c.resolvedAt ? undefined : Date.now() }
                : c,
            ),
            updatedAt: Date.now(),
          }
        : s,
    ),
  );
}

export function deleteReviewComment(
  sessionId: string,
  commentId: string,
): void {
  const list = readSessions();
  writeSessions(
    list.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            comments: s.comments.filter((c) => c.id !== commentId),
            updatedAt: Date.now(),
          }
        : s,
    ),
  );
}

export function deleteReviewSession(id: string): void {
  writeSessions(readSessions().filter((s) => s.id !== id));
}
