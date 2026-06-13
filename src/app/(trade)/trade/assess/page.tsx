/**
 * Caelex Passage — /trade/assess.
 *
 * Datasheet-intake wizard entry. Auth + TRADE product access are enforced by
 * the route-group layout (`(trade)/trade/layout.tsx`), so this server shell
 * just mounts the client orchestrator.
 *
 * Flow: upload a datasheet → confirm an evidence-cited classification → see the
 * Liefer-Landkarte → get a single audited verdict for a chosen destination.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { AssessFlow } from "./_components/AssessFlow";

export const metadata = {
  title: "Datenblatt prüfen — Caelex Passage",
};

export default function AssessPage() {
  return <AssessFlow />;
}
