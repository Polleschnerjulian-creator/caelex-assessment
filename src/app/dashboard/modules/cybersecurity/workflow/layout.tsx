/**
 * Workflow route layout — loads the Transparency-Panel-specific
 * fonts (Geist Mono) and wires the scoped token CSS. Children render
 * inside a `.caelex-transparency` wrapper so the new token set
 * activates ONLY inside this route — the rest of Caelex stays on the
 * legacy navy palette.
 *
 * Inter is already loaded globally from the root layout, so we only
 * need to add the mono font here.
 */

import type { ReactNode } from "react";
import { Geist_Mono } from "next/font/google";
import "@/styles/transparency-tokens.css";

// Geist Mono — Google Fonts variant serves discrete weights only.
// 400 is the default mono body weight. Brief's "450" nudge is achieved
// visually via letter-spacing / opacity rather than font-weight.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export default function WorkflowLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${geistMono.variable} caelex-transparency`}>
      {children}
    </div>
  );
}
