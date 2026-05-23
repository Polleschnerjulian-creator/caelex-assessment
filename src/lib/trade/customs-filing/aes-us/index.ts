/**
 * Z14b — AES US customs filing — public surface.
 *
 * The combined `buildAesXml(input)` entry-point is what UI callers
 * want — pure function from Caelex domain shape to AES-conformant
 * XML string.
 *
 * Sub-modules:
 *   - aes-payload.ts    — TypeScript surface mirroring CBP CATAIR
 *   - aes-builder.ts    — TradeOperation → AesPayload
 *   - aes-serializer.ts — AesPayload → XML string
 */

import { buildAesPayload, type AesBuilderInput } from "./aes-builder";
import { serializeAesXml } from "./aes-serializer";

export {
  buildAesPayload,
  mapLicenseCode,
  mapExportInformationCode,
  mapConsigneeType,
  mapOriginIndicator,
  type AesBuilderInput,
} from "./aes-builder";
export { serializeAesXml, escapeText, escapeAttr } from "./aes-serializer";
export {
  AES_SCHEMA_VERSION,
  type AesAddress,
  type AesCarrier,
  type AesCommodity,
  type AesFiling,
  type AesFilingAction,
  type AesIntermediateConsignee,
  type AesPayload,
  type AesTransportMode,
  type AesUltimateConsignee,
  type AesUSPPI,
} from "./aes-payload";

/**
 * Top-level combined entry-point. Build an AES US ExportFiling XML
 * from a Caelex TradeOperation + USPPI context, in one call.
 *
 * Pure function — same input → same XML string.
 */
export function buildAesXml(input: AesBuilderInput): string {
  const payload = buildAesPayload(input);
  return serializeAesXml(payload);
}
