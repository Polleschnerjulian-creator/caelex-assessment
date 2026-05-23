/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Z14a — ATLAS-DE XML serializer.
 *
 * Hand-rolled, mirrors the Z5 (BAFA ELAN-K2) pattern exactly. We
 * deliberately avoid xmlbuilder2 / fast-xml-parser:
 *
 *   - Tiny element vocabulary (~12 element types) — not worth a dep.
 *   - Output is byte-for-byte deterministic for snapshot tests.
 *   - Escaping rules are simple and auditable (XML 1.0 + UTF-8).
 *   - No transitive supply-chain surface.
 *
 * What we DO get right:
 *
 *   - All five mandatory XML 1.0 entity escapes
 *     (`&` → &amp;, `<` → &lt;, `>` → &gt;, `"` → &quot;, `'` → &apos;).
 *   - Numbers stringify via Number.toString() — locale-independent
 *     (never toLocaleString, which would inject "1.234,56" in DE).
 *   - Empty / null / undefined values skipped at the element boundary
 *     — no `<Foo></Foo>` or `<Foo>null</Foo>` ever emitted.
 *   - Boolean leaves emit `true` / `false` (lowercase, XML convention).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  AtlasAddress,
  AtlasConsignee,
  AtlasDeclaration,
  AtlasExporter,
  AtlasItem,
  AtlasLicenseReference,
  AtlasOffice,
  AtlasPayload,
  AtlasPreviousDocument,
  AtlasTransportDocument,
} from "./atlas-payload";

// ─── Escape helpers ───────────────────────────────────────────────

