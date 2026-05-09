/**
 * Atlas Drafting — Multi-mandate store (Bundle 36, B1).
 *
 * Bundle 31 (S1) introduced the single-mandate intake form. Bundle 31's
 * MVP assumed Marie works on one mandate at a time — fine until she
 * opens a second mandate in another browser tab and overwrites the
 * first.
 *
 * This module lifts the intake-form into a multi-mandate store with an
 * "active mandate" pointer. Marie can:
 *   - have several mandates saved (Sky-Sat / Aero-Partners / etc.)
 *   - switch between them via the studio header dropdown
 *   - draft library entries auto-tag with the active mandate's id
 *   - section-by-section workspaces become per-mandate (so multiple
 *     parallel drafts don't clobber each other)
 *
 * Migration: on first read after the upgrade, if the legacy single-
 * mandate key (atlas-drafting-mandate-intake) exists and the new
 * mandates store does not, the legacy intake is wrapped into the new
 * store as a single mandate and set active. The legacy key is left
 * alone — bundle 31's mandate-intake.ts shim now reads through this
 * store, so the legacy key is no longer touched anyway.
 *
 * Stage-2 (Bundle 36's eventual backend lift) will move this to per-
 * org Postgres so a whole practice shares its mandate roster.
 */

import {
  EMPTY_INTAKE,
  MANDATE_INTAKE_KEY,
  type MandateIntake,
} from "./mandate-intake";

export const MANDATE_STORE_KEY = "atlas-drafting-mandates";

const MANDATE_CAP = 25;

export interface Mandate {
  id: string;
  /** Display name. Defaults to client name if omitted. */
  name: string;
  intake: MandateIntake;
  createdAt: number;
  updatedAt: number;
}

export interface MandateStore {
  mandates: Mandate[];
  activeMandateId: string | null;
}

const EMPTY_STORE: MandateStore = { mandates: [], activeMandateId: null };

const isMandate = (v: unknown): v is Mandate =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Mandate).id === "string" &&
  typeof (v as Mandate).name === "string" &&
  typeof (v as Mandate).intake === "object" &&
  typeof (v as Mandate).createdAt === "number";

const isStore = (v: unknown): v is MandateStore =>
  typeof v === "object" &&
  v !== null &&
  Array.isArray((v as MandateStore).mandates) &&
  (v as MandateStore).mandates.every(isMandate);

function genId(): string {
  return `mandate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStoreRaw(): MandateStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MANDATE_STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isStore(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStore(store: MandateStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MANDATE_STORE_KEY, JSON.stringify(store));
  } catch {
    /* quota — silent. */
  }
}

/* Lazy migration from legacy single-mandate intake. Idempotent: only
   runs on the first read after the upgrade. */
function migrateLegacyIfNeeded(): MandateStore | null {
  if (typeof window === "undefined") return null;
  try {
    const legacyRaw = window.localStorage.getItem(MANDATE_INTAKE_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw);
    if (typeof legacy !== "object" || legacy === null) return null;
    /* Only migrate if the legacy intake looks substantive. */
    const keys: (keyof MandateIntake)[] = [
      "client",
      "satelliteSpecs",
      "missionProfile",
      "frequencies",
      "launchDate",
    ];
    const hasContent = keys.some(
      (k) => typeof legacy[k] === "string" && legacy[k].trim(),
    );
    if (!hasContent) return null;
    const intake: MandateIntake = {
      ...EMPTY_INTAKE,
      ...legacy,
    };
    const m: Mandate = {
      id: genId(),
      name: intake.client.trim() || "Mandant 1",
      intake,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const store: MandateStore = {
      mandates: [m],
      activeMandateId: m.id,
    };
    writeStore(store);
    return store;
  } catch {
    return null;
  }
}

export function getMandateStore(): MandateStore {
  const existing = readStoreRaw();
  if (existing) return existing;
  const migrated = migrateLegacyIfNeeded();
  if (migrated) return migrated;
  return EMPTY_STORE;
}

export function listMandates(): Mandate[] {
  return getMandateStore().mandates;
}

export function getActiveMandate(): Mandate | null {
  const store = getMandateStore();
  if (!store.activeMandateId) return null;
  return store.mandates.find((m) => m.id === store.activeMandateId) ?? null;
}

export function setActiveMandate(id: string | null): void {
  const store = getMandateStore();
  writeStore({ ...store, activeMandateId: id });
}

export function createMandate(args: {
  name?: string;
  intake?: Partial<MandateIntake>;
}): Mandate {
  const store = getMandateStore();
  const intake: MandateIntake = { ...EMPTY_INTAKE, ...args.intake };
  const m: Mandate = {
    id: genId(),
    name:
      (args.name || intake.client).trim() ||
      `Mandant ${store.mandates.length + 1}`,
    intake,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const next: MandateStore = {
    mandates: [m, ...store.mandates].slice(0, MANDATE_CAP),
    activeMandateId: m.id,
  };
  writeStore(next);
  return m;
}

export function updateMandate(
  id: string,
  patch: Partial<Pick<Mandate, "name" | "intake">>,
): void {
  const store = getMandateStore();
  const next: MandateStore = {
    ...store,
    mandates: store.mandates.map((m) =>
      m.id === id
        ? {
            ...m,
            ...patch,
            intake: patch.intake ? { ...m.intake, ...patch.intake } : m.intake,
            updatedAt: Date.now(),
          }
        : m,
    ),
  };
  writeStore(next);
}

export function deleteMandate(id: string): void {
  const store = getMandateStore();
  const remaining = store.mandates.filter((m) => m.id !== id);
  /* If the active mandate is deleted, fall back to the next-newest or
     no-active. */
  const activeId =
    store.activeMandateId === id
      ? (remaining[0]?.id ?? null)
      : store.activeMandateId;
  writeStore({ mandates: remaining, activeMandateId: activeId });
}
