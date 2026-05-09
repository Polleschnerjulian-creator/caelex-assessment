/**
 * Atlas Drafting — Section-by-Section workspace store (Bundle 35, S5).
 *
 * Backs the per-section state (status + body text + last-edited
 * timestamp) for the section-by-section workspace at
 * /atlas/drafting/auth/section-by-section.
 *
 * Single active workspace per browser. Bundle 36's mandate-binding
 * will lift this off localStorage onto a per-matter scope so a lawyer
 * can have several drafts in flight without overwriting each other.
 *
 * Defensive shape-check pattern matches drafting-history /
 * mandate-intake / clause-library — schema drift survives.
 */

import type { SectionStatus } from "./auth-sections";

export const SECTION_WORKSPACE_KEY = "atlas-drafting-section-workspace";

export interface SectionState {
  status: SectionStatus;
  /** Generated/edited content. */
  body: string;
  /** When the user last touched this section. */
  ts: number;
}

export interface SectionWorkspace {
  /** Filing jurisdiction (e.g. "DE"). Read once on workspace creation. */
  jurisdiction: string;
  /** Operator type key (matches OPERATOR_TYPES on the studio page). */
  operatorType: string;
  /** Output draft language at time of workspace creation. */
  outputLang: "de" | "en";
  /** Per-section state, keyed by AuthSection.id. */
  sections: Record<string, SectionState>;
  /** Workspace creation timestamp. */
  createdAt: number;
  /** Last activity timestamp — used for "resume your draft" hints. */
  updatedAt: number;
}

const isStatus = (v: unknown): v is SectionStatus =>
  v === "pending" || v === "generated" || v === "accepted" || v === "skipped";

const isSectionState = (v: unknown): v is SectionState =>
  typeof v === "object" &&
  v !== null &&
  isStatus((v as SectionState).status) &&
  typeof (v as SectionState).body === "string" &&
  typeof (v as SectionState).ts === "number";

const isWorkspace = (v: unknown): v is SectionWorkspace => {
  if (typeof v !== "object" || v === null) return false;
  const w = v as SectionWorkspace;
  if (typeof w.jurisdiction !== "string") return false;
  if (typeof w.operatorType !== "string") return false;
  if (w.outputLang !== "de" && w.outputLang !== "en") return false;
  if (typeof w.sections !== "object" || w.sections === null) return false;
  for (const key in w.sections) {
    if (!isSectionState((w.sections as Record<string, unknown>)[key]))
      return false;
  }
  return true;
};

export function getWorkspace(): SectionWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SECTION_WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isWorkspace(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveWorkspace(w: SectionWorkspace): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SECTION_WORKSPACE_KEY,
      JSON.stringify({ ...w, updatedAt: Date.now() }),
    );
  } catch {
    /* quota / private-browsing — silent. */
  }
}

export function clearWorkspace(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SECTION_WORKSPACE_KEY);
  } catch {
    /* silent. */
  }
}

export function createWorkspace(args: {
  jurisdiction: string;
  operatorType: string;
  outputLang: "de" | "en";
  sectionIds: string[];
}): SectionWorkspace {
  const sections: Record<string, SectionState> = {};
  for (const id of args.sectionIds) {
    sections[id] = { status: "pending", body: "", ts: 0 };
  }
  const now = Date.now();
  const ws: SectionWorkspace = {
    jurisdiction: args.jurisdiction,
    operatorType: args.operatorType,
    outputLang: args.outputLang,
    sections,
    createdAt: now,
    updatedAt: now,
  };
  saveWorkspace(ws);
  return ws;
}

/**
 * Compose all accepted (or generated) sections into one Markdown
 * document for export / clipboard. Sections in "skipped" or "pending"
 * status are omitted.
 */
export function composeFullDraft(
  ws: SectionWorkspace,
  sectionTitles: Record<string, string>,
): string {
  const parts: string[] = [];
  for (const id of Object.keys(ws.sections)) {
    const s = ws.sections[id];
    if (s.status === "skipped" || s.status === "pending") continue;
    parts.push(`## ${sectionTitles[id] ?? id}\n\n${s.body.trim()}`);
  }
  return parts.join("\n\n---\n\n");
}
