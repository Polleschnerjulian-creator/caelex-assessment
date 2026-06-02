"use client";

/**
 * Atlas Drafting Chat — browser-context builder (Bundle 46).
 *
 * The chat backend is stateless. Every chat turn ships a snapshot of
 * the browser's drafting state (mandates / workspaces / library) so
 * the LLM can reason about it without read-tools. This module is the
 * snapshot builder.
 *
 * Slim projections: workspaces ship only their item-status map (not
 * the bodies — those are big and the LLM doesn't need them to plan).
 * Library ships the most recent 10 entries with metadata only.
 *
 * Privacy note: every field that crosses the wire here is already
 * sitting in the user's localStorage — the chat backend doesn't see
 * anything the user couldn't read in DevTools. No new exposure.
 */

import { getMandateStore } from "../mandate-store";
import { listPlanWorkspaces } from "../plan-workspace-store";
import { getDraftLibrary } from "../drafting-history";
import { getClauses } from "../clause-library";
import { getAttachedClauseIds } from "./attached-clauses-store";
import type { BrowserContext } from "./types";

const PRIVILEGE_STORAGE_KEY = "atlas-drafting-privileged-mode";

/** Empty default for SSR — the chat page only renders client-side, so
 *  this branch is mostly defensive. */
const EMPTY: BrowserContext = {
  mandates: [],
  activeMandateId: null,
  activeWorkspaces: [],
  recentDrafts: [],
  attachedClauses: [],
  outputLang: "de",
  privileged: false,
};

export function buildBrowserContext(opts: {
  outputLang: "de" | "en";
}): BrowserContext {
  if (typeof window === "undefined") {
    return { ...EMPTY, outputLang: opts.outputLang };
  }

  const store = getMandateStore();
  const workspaces = listPlanWorkspaces().slice(0, 20);
  const drafts = getDraftLibrary().slice(0, 10);

  let privileged = false;
  try {
    privileged = window.localStorage.getItem(PRIVILEGE_STORAGE_KEY) === "true";
  } catch {
    /* private browsing — silent fallback. */
  }

  return {
    mandates: store.mandates,
    activeMandateId: store.activeMandateId,
    activeWorkspaces: workspaces.map((w) => ({
      id: w.id,
      planId: w.planId,
      mandateId: w.mandateId,
      outputLang: w.outputLang,
      itemStatuses: Object.fromEntries(
        Object.entries(w.items).map(([k, v]) => [k, v.status]),
      ),
      updatedAt: w.updatedAt,
    })),
    recentDrafts: drafts.map((d) => ({
      id: d.id,
      kind: d.kind,
      title: d.title,
      outputLocale: d.outputLocale,
      ts: d.ts,
      mandateId: d.mandateId,
      mandateName: d.mandateName,
    })),
    attachedClauses: (() => {
      const attachedIds = new Set(getAttachedClauseIds());
      return getClauses().filter((c) => attachedIds.has(c.id));
    })(),
    outputLang: opts.outputLang,
    privileged,
  };
}
