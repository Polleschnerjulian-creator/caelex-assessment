/**
 * Public verification page for a Profile Snapshot.
 *
 *   GET /verity/profile-snapshot/:snapshotId
 *
 * No authentication. Server-rendered. Calls the verification service
 * directly — no HTTP round-trip to our own API. The page surfaces:
 *
 *   1. A large green-or-red status badge (valid / invalid / not found)
 *   2. Snapshot metadata in a human-readable form
 *   3. Copyable fields: snapshot id, hash, signature, public key
 *   4. The full canonical JSON (collapsible)
 *   5. A pre-filled Node.js snippet a regulator can run OFFLINE to
 *      independently verify the signature — no Caelex needed at all.
 *
 * Designed so a non-technical auditor can open the URL and immediately
 * see "✓ SIGNATURE VALID" without needing to know what Ed25519 is,
 * while still giving a technical reviewer every byte needed to go
 * deeper.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyProfileSnapshot } from "@/lib/services/profile-snapshot-service";
import { VerifyView } from "./VerifyView";

export const metadata: Metadata = {
  title: "Verity — Profile Snapshot Verification",
  description:
    "Independent, offline-verifiable proof of an operator-profile snapshot.",
  robots: { index: false, follow: false },
};

// Always render dynamically — the verification must reflect current
// issuer-key state, not a stale build-time snapshot.
export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ snapshotId: string }>;
}) {
  const { snapshotId } = await params;

  if (!snapshotId || typeof snapshotId !== "string") {
    notFound();
  }

  const { snapshot, report } = await verifyProfileSnapshot(snapshotId);

  if (!snapshot) {
    // 404 route — renders Next.js' default not-found, which the caller
    // can customise globally via a not-found.tsx.
    notFound();
  }

  return (
    <VerifyView
      snapshot={{
        id: snapshot.id,
        snapshotHash: snapshot.snapshotHash,
        issuerKeyId: snapshot.issuerKeyId,
        signature: snapshot.signature,
        frozenAt: snapshot.frozenAt.toISOString(),
        frozenBy: snapshot.frozenBy,
        purpose: snapshot.purpose,
        canonicalJson: snapshot.canonicalJson,
      }}
      report={report}
    />
  );
}
