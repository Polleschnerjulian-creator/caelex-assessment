/**
 * Shared glass styles for the Generate2 document generator components.
 * L-2: Extracted to avoid duplication across DocumentPreviewPanel, ContextPanel, and GenerationProgress.
 */

/** Inner glass panel style — used for cards, tables, and inset containers within glass panels. */
export const innerGlass: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.45)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  borderRadius: 14,
  boxShadow:
    "0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
};
