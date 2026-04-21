/**
 * Provenance UI primitives — public barrel.
 *
 * Components:
 *   - ProvenanceChip   — the origin "sticker" (full / compact / icon density)
 *   - CausalBreadcrumb — the "⟵ weil …" inline explanation
 *
 * Design tokens live in `@/lib/design/trust-tokens`.
 */

export { ProvenanceChip } from "./ProvenanceChip";
export type { ChipDensity } from "./ProvenanceChip";

export { CausalBreadcrumb } from "./CausalBreadcrumb";

export { SidePeek } from "./SidePeek";
export type { TraceDTO } from "./SidePeek";

export { ModuleWhySidebar } from "./ModuleWhySidebar";
export type { ModuleScope } from "./ModuleWhySidebar";

export { AnimatedReveal } from "./AnimatedReveal";

export { ControlContextWindow } from "./ControlContextWindow";
export type { ControlContext } from "./ControlContextWindow";
