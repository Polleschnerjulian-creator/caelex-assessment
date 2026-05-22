/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Z5b — Hand-rolled XML serializer for the BAFA ELAN-K2 document.
 *
 * Why hand-rolled instead of pulling xmlbuilder2 / fast-xml-parser?
 *
 *   - 80kB+ dependency footprint not justified for ~10 element types.
 *   - The escaping rules are well-defined and trivially auditable.
 *   - Output is deterministic — easier to snapshot-test.
 *   - No transitive surface for supply-chain risk.
 *
 * What we DO get right:
 *
 *   - All five mandatory XML 1.0 entity escapes
 *     (`&` → &amp;, `<` → &lt;, `>` → &gt;, `"` → &quot;, `'` → &apos;).
 *   - Attribute values use the same set; text-content uses the subset
 *     that's actually unsafe in CDATA-less mode.
 *   - We DO NOT use template-string injection paths — every dynamic
 *     value passes through `escapeText()` or `escapeAttr()`.
 *   - Number-to-string conversion is locale-independent (toFixed /
 *     toString, never toLocaleString).
 *   - Empty / null / undefined values are skipped at the element
 *     boundary; never emit `<Foo></Foo>` or `<Foo>null</Foo>`.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  BafaAnschrift,
  BafaAntrag,
  BafaAntragsteller,
  BafaElanK2Document,
  BafaEmpfaenger,
  BafaEndverwender,
  BafaLieferung,
  BafaWare,
} from "./xsd-types";

// ─── Escape helpers ───────────────────────────────────────────────

/**
 * Escape arbitrary text for safe embedding inside an XML element's
 * text-content position. The mandatory set is `<`, `&`. We also
 * escape `>` defensively (some parsers reject `]]>` sequences) and
 * pass through everything else (including UTF-8 — BAFA's parser is
 * UTF-8 by spec).
 *
 * Returns "" for nullish input rather than the string "null" or
 * "undefined" — callers should typically not invoke this with
 * nullish, but we want defence-in-depth.
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
 * encodes the two quote characters since we wrap attributes in `"`
 * by convention. Single-quotes encoded too so callers can switch
 * delimiter without re-escaping.
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
 * Emit a leaf element with text content. Returns "" when the value
 * is nullish, an empty string, or NaN (for numbers) — saving the
 * caller from a forest of `value != null && writeEl(...)` blocks.
 *
 * Numbers are stringified via `String(value)` for integers and
 * `value.toString()` for floats — never `toLocaleString` (which
 * would inject locale-specific separators that fail BAFA validation).
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
      ? Number.isInteger(value)
        ? value.toString()
        : value.toString()
      : typeof value === "boolean"
        ? value
          ? "true"
          : "false"
        : value;

  return `${indent}<${tag}>${escapeText(text)}</${tag}>\n`;
}

/**
 * Open a container element with optional attributes. Returns the
 * opening tag string; caller emits children then calls closeEl.
 */
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

function anschriftXml(a: BafaAnschrift, indent: string): string {
  let out = openEl("Anschrift", null, indent);
  const inner = indent + "  ";
  out += leafEl("Strasse", a.Strasse, inner);
  out += leafEl("PLZ", a.PLZ, inner);
  out += leafEl("Ort", a.Ort, inner);
  out += leafEl("Land", a.Land, inner);
  out += closeEl("Anschrift", indent);
  return out;
}

function antragstellerXml(a: BafaAntragsteller, indent: string): string {
  let out = openEl("Antragsteller", null, indent);
  const inner = indent + "  ";
  out += leafEl("Name", a.Name, inner);
  out += anschriftXml(a.Anschrift, inner);
  out += leafEl("UStIdNr", a.UStIdNr, inner);
  out += leafEl("Aktenzeichen", a.Aktenzeichen, inner);
  out += leafEl("Ansprechpartner", a.Ansprechpartner, inner);
  out += leafEl("Email", a.Email, inner);
  out += leafEl("Telefon", a.Telefon, inner);
  out += closeEl("Antragsteller", indent);
  return out;
}

function empfaengerXml(e: BafaEmpfaenger, indent: string): string {
  // <Empfänger> in BAFA's XSD uses the umlaut form. Emit it directly;
  // UTF-8 byte-order in element names is fine per XML 1.0 §2.3.
  let out = openEl("Empfänger", null, indent);
  const inner = indent + "  ";
  out += leafEl("Name", e.Name, inner);
  out += anschriftXml(e.Anschrift, inner);
  out += leafEl("Handelsname", e.Handelsname, inner);
  out += leafEl("UStIdNr", e.UStIdNr, inner);
  out += leafEl("LEI", e.LEI, inner);
  out += closeEl("Empfänger", indent);
  return out;
}

function endverwenderXml(e: BafaEndverwender, indent: string): string {
  let out = openEl("Endverwender", null, indent);
  const inner = indent + "  ";
  out += leafEl("Name", e.Name, inner);
  out += leafEl("Land", e.Land, inner);
  out += leafEl("Sektor", e.Sektor, inner);
  out += leafEl("IdentischMitEmpfaenger", e.IdentischMitEmpfaenger, inner);
  out += closeEl("Endverwender", indent);
  return out;
}

