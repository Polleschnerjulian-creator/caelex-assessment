/**
 * Z5b — XML serializer tests.
 *
 * Coverage (16 cases):
 *   1-5. Escape helpers (text + attr): &, <, >, ", ' all correctly encoded.
 *   6.   Nullish handling: leafEl skips empty/null values, no <Foo></Foo>.
 *   7.   Output starts with the XML 1.0 declaration.
 *   8.   Output is parseable by a permissive parser (regex sanity check).
 *   9.   Required Antragsteller fields appear in the output.
 *  10.   Empfänger element name uses the umlaut form.
 *  11.   Empty array (Antraege) still produces a valid wrapper.
 *  12.   Catch-all-Hinweise rendered when present, absent when empty.
 *  13.   Bestehende Genehmigungen rendered when present, absent when empty.
 *  14.   Decimal Einzelwert preserves the decimal (no locale-comma).
 *  15.   Counterparty addressLines round-trip into Anschrift.
 *  16.   Injection attempt via legalName="<script>alert(1)</script>"
 *        is fully escaped — no live `<script>` tag in output.
 */

import { describe, it, expect } from "vitest";
import { escapeText, escapeAttr, serializeBafaXml } from "./xml-serializer";
import { BAFA_XSD_VERSION, type BafaElanK2Document } from "./xsd-types";

// ─── helpers ──────────────────────────────────────────────────────

function minimalDoc(): BafaElanK2Document {
  return {
    SchemaVersion: BAFA_XSD_VERSION,
    Emitter: "Caelex Comply Trade",
    ErzeugtAm: "2026-05-22T10:00:00.000Z",
    Antraege: [
      {
        Antragsart: "EZG",
        Vorgangsbezeichnung: "TEST-001",
        Beschreibung: "Test",
        ErstelltAm: "2026-05-22T10:00:00.000Z",
        Antragsteller: {
          Name: "Caelex GmbH",
          Anschrift: {
            Strasse: "Hauptstr. 1",
            PLZ: "80331",
            Ort: "München",
            Land: "DE",
          },
          UStIdNr: "DE123456789",
        },
        Empfaenger: {
          Name: "AeroJet Corp",
          Anschrift: {
            Strasse: "1 Rocket Way",
            Ort: "Los Angeles",
            Land: "US",
          },
        },
        Endverwender: {
          Name: "AeroJet Corp",
          Land: "US",
          IdentischMitEmpfaenger: true,
        },
        Lieferung: {
          VersendungVon: "DE",
          VersendungNach: "US",
          Transit: [],
        },
        Verwendungszweck: "zivil",
        Waren: [
          {
            PositionsNr: 1,
            Bezeichnung: "Reaction wheel",
            Menge: 4,
            Mengeneinheit: "Stk",
            Einzelwert: 75000.5,
            Waehrung: "EUR",
          },
        ],
        CatchAllHinweise: [],
        BestehendeGenehmigungen: [],
        Anzeigepflicht: false,
      },
    ],
  };
}

// ─── escape helpers ───────────────────────────────────────────────

