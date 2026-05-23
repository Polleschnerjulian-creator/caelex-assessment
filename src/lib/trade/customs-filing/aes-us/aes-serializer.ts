/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Z14b — AES US XML serializer.
 *
 * Hand-rolled, mirrors the Z5 (BAFA ELAN-K2) + Z14a (ATLAS-DE) pattern.
 * CBP's modern AES CATAIR interface accepts XML over HTTPS; the legacy
 * EDI X.12 601 form is still supported but deprecated. We emit XML
 * because:
 *
 *   - Same escaping discipline as Z5 / Z14a — one mental model.
 *   - CBP's ACE Cargo Manifest interface is XML-first since 2018.
 *   - Trivial to convert XML → EDI 601 segments via a future
 *     transformer if the operator's broker still requires EDI.
 *
 * What we DO get right:
 *
 *   - All five mandatory XML 1.0 entity escapes
 *     (`&` → &amp;, `<` → &lt;, `>` → &gt;, `"` → &quot;, `'` → &apos;).
 *   - Numbers stringify via Number.toString() — locale-independent.
 *     AES accepts decimal "." (never locale-comma) per CATAIR § 5.2.
 *   - Empty / null / undefined values skipped at the element boundary.
 *   - Boolean leaves emit `Y` / `N` (AES convention — Y for true,
 *     N for false, NOT `true`/`false`).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  AesAddress,
  AesCarrier,
  AesCommodity,
  AesFiling,
  AesIntermediateConsignee,
  AesPayload,
  AesUltimateConsignee,
  AesUSPPI,
} from "./aes-payload";

// ─── Escape helpers ───────────────────────────────────────────────

/**
 * Escape arbitrary text for safe embedding inside an XML element's
 * text-content position. Mandatory set is `<` and `&`; we add `>`
 * defensively (some parsers reject `]]>` sequences) and pass UTF-8
 * through (AES is UTF-8 by spec per CATAIR § 4.1).
 *
 * Returns "" for nullish input rather than "null" / "undefined".
 */
export function escapeText(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escape for an XML attribute value. Same as text but additionally
 * encodes the two quote characters (we wrap attributes in `"`).
 */
export function escapeAttr(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Element builders ─────────────────────────────────────────────

/**
 * Emit a leaf element with text content. Skips when value is nullish /
 * empty / NaN.
 *
 * Numbers stringify via String(value) — locale-independent. AES
 * CATAIR § 5.2 requires "." as decimal separator; never use
 * toLocaleString here.
 *
 * Booleans emit `Y` / `N` per AES convention (not lowercase `true`).
 */
function leafEl(
  tag: string,
  value: string | number | boolean | null | undefined,
  indent: string,
): string {
  if (value == null) return "";
  if (typeof value === "string" && value.length === 0) return "";
  if (typeof value === "number" && Number.isNaN(value)) return "";

  const text =
    typeof value === "number"
      ? value.toString()
      : typeof value === "boolean"
        ? value
          ? "Y"
          : "N"
        : value;
  return `${indent}<${tag}>${escapeText(text)}</${tag}>\n`;
}

function openEl(
  tag: string,
  attrs: Record<string, string | undefined> | null,
  indent: string,
): string {
  let attrStr = "";
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v != null && v.length > 0) {
        attrStr += ` ${k}="${escapeAttr(v)}"`;
      }
    }
  }
  return `${indent}<${tag}${attrStr}>\n`;
}

function closeEl(tag: string, indent: string): string {
  return `${indent}</${tag}>\n`;
}

// ─── Block serializers ────────────────────────────────────────────

function addressXml(a: AesAddress, indent: string): string {
  let out = openEl("Address", null, indent);
  const inner = indent + "  ";
  out += leafEl("Street", a.Street, inner);
  out += leafEl("City", a.City, inner);
  out += leafEl("StateOrProvince", a.StateOrProvince, inner);
  out += leafEl("PostalCode", a.PostalCode, inner);
  out += leafEl("CountryCode", a.CountryCode, inner);
  out += closeEl("Address", indent);
  return out;
}

function usppiXml(u: AesUSPPI, indent: string): string {
  let out = openEl("USPPI", null, indent);
  const inner = indent + "  ";
  out += leafEl("Name", u.Name, inner);
  out += addressXml(u.Address, inner);
  out += leafEl("IdentifierType", u.IdentifierType, inner);
  out += leafEl("IdentifierValue", u.IdentifierValue, inner);
  out += leafEl("ContactName", u.ContactName, inner);
  out += leafEl("ContactPhone", u.ContactPhone, inner);
  out += leafEl("ContactEmail", u.ContactEmail, inner);
  out += closeEl("USPPI", indent);
  return out;
}

