"use client";

import dynamic from "next/dynamic";
import type { OperatorUniverse as UniverseData } from "@/lib/comply-v2/operator-universe.server";

/**
 * OperatorUniverseLazy — client wrapper around `next/dynamic` for the
 * heavy R3F scene (Sprint 10B).
 *
 * # Why this file exists (hotfix 2026-05-04)
 *
 * Pre-hotfix, the universe page (`/src/app/dashboard/universe/page.tsx`)
 * was a Server Component that did `nextDynamic(..., { ssr: false })`.
 * Next.js 15.5+ rejects that combination at build time:
 *
 *   Error: `ssr: false` is not allowed with `next/dynamic` in Server
 *   Components. Please move it into a Client Component.
 *
 * The fix per the Next.js docs is exactly what this file does: a thin
 * `"use client"` wrapper that does the dynamic import. The page (still
 * a Server Component) just renders this wrapper and forwards the
 * server-fetched `universe` prop. The R3F bundle still loads
 * client-side only — same UX, RSC-compatible build.
 *
 * # Why we still need ssr:false
 *
 * `@react-three/fiber`'s `<Canvas>` constructs a WebGL context on
 * import — it calls `document.createElement("canvas")` which throws
 * on Node. Server-rendering the R3F scene is impossible.
 */

// The dynamic import happens at MODULE evaluation, which under
// "use client" is exclusively client-side. ssr:false guarantees the
// child never runs through the server renderer even if the parent
// page (a Server Component) tries.
const OperatorUniverse = dynamic(
  () => import("./OperatorUniverse").then((m) => m.OperatorUniverse),
  {
    ssr: false,
    loading: () => (
      <div
        data-testid="universe-skeleton"
        className="palantir-surface caelex-content h-[640px] w-full animate-pulse rounded-md"
      />
    ),
  },
);

export interface OperatorUniverseLazyProps {
  universe: UniverseData;
}

export function OperatorUniverseLazy({ universe }: OperatorUniverseLazyProps) {
  return <OperatorUniverse universe={universe} />;
}
