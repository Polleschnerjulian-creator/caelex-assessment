/**
 * Global generation progress store.
 *
 * Uses the "external store" pattern (useSyncExternalStore) so that:
 * 1. The generation fetch loop can update progress even after Generate2Page unmounts
 * 2. Layout-level components (Astra FAB ring) can subscribe without prop-drilling
 * 3. When the user navigates back, Generate2Page re-syncs from this store
 *
 * JavaScript never GC's a running Promise — so the async fetch loop in
 * handleGenerate/handleGeneratePackage keeps running after unmount. setState
 * becomes a no-op (React 18), but this store remains alive.
 */

"use client";

export interface GenerationProgress {
  /** Whether a generation is currently running */
  active: boolean;
  /** 0–100 progress percentage */
  progress: number;
  /** Current generation phase */
  phase: "idle" | "init" | "sections" | "finalizing" | "completed" | "failed";
  /** Which document type is being generated right now */
  documentType: string | null;
  /** Current section index (0-based) */
  currentSection: number;
  /** Total sections for the current document */
  totalSections: number;
  /** Package mode: how many docs are done */
  completedDocs: number;
  /** Package mode: total docs to generate */
  totalDocs: number;
  /** Whether this is a package generation */
  isPackage: boolean;
  /** Error message if generation failed */
  error: string | null;
}

const INITIAL_STATE: GenerationProgress = {
  active: false,
  progress: 0,
  phase: "idle",
  documentType: null,
  currentSection: 0,
  totalSections: 0,
  completedDocs: 0,
  totalDocs: 0,
  isPackage: false,
  error: null,
};

let state: GenerationProgress = { ...INITIAL_STATE };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

/** Get current snapshot (for useSyncExternalStore) */
export function getGenerationSnapshot(): GenerationProgress {
  return state;
}

/** Subscribe to changes (for useSyncExternalStore) */
export function subscribeGeneration(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Update progress from the generation loop */
export function updateGenerationProgress(partial: Partial<GenerationProgress>) {
  state = { ...state, ...partial };
  emit();
}

/** Compute progress percentage for single-doc generation */
export function computeSingleDocProgress(
  phase: GenerationProgress["phase"],
  currentSection: number,
  totalSections: number,
): number {
  if (phase === "idle") return 0;
  if (phase === "init") return 2;
  if (phase === "sections" && totalSections > 0) {
    // Sections take 2%–92% of the bar
    return 2 + Math.round((currentSection / totalSections) * 90);
  }
  if (phase === "finalizing") return 95;
  if (phase === "completed") return 100;
  return 0;
}

/** Compute progress percentage for package generation */
export function computePackageProgress(
  completedDocs: number,
  totalDocs: number,
  currentSection: number,
  totalSections: number,
): number {
  if (totalDocs === 0) return 0;
  // Each doc is an equal slice of the total
  const perDoc = 100 / totalDocs;
  const docBase = completedDocs * perDoc;
  // Within the current doc, sections are proportional
  const sectionProgress =
    totalSections > 0 ? (currentSection / totalSections) * perDoc : 0;
  return Math.min(Math.round(docBase + sectionProgress), 100);
}

/** Reset the store (when generation completes or is cancelled) */
export function resetGenerationProgress() {
  state = { ...INITIAL_STATE };
  emit();
}
