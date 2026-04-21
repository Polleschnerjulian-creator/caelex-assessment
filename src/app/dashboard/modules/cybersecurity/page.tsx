/**
 * /dashboard/modules/cybersecurity → workflow redirect.
 *
 * The sidebar-based Tier-C layout is now THE cybersecurity view.
 * Opening this URL lands you directly on the workflow shell.
 *
 * The previous (classic, vertical-list) UI lives at /classic and is
 * reached via an "Open classic view" link inside workflow tab bodies
 * whenever functionality hasn't been inlined yet (Assessment-Field-Form,
 * Evidence-Upload, etc.). Nothing is lost.
 */

import { redirect } from "next/navigation";

export default function CybersecurityPage() {
  redirect("/dashboard/modules/cybersecurity/workflow");
}
