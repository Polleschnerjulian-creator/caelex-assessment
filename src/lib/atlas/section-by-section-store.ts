/**
 * Atlas Drafting — Section-by-Section workspace store.
 *
 * Bundle 35 (S5) introduced the workspace as a single localStorage
 * record. Bundle 36 (B1) introduced multi-mandate, but the workspace
 * stayed singular — meaning: if Marie had a Sky-Sat section-by-section
 * draft in flight and switched the active mandate to Aero-Partners,
 * starting a new workspace clobbered the Sky-Sat one.
 *
 * Bundle 42 fixes that: the store now holds a LIST of workspaces, each
 * keyed by the composite tuple `{mandateId, jurisdiction, operatorType,
 * outputLang}`. Switching mandate or jurisdiction loads the matching
 * workspace if one exists, otherwise creates a fresh one. The
 * previously-active workspace stays put in localStorage.
 *
 * Migration: on first read after the upgrade, if the legacy single-
 * workspace key (atlas-drafting-section-workspace) exists, it is
 * wrapped into the new multi-workspace store as one entry with
 * `mandateId = null` (i.e. "no mandate" workspace). Marie's pre-B42
 * work survives.
 *
 * Defensive shape-check on hydrate matches the rest of the drafting
 * MVP modules — schema drift survives.
 */

import type { SectionStatus } from "./auth-sections";

/* Bundle 35 — legacy single-workspace key. Read once for migration. */
export const LEGACY_SECTION_WORKSPACE_KEY = "atlas-drafting-section-workspace";

/* Bundle 42 — new multi-workspace key. */
export const SECTION_WORKSPACES_KEY = "atlas-drafting-section-workspaces";

/* Defensive cap so a runaway loop can't blow the localStorage quota. */
const WORKSPACE_CAP = 50;

export interface SectionState {
  status: SectionStatus;
  /** Generated/edited content. */
  body: string;
  /** When the user last touched this section. */
  ts: number;
}

export interface SectionWorkspace {
  /** Composite id derived from {mandateId, jurisdiction, operatorType,
   *  outputLang}. Used as the lookup key. */
  id: string;
  /** Mandate this workspace belongs to. null = "no active mandate"
   *  workspace (the legacy migration path also lands here). */
  mandateId: string | null;
  /** Filing jurisdiction (e.g. "DE"). */
  jurisdiction: string;
  /** Operator type key (matches OPERATOR_TYPES on the studio page). */
  operatorType: string;
  /** Output draft language at time of workspace creation. */
  outputLang: "de" | "en";
  /** Per-section state, keyed by AuthSection.id. */
  sections: Record<string, SectionState>;
  /** Workspace creation timestamp. */
  createdAt: number;
  /** Last activity timestamp. */
  updatedAt: number;
}

/** Compose the lookup id from the four identity fields. */
export function workspaceIdFor(args: {
  mandateId: string | null;
  jurisdiction: string;
  operatorType: string;
  outputLang: "de" | "en";
}): string {
  /* `none` sentinel keeps "no mandate" workspaces distinct from any
     real mandate id. */
  return `${args.mandateId ?? "none"}::${args.jurisdiction}::${args.operatorType}::${args.outputLang}`;
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
  if (typeof w.id !== "string") return false;
  if (w.mandateId !== null && typeof w.mandateId !== "string") return false;
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

function readWorkspaces(): SectionWorkspace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SECTION_WORKSPACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWorkspace);
  } catch {
    return [];
  }
}

function writeWorkspaces(list: SectionWorkspace[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SECTION_WORKSPACES_KEY,
      JSON.stringify(list.slice(0, WORKSPACE_CAP)),
    );
  } catch {
    /* quota / private-browsing — silent. */
  }
}

/* Idempotent migration from the bundle-35 singular key. Runs the first
   time the store is read after the bundle-42 upgrade and never again
   (because the new multi-key now exists). */
function migrateLegacyIfNeeded(): SectionWorkspace[] | null {
  if (typeof window === "undefined") return null;
  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_SECTION_WORKSPACE_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw);
    if (typeof legacy !== "object" || legacy === null) return null;
    /* The legacy shape has jurisdiction + operatorType + outputLang +
       sections + createdAt + updatedAt but no id / mandateId. */
    const j = (legacy as { jurisdiction?: unknown }).jurisdiction;
    const op = (legacy as { operatorType?: unknown }).operatorType;
    const lang = (legacy as { outputLang?: unknown }).outputLang;
    const sections = (legacy as { sections?: unknown }).sections;
    if (
      typeof j !== "string" ||
      typeof op !== "string" ||
      (lang !== "de" && lang !== "en") ||
      typeof sections !== "object" ||
      sections === null
    ) {
      return null;
    }
    const ws: SectionWorkspace = {
      id: workspaceIdFor({
        mandateId: null,
        jurisdiction: j,
        operatorType: op,
        outputLang: lang,
      }),
      mandateId: null,
      jurisdiction: j,
      operatorType: op,
      outputLang: lang,
      sections: sections as Record<string, SectionState>,
      createdAt:
        typeof (legacy as { createdAt?: unknown }).createdAt === "number"
          ? (legacy as { createdAt: number }).createdAt
          : Date.now(),
      updatedAt:
        typeof (legacy as { updatedAt?: unknown }).updatedAt === "number"
          ? (legacy as { updatedAt: number }).updatedAt
          : Date.now(),
    };
    writeWorkspaces([ws]);
    return [ws];
  } catch {
    return null;
  }
}

/* Public API ─────────────────────────────────────────────────────── */

export function listWorkspaces(): SectionWorkspace[] {
  const existing = readWorkspaces();
  if (existing.length > 0) return existing;
  const migrated = migrateLegacyIfNeeded();
  return migrated ?? [];
}

export function getWorkspaceFor(args: {
  mandateId: string | null;
  jurisdiction: string;
  operatorType: string;
  outputLang: "de" | "en";
}): SectionWorkspace | null {
  const id = workspaceIdFor(args);
  return listWorkspaces().find((w) => w.id === id) ?? null;
}

/** Upsert: replaces an existing workspace with the same id, otherwise
 *  prepends. Bumps updatedAt on every write. */
export function saveWorkspace(ws: SectionWorkspace): void {
  const list = listWorkspaces();
  const next = ws.id
    ? { ...ws, updatedAt: Date.now() }
    : { ...ws, updatedAt: Date.now() };
  const without = list.filter((w) => w.id !== ws.id);
  writeWorkspaces([next, ...without]);
}

export function deleteWorkspace(id: string): void {
  writeWorkspaces(listWorkspaces().filter((w) => w.id !== id));
}

export function clearAllWorkspaces(): void {
  writeWorkspaces([]);
}

export function createWorkspace(args: {
  mandateId: string | null;
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
    id: workspaceIdFor(args),
    mandateId: args.mandateId,
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
