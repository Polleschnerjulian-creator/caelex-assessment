/**
 * cn — conditional-class helper for Transparency Panel components.
 *
 * Mirrors the shadcn/ui canonical helper (clsx + tailwind-merge) so
 * copy-pasted shadcn patterns drop in with zero adaptation.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