/**
 * Escape arbitrary text for safe embedding inside an XML element's
 * text-content position. The mandatory set is `<`, `&`. We additionally
 * escape `>` defensively (some parsers reject `]]>` byte sequences)
 * and pass everything else through (UTF-8 — ATLAS is UTF-8 by spec).
 *
 * Returns "" for nullish input rather than the string "null" / "undefined".
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
 * encodes the two quote characters (we wrap attributes in `"` by
 * convention).
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
 * empty / NaN — saves callers from a forest of guard expressions.
 *
 * Numbers stringify via String(value) which is locale-independent.
 * NEVER use toLocaleString here; ATLAS rejects "75.000,50" but accepts
 * "75000.50".
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
          ? "true"
          : "false"
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

function addressXml(a: AtlasAddress, indent: string): string {
  let out = openEl("Address", null, indent);
  const inner = indent + "  ";
  out += leafEl("Street", a.Street, inner);
  out += leafEl("PostalCode", a.PostalCode, inner);
  out += leafEl("City", a.City, inner);
  out += leafEl("CountryCode", a.CountryCode, inner);
  out += closeEl("Address", indent);
  return out;
}

function exporterXml(e: AtlasExporter, indent: string): string {
  let out = openEl("Exporter", null, indent);
  const inner = indent + "  ";
  out += leafEl("Name", e.Name, inner);
  out += addressXml(e.Address, inner);
  out += leafEl("EORI", e.EORI, inner);
  out += leafEl("VATNumber", e.VATNumber, inner);
  out += leafEl("ContactEmail", e.ContactEmail, inner);
  out += closeEl("Exporter", indent);
  return out;
}

function consigneeXml(c: AtlasConsignee, indent: string): string {
  let out = openEl("Consignee", null, indent);
  const inner = indent + "  ";
  out += leafEl("Name", c.Name, inner);
  out += addressXml(c.Address, inner);
  out += leafEl("EORI", c.EORI, inner);
  out += leafEl("TradeName", c.TradeName, inner);
  out += closeEl("Consignee", indent);
  return out;
}

function officeXml(o: AtlasOffice, tag: string, indent: string): string {
  let out = openEl(tag, null, indent);
  const inner = indent + "  ";
  out += leafEl("ReferenceNumber", o.ReferenceNumber, inner);
  out += leafEl("Name", o.Name, inner);
  out += closeEl(tag, indent);
  return out;
}

function transportDocumentXml(
  d: AtlasTransportDocument,
  indent: string,
): string {
  let out = openEl("TransportDocument", null, indent);
  const inner = indent + "  ";
  out += leafEl("TypeCode", d.TypeCode, inner);
  out += leafEl("Reference", d.Reference, inner);
  out += closeEl("TransportDocument", indent);
  return out;
}

function previousDocumentXml(d: AtlasPreviousDocument, indent: string): string {
  let out = openEl("PreviousDocument", null, indent);
  const inner = indent + "  ";
  out += leafEl("TypeCode", d.TypeCode, inner);
  out += leafEl("Reference", d.Reference, inner);
  out += closeEl("PreviousDocument", indent);
  return out;
}

function licenseReferenceXml(l: AtlasLicenseReference, indent: string): string {
  let out = openEl("LicenseReference", null, indent);
  const inner = indent + "  ";
  out += leafEl("TypeCode", l.TypeCode, inner);
  out += leafEl("Reference", l.Reference, inner);
  out += leafEl("IssuingAuthority", l.IssuingAuthority, inner);
  out += leafEl("ValidUntil", l.ValidUntil, inner);
  out += closeEl("LicenseReference", indent);
  return out;
}

function itemXml(it: AtlasItem, indent: string): string {
  let out = openEl("Item", { ItemNumber: String(it.ItemNumber) }, indent);
  const inner = indent + "  ";
  out += leafEl("Description", it.Description, inner);
  out += leafEl("CNCode", it.CNCode, inner);
  out += leafEl("CountryOfOrigin", it.CountryOfOrigin, inner);
  out += leafEl("NetMassKg", it.NetMassKg, inner);
  out += leafEl("SupplementaryUnit", it.SupplementaryUnit, inner);
  out += leafEl("SupplementaryQuantity", it.SupplementaryQuantity, inner);
  out += leafEl("StatisticalValue", it.StatisticalValue, inner);
  out += leafEl("Currency", it.Currency, inner);
  out += leafEl("GermanAlEntry", it.GermanAlEntry, inner);
  out += leafEl("EUDualUseCode", it.EUDualUseCode, inner);
  out += leafEl("USECCN", it.USECCN, inner);
  if (it.Licenses.length > 0) {
    out += openEl("Licenses", null, inner);
    const licInner = inner + "  ";
    for (const lic of it.Licenses) {
      out += licenseReferenceXml(lic, licInner);
    }
    out += closeEl("Licenses", inner);
  }
  out += leafEl("AdditionalInformation", it.AdditionalInformation, inner);
  out += closeEl("Item", indent);
  return out;
}

function declarationXml(d: AtlasDeclaration, indent: string): string {
  let out = openEl(
    "Declaration",
    { DeclarationType: d.DeclarationType },
    indent,
  );
  const inner = indent + "  ";
  out += leafEl("LocalReferenceNumber", d.LocalReferenceNumber, inner);
  out += leafEl("DeclarationDate", d.DeclarationDate, inner);
  out += exporterXml(d.Exporter, inner);
  out += consigneeXml(d.Consignee, inner);
  out += officeXml(d.OfficeOfExport, "OfficeOfExport", inner);
  out += leafEl("DispatchCountry", d.DispatchCountry, inner);
  out += leafEl("DestinationCountry", d.DestinationCountry, inner);
  out += leafEl("TransportModeBorder", d.TransportModeBorder, inner);
  if (d.TransportDocument) {
    out += transportDocumentXml(d.TransportDocument, inner);
  }
  if (d.PreviousDocuments.length > 0) {
    out += openEl("PreviousDocuments", null, inner);
    const pdInner = inner + "  ";
    for (const pd of d.PreviousDocuments) {
      out += previousDocumentXml(pd, pdInner);
    }
    out += closeEl("PreviousDocuments", inner);
  }

  // Goods schedule
  out += openEl("Items", null, inner);
  const itemsInner = inner + "  ";
  for (const it of d.Items) {
    out += itemXml(it, itemsInner);
  }
  out += closeEl("Items", inner);

  out += leafEl("TotalInvoiceAmount", d.TotalInvoiceAmount, inner);
  out += leafEl("TotalInvoiceCurrency", d.TotalInvoiceCurrency, inner);

  out += closeEl("Declaration", indent);
  return out;
}

// ─── Root serializer ──────────────────────────────────────────────

/**
 * Serialize an AtlasPayload to a UTF-8 XML string. Output begins with
 * the XML 1.0 declaration so GZD's parser correctly identifies the
 * encoding; the root element is <ATLAS_Ausfuhranmeldung>.
 *
 * Output is byte-for-byte deterministic given identical input —
 * snapshot-test friendly, and ops can diff successive exports.
 */
export function serializeAtlasXml(payload: AtlasPayload): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += openEl(
    "ATLAS_Ausfuhranmeldung",
    {
      SchemaVersion: payload.SchemaVersion,
      Emitter: payload.Emitter,
      GeneratedAt: payload.GeneratedAt,
    },
    "",
  );
  xml += declarationXml(payload.Declaration, "  ");
  xml += closeEl("ATLAS_Ausfuhranmeldung", "");
  return xml;
}
