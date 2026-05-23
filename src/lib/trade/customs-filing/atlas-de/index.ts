/**
 * Z14a — ATLAS-DE customs filing — public surface.
 *
 * The combined `buildAtlasXml(input)` entry-point is what UI callers
 * want — pure function from Caelex domain shape to ATLAS-conformant
 * XML string.
 *
 * Sub-modules:
 *   - atlas-payload.ts    — TypeScript surface mirroring ATLAS XSD
 *   - atlas-builder.ts    — TradeOperation → AtlasPayload
 *   - atlas-serializer.ts — AtlasPayload → XML string
 */

import { buildAtlasPayload, type AtlasBuilderInput } from "./atlas-builder";
import { serializeAtlasXml } from "./atlas-serializer";

export {
  buildAtlasPayload,
  mapDeclarationType,
  mapLicenseTypeCode,
  type AtlasBuilderInput,
} from "./atlas-builder";
export { serializeAtlasXml, escapeText, escapeAttr } from "./atlas-serializer";
export {
  ATLAS_XSD_VERSION,
  type AtlasAddress,
  type AtlasConsignee,
  type AtlasDeclaration,
  type AtlasDeclarationType,
  type AtlasExporter,
  type AtlasItem,
  type AtlasLicenseReference,
  type AtlasOffice,
  type AtlasPayload,
  type AtlasPreviousDocument,
  type AtlasTransportDocument,
} from "./atlas-payload";

/**
 * Top-level combined entry-point. Build an ATLAS Ausfuhranmeldung XML
 * from a Caelex TradeOperation + exporter context, in one call.
 *
 * Pure function — same input → same XML string. Caller is responsible
 * for fixing `generatedAt` if they want byte-for-byte reproducibility.
 */
export function buildAtlasXml(input: AtlasBuilderInput): string {
  const payload = buildAtlasPayload(input);
  return serializeAtlasXml(payload);
}
