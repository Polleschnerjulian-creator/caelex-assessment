/**
 * Z5 — BAFA ELAN-K2 export — public surface.
 *
 * The combined `buildBafaXmlReport(input)` entry-point is what
 * UI callers want — pure function from Caelex domain shape to
 * BAFA-conformant XML string.
 *
 * Sub-modules:
 *   - xsd-types.ts      (Z5a) — TypeScript surface mirroring BAFA's XSD
 *   - report-builder.ts (Z5b) — TradeOperation → BafaElanK2Document
 *   - xml-serializer.ts (Z5b) — BafaElanK2Document → XML string
 *   - xsd-version.ts    (Z5c) — version constant + drift watcher
 */

import { buildBafaReport, type BafaReportInput } from "./report-builder";
import { serializeBafaXml } from "./xml-serializer";

export { buildBafaReport, type BafaReportInput } from "./report-builder";
export { serializeBafaXml, escapeText, escapeAttr } from "./xml-serializer";
export {
  BAFA_XSD_VERSION,
  type BafaAntrag,
  type BafaAntragsart,
  type BafaAntragsteller,
  type BafaAnschrift,
  type BafaElanK2Document,
  type BafaEmpfaenger,
  type BafaEndverwender,
  type BafaLieferung,
  type BafaVerwendungszweck,
  type BafaWare,
} from "./xsd-types";

/**
 * Top-level combined entry-point. Build a BAFA ELAN-K2 XML report from
 * a Caelex TradeOperation + applicant context, in one call.
 *
 * Pure function — same input → same XML string. Caller is responsible
 * for fixing `generatedAt` if they want byte-for-byte reproducibility
 * across runs.
 */
export function buildBafaXmlReport(input: BafaReportInput): string {
  const doc = buildBafaReport(input);
  return serializeBafaXml(doc);
}