function ultimateConsigneeXml(c: AesUltimateConsignee, indent: string): string {
  let out = openEl("UltimateConsignee", null, indent);
  const inner = indent + "  ";
  out += leafEl("Name", c.Name, inner);
  out += addressXml(c.Address, inner);
  out += leafEl("Type", c.Type, inner);
  out += closeEl("UltimateConsignee", indent);
  return out;
}

function intermediateConsigneeXml(
  c: AesIntermediateConsignee,
  indent: string,
): string {
  let out = openEl("IntermediateConsignee", null, indent);
  const inner = indent + "  ";
  out += leafEl("Name", c.Name, inner);
  out += addressXml(c.Address, inner);
  out += closeEl("IntermediateConsignee", indent);
  return out;
}

function carrierXml(c: AesCarrier, indent: string): string {
  let out = openEl("Carrier", null, indent);
  const inner = indent + "  ";
  out += leafEl("Name", c.Name, inner);
  out += leafEl("SCACorIATA", c.SCACorIATA, inner);
  out += closeEl("Carrier", indent);
  return out;
}

function commodityXml(c: AesCommodity, indent: string): string {
  let out = openEl("Commodity", { LineNumber: String(c.LineNumber) }, indent);
  const inner = indent + "  ";
  out += leafEl("Description", c.Description, inner);
  out += leafEl("ScheduleBOrHTS", c.ScheduleBOrHTS, inner);
  out += leafEl("ECCN", c.ECCN, inner);
  out += leafEl("USML", c.USML, inner);
  out += leafEl("LicenseCode", c.LicenseCode, inner);
  out += leafEl("LicenseNumber", c.LicenseNumber, inner);
  out += leafEl("Quantity", c.Quantity, inner);
  out += leafEl("UnitOfMeasure", c.UnitOfMeasure, inner);
  out += leafEl("ValueUSD", c.ValueUSD, inner);
  out += leafEl("ShippingWeightKg", c.ShippingWeightKg, inner);
  out += leafEl("CountryOfOrigin", c.CountryOfOrigin, inner);
  out += leafEl("OriginIndicator", c.OriginIndicator, inner);
  out += leafEl("ExportInformationCode", c.ExportInformationCode, inner);
  out += closeEl("Commodity", indent);
  return out;
}

function filingXml(f: AesFiling, indent: string): string {
  let out = openEl(
    "Filing",
    { FilingAction: f.FilingAction, FilerType: f.FilerType },
    indent,
  );
  const inner = indent + "  ";
  out += leafEl("ShipmentReferenceNumber", f.ShipmentReferenceNumber, inner);
  out += leafEl("ExportDate", f.ExportDate, inner);
  out += usppiXml(f.USPPI, inner);
  out += ultimateConsigneeXml(f.UltimateConsignee, inner);
  if (f.IntermediateConsignee) {
    out += intermediateConsigneeXml(f.IntermediateConsignee, inner);
  }
  out += carrierXml(f.Carrier, inner);
  out += leafEl("TransportMode", f.TransportMode, inner);
  out += leafEl("PortOfExport", f.PortOfExport, inner);
  out += leafEl("CountryOfDestination", f.CountryOfDestination, inner);

  // Commodities schedule
  out += openEl("Commodities", null, inner);
  const cmdInner = inner + "  ";
  for (const c of f.Commodities) {
    out += commodityXml(c, cmdInner);
  }
  out += closeEl("Commodities", inner);

  out += leafEl("HazardousMaterials", f.HazardousMaterials, inner);
  out += leafEl("RoutedExportTransaction", f.RoutedExportTransaction, inner);
  out += leafEl("TotalValueUSD", f.TotalValueUSD, inner);

  out += closeEl("Filing", indent);
  return out;
}

// ─── Root serializer ──────────────────────────────────────────────

/**
 * Serialize an AesPayload to a UTF-8 XML string. Output begins with the
 * XML 1.0 declaration; root element is <AES_ExportFiling>.
 *
 * Output is byte-for-byte deterministic given identical input.
 */
export function serializeAesXml(payload: AesPayload): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += openEl(
    "AES_ExportFiling",
    {
      SchemaVersion: payload.SchemaVersion,
      Emitter: payload.Emitter,
      GeneratedAt: payload.GeneratedAt,
    },
    "",
  );
  xml += filingXml(payload.Filing, "  ");
  xml += closeEl("AES_ExportFiling", "");
  return xml;
}