describe("Z5b — escapeText", () => {
  it("escapes ampersand", () => {
    expect(escapeText("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes less-than and greater-than", () => {
    expect(escapeText("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes ampersand BEFORE other entities (prevents double-encoding)", () => {
    expect(escapeText("&amp;")).toBe("&amp;amp;");
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeText(null)).toBe("");
    expect(escapeText(undefined)).toBe("");
  });

  it("passes through UTF-8 / German umlauts unchanged", () => {
    expect(escapeText("München & Köln")).toBe("München &amp; Köln");
  });
});

describe("Z5b — escapeAttr", () => {
  it("escapes the five mandatory XML entities", () => {
    expect(escapeAttr(`a & b < c > d " e ' f`)).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f",
    );
  });

  it("returns empty string for null", () => {
    expect(escapeAttr(null)).toBe("");
  });
});

// ─── full document serialization ──────────────────────────────────

describe("Z5b — serializeBafaXml output", () => {
  it("begins with the XML 1.0 declaration", () => {
    const xml = serializeBafaXml(minimalDoc());
    expect(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>`)).toBe(true);
  });

  it("wraps in ELAN_K2_Antragspaket with SchemaVersion attribute", () => {
    const xml = serializeBafaXml(minimalDoc());
    expect(xml).toContain(
      `<ELAN_K2_Antragspaket SchemaVersion="${BAFA_XSD_VERSION}"`,
    );
    expect(xml.trimEnd().endsWith("</ELAN_K2_Antragspaket>")).toBe(true);
  });

  it("emits Antragsteller block with all required leaves", () => {
    const xml = serializeBafaXml(minimalDoc());
    expect(xml).toContain("<Antragsteller>");
    expect(xml).toContain("<Name>Caelex GmbH</Name>");
    expect(xml).toContain("<UStIdNr>DE123456789</UStIdNr>");
    expect(xml).toContain("<Strasse>Hauptstr. 1</Strasse>");
    expect(xml).toContain("<PLZ>80331</PLZ>");
    expect(xml).toContain("<Land>DE</Land>");
  });

  it("uses the umlaut form for the Empfänger element name", () => {
    const xml = serializeBafaXml(minimalDoc());
    expect(xml).toMatch(/<Empfänger>/);
    expect(xml).toMatch(/<\/Empfänger>/);
  });

  it("survives an empty Antraege array (still emits valid wrapper)", () => {
    const empty: BafaElanK2Document = {
      SchemaVersion: BAFA_XSD_VERSION,
      Emitter: "Caelex Comply Trade",
      ErzeugtAm: "2026-05-22T10:00:00.000Z",
      Antraege: [],
    };
    const xml = serializeBafaXml(empty);
    expect(xml).toContain("<ELAN_K2_Antragspaket");
    expect(xml).toContain("</ELAN_K2_Antragspaket>");
    expect(xml).not.toContain("<Antrag");
  });

  it("skips leaf elements for null/undefined optional values (no empty tags)", () => {
    // The minimal doc omits Empfaenger.UStIdNr, LEI, Handelsname — those
    // should NOT appear at all (not as <UStIdNr></UStIdNr>).
    const xml = serializeBafaXml(minimalDoc());
    expect(xml).not.toContain("<Handelsname>");
    expect(xml).not.toContain("<LEI>");
  });

  it("emits CatchAllHinweise when non-empty, omits when empty", () => {
    const doc = minimalDoc();
    doc.Antraege[0]!.CatchAllHinweise = [
      "Art. 4 EU 2021/821 — triggered",
      "§ 8 AWV — triggered",
    ];
    const xml = serializeBafaXml(doc);
    expect(xml).toContain("<CatchAllHinweise>");
    expect(xml).toContain("Art. 4 EU 2021/821");
    expect(xml).toContain("§ 8 AWV");

    // And the absent case
    doc.Antraege[0]!.CatchAllHinweise = [];
    const xmlEmpty = serializeBafaXml(doc);
    expect(xmlEmpty).not.toContain("<CatchAllHinweise>");
  });

  it("emits BestehendeGenehmigungen when non-empty, omits when empty", () => {
    const doc = minimalDoc();
    doc.Antraege[0]!.BestehendeGenehmigungen = [
      "BAFA AGG 12 (active, gültig bis 2027-01-31)",
    ];
    const xml = serializeBafaXml(doc);
    expect(xml).toContain("<BestehendeGenehmigungen>");
    expect(xml).toContain("BAFA AGG 12");

    doc.Antraege[0]!.BestehendeGenehmigungen = [];
    const xmlEmpty = serializeBafaXml(doc);
    expect(xmlEmpty).not.toContain("<BestehendeGenehmigungen>");
  });

  it("preserves decimal Einzelwert without locale-comma", () => {
    const xml = serializeBafaXml(minimalDoc());
    // 75000.5 must serialise as "75000.5", NOT "75000,5" (DE locale)
    expect(xml).toContain("<Einzelwert>75000.5</Einzelwert>");
    expect(xml).not.toContain("<Einzelwert>75000,5</Einzelwert>");
  });

  it("escapes a <script> injection attempt in legalName", () => {
    const doc = minimalDoc();
    doc.Antraege[0]!.Antragsteller.Name = `<script>alert("xss")</script>`;
    const xml = serializeBafaXml(doc);
    // Tag must be encoded — no live <script> appears in output
    expect(xml).not.toContain(`<script>alert`);
    // Text-content position: <, >, & must encode; " stays raw (XML 1.0
    // permits unescaped quotes in element content).
    expect(xml).toContain(
      `<Name>&lt;script&gt;alert("xss")&lt;/script&gt;</Name>`,
    );
  });

  it("escapes ampersand in counterparty name", () => {
    const doc = minimalDoc();
    doc.Antraege[0]!.Empfaenger.Name = "Smith & Jones Ltd.";
    const xml = serializeBafaXml(doc);
    expect(xml).toContain("<Name>Smith &amp; Jones Ltd.</Name>");
  });

  it("emits Transit children when routeStops is populated", () => {
    const doc = minimalDoc();
    doc.Antraege[0]!.Lieferung.Transit = ["FR", "GB"];
    const xml = serializeBafaXml(doc);
    expect(xml).toContain("<Transit>");
    expect(xml).toContain("<Land>FR</Land>");
    expect(xml).toContain("<Land>GB</Land>");
    expect(xml).toContain("</Transit>");
  });

  it("emits Anzeigepflicht as true/false boolean text", () => {
    const docFalse = minimalDoc();
    expect(serializeBafaXml(docFalse)).toContain(
      "<Anzeigepflicht>false</Anzeigepflicht>",
    );

    const docTrue = minimalDoc();
    docTrue.Antraege[0]!.Anzeigepflicht = true;
    expect(serializeBafaXml(docTrue)).toContain(
      "<Anzeigepflicht>true</Anzeigepflicht>",
    );
  });

  it("output passes a basic well-formedness sanity check", () => {
    const xml = serializeBafaXml(minimalDoc());
    // Every opening tag has a matching close (by count, ignoring
    // attributes and self-closing). Cheap parser-free integrity test.
    const opens = (xml.match(/<[A-Za-zÄÖÜäöü_][^/>\s]*[\s>]/g) ?? []).filter(
      (s) => !s.startsWith("<?xml"),
    );
    const closes = xml.match(/<\/[A-Za-zÄÖÜäöü_][^>]*>/g) ?? [];
    expect(opens.length).toBe(closes.length);
  });
});