function lieferungXml(l: BafaLieferung, indent: string): string {
  let out = openEl("Lieferung", null, indent);
  const inner = indent + "  ";
  out += leafEl("VersendungVon", l.VersendungVon, inner);
  out += leafEl("VersendungNach", l.VersendungNach, inner);
  out += leafEl("Versanddatum", l.Versanddatum, inner);
  if (l.Transit.length > 0) {
    out += openEl("Transit", null, inner);
    const transitInner = inner + "  ";
    for (const code of l.Transit) {
      out += leafEl("Land", code, transitInner);
    }
    out += closeEl("Transit", inner);
  }
  out += closeEl("Lieferung", indent);
  return out;
}

function wareXml(w: BafaWare, indent: string): string {
  let out = openEl("Ware", { PositionsNr: String(w.PositionsNr) }, indent);
  const inner = indent + "  ";
  out += leafEl("Bezeichnung", w.Bezeichnung, inner);
  out += leafEl("Beschreibung", w.Beschreibung, inner);
  out += leafEl("Hersteller", w.Hersteller, inner);
  out += leafEl("Typ", w.Typ, inner);
  out += leafEl("Zollnummer", w.Zollnummer, inner);
  out += leafEl("AusfuhrlistenNr", w.AusfuhrlistenNr, inner);
  out += leafEl("EUDualUseNr", w.EUDualUseNr, inner);
  out += leafEl("USECCN", w.USECCN, inner);
  out += leafEl("USMLCategory", w.USMLCategory, inner);
  out += leafEl("Menge", w.Menge, inner);
  out += leafEl("Mengeneinheit", w.Mengeneinheit, inner);
  out += leafEl("Einzelwert", w.Einzelwert, inner);
  out += leafEl("Waehrung", w.Waehrung, inner);
  out += leafEl("Bemerkung", w.Bemerkung, inner);
  out += closeEl("Ware", indent);
  return out;
}

function antragXml(a: BafaAntrag, indent: string): string {
  let out = openEl(
    "Antrag",
    { Antragsart: a.Antragsart, Vorgang: a.Vorgangsbezeichnung },
    indent,
  );
  const inner = indent + "  ";
  out += leafEl("Vorgangsbezeichnung", a.Vorgangsbezeichnung, inner);
  out += leafEl("Beschreibung", a.Beschreibung, inner);
  out += leafEl("ErstelltAm", a.ErstelltAm, inner);
  out += antragstellerXml(a.Antragsteller, inner);
  out += empfaengerXml(a.Empfaenger, inner);
  out += endverwenderXml(a.Endverwender, inner);
  out += lieferungXml(a.Lieferung, inner);
  out += leafEl("Verwendungszweck", a.Verwendungszweck, inner);
  out += leafEl("VerwendungSektor", a.VerwendungSektor, inner);

  // Goods schedule
  out += openEl("Waren", null, inner);
  const warenInner = inner + "  ";
  for (const w of a.Waren) {
    out += wareXml(w, warenInner);
  }
  out += closeEl("Waren", inner);

  // Catch-all + license cross-refs + notification-duty flag —
  // emitted as siblings of the goods schedule, not as attributes,
  // because BAFA's XSD permits free-form <Bemerkungen> at this depth.
  if (a.CatchAllHinweise.length > 0) {
    out += openEl("CatchAllHinweise", null, inner);
    const caInner = inner + "  ";
    for (const hint of a.CatchAllHinweise) {
      out += leafEl("Hinweis", hint, caInner);
    }
    out += closeEl("CatchAllHinweise", inner);
  }
  if (a.BestehendeGenehmigungen.length > 0) {
    out += openEl("BestehendeGenehmigungen", null, inner);
    const gInner = inner + "  ";
    for (const lic of a.BestehendeGenehmigungen) {
      out += leafEl("Genehmigung", lic, gInner);
    }
    out += closeEl("BestehendeGenehmigungen", inner);
  }
  out += leafEl("Anzeigepflicht", a.Anzeigepflicht, inner);

  out += closeEl("Antrag", indent);
  return out;
}

// ─── Root serializer ──────────────────────────────────────────────

/**
 * Serialize a BafaElanK2Document to a UTF-8 XML string. Output begins
 * with the XML 1.0 declaration so BAFA's parser correctly identifies
 * the encoding; the root element wraps in <ELAN_K2_Antragspaket>.
 *
 * Output is deterministic given identical input — useful for both
 * snapshot tests AND for end-users who want to diff successive
 * exports to see exactly what changed.
 */
export function serializeBafaXml(doc: BafaElanK2Document): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += openEl(
    "ELAN_K2_Antragspaket",
    {
      SchemaVersion: doc.SchemaVersion,
      Emitter: doc.Emitter,
      ErzeugtAm: doc.ErzeugtAm,
    },
    "",
  );
  for (const antrag of doc.Antraege) {
    xml += antragXml(antrag, "  ");
  }
  xml += closeEl("ELAN_K2_Antragspaket", "");
  return xml;
}
