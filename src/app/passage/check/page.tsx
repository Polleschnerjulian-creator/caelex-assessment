import type { Metadata } from "next";
import PassageCheckClient from "./PassageCheckClient";

/**
 * /passage/check — the public Passage teaser (ILA review #2).
 *
 * The export-control twin of /assessment/quick: describe your product,
 * get INDICATIVE control-list candidates from the deterministic corpus
 * matcher (zero AI cost, no login, nothing stored), with the honesty
 * framing baked in. The conversion path is the demo, not a fake verdict.
 */

export const metadata: Metadata = {
  title: "Could my product be export-controlled? — Caelex Passage",
  description:
    "Free 30-second check: describe your product and see which EU/US " +
    "control-list entries could be relevant. Keyword-based indication " +
    "with honest limits — not legal advice, no login, nothing stored.",
};

export default function PassageCheckPage() {
  return <PassageCheckClient />;
}
