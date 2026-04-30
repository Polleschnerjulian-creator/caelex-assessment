/**
 * cn — canonical conditional-class helper.
 *
 * Combines clsx (multi-class composition with conditionals) with
 * tailwind-merge (resolves Tailwind class-conflict semantics, e.g.
 * `"px-2 px-4"` → `"px-4"`).
 *
 * This is the standard shadcn/ui pattern. Any shadcn copy-paste
 * snippet imports `cn` from `"@/lib/utils"` and works as-is.
 *
 * Note: A separate `cn` exists at `src/lib/transparency/cn.ts` for
 * historical Pharos-Transparency reasons. Do not import that one
 * from Comply-V2 surfaces — keep the dependency direction clean.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
