/**
 * Verity 2036 — Proof Provider Registry
 *
 * Manages available proof providers and dispatches to the correct one
 * based on the scheme identifier.
 */

import type { ProofProvider, ProofResult, VerifyContext } from "./types.js";

/** Registry of proof providers by scheme name */
const providers = new Map<string, ProofProvider>();

/**
 * Register a proof provider.
 * Throws if a provider with the same scheme is already registered.
 */
export function registerProvider(provider: ProofProvider): void {
  if (providers.has(provider.scheme)) {
    throw new Error(
      `Proof provider already registered for scheme: ${provider.scheme}`,
    );
  }
  providers.set(provider.scheme, provider);
}

/**
 * Get a registered proof provider by scheme name.
 */
export function getProvider(scheme: string): ProofProvider | undefined {
  return providers.get(scheme);
}

/**
 * Verify a proof by dispatching to the correct provider based on scheme.
 *
 * @param proof - The proof to verify
 * @param context - Verification context
 * @returns true if the proof is valid
 * @throws if no provider is registered for the proof's scheme
 */
export async function verifyProofByScheme(
  proof: ProofResult,
  context: VerifyContext,
): Promise<boolean> {
  const provider = providers.get(proof.scheme);
  if (!provider) {
    throw new Error(`No proof provider registered for scheme: ${proof.scheme}`);
  }
  return provider.verifyProof(proof, context);
}

/**
 * List all registered scheme names.
 */
export function listRegisteredSchemes(): string[] {
  return Array.from(providers.keys());
}

/**
 * Clear all registered providers (for testing).
 */
export function clearProviders(): void {
  providers.clear();
}
