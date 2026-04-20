import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDidDocument } from "@/lib/verity/vc/verifiable-credential";

export const runtime = "nodejs";

// Let this document update when the active issuer key rotates;
// Vercel/Next caches by default, so we mark it revalidatable.
export const revalidate = 60;

/**
 * GET /.well-known/did.json
 *
 * Serves the `did:web:caelex.eu` DID Document that any
 * W3C-Verifiable-Credentials aware verifier resolves when checking a
 * Verity credential. The verificationMethod points at the current
 * active Verity Ed25519 issuer key (encoded in multibase per the
 * ed25519-2020 cryptosuite).
 *
 * When a verifier receives a Verity VC whose `proof.verificationMethod`
 * is `did:web:caelex.eu#<keyId>`, the standard resolution algorithm
 * fetches this URL, finds the matching `verificationMethod`, and
 * uses the embedded `publicKeyMultibase` to check the proof.
 *
 * Side-benefit: makes caelex.eu a first-class issuer in the EU
 * Digital Identity Wallet (EUDIW) framework without needing to run
 * a full DID registry service. `did:web` resolution is just HTTPS.
 */
export async function GET() {
  const key = await prisma.verityIssuerKey.findFirst({
    where: { active: true },
    select: { keyId: true, publicKeyHex: true },
  });

  if (!key) {
    // No key yet — return a minimally valid DID doc with no methods
    // so resolvers get a proper document shape, not 404.
    return NextResponse.json(
      {
        "@context": ["https://www.w3.org/ns/did/v1"],
        id: "did:web:caelex.eu",
      },
      {
        headers: {
          "Content-Type": "application/did+json",
          "Cache-Control": "public, max-age=60",
        },
      },
    );
  }

  const doc = buildDidDocument(key.publicKeyHex, key.keyId);
  return NextResponse.json(doc, {
    headers: {
      "Content-Type": "application/did+json",
      "Cache-Control": "public, max-age=60",
    },
  });
}
