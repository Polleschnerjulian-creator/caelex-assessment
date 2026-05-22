/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Z5b — BAFA ELAN-K2 report builder.
 *
 * Pure function that turns a Caelex TradeOperation (with its
 * counterparty, organisation, lines, items, licenses) into a
 * BafaElanK2Document ready for the serializer.
 *
 * "Pure" matters here:
 *
 *   - No `prisma` access, no `fetch`, no `Date.now()`-driven side
 *     effects. The caller supplies `generatedAt` so snapshot tests
 *     can fix it.
 *   - Deterministic output for identical input.
 *   - Safe to call from both Server Actions and from a /api endpoint
 *     handler — no Next.js-specific runtime gates.
 *
 * The shape of the input mirrors the existing BafaPdfButton (Z5b just
 * reuses the same operation shape that the PDF generator already
 * consumes — we don't want two DAL slices for the same data).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { BAFA_XSD_VERSION } from "./xsd-types";
import type {
  BafaAntrag,
  BafaAntragsart,
  BafaElanK2Document,
  BafaVerwendungszweck,
  BafaWare,
} from "./xsd-types";

// ─── Input shape ──────────────────────────────────────────────────

/**
 * BafaReportInput — operation + applicant context the builder needs.
 * Intentionally a thin wrapper around the same shape consumed by
 * `BafaElanK2Document` (the PDF), with one addition: `generatedAt`
 * so callers can pin the timestamp for snapshot stability.
 *
 * Shape duplicated here (not imported from the PDF component) because
 * the PDF component is "use client" and we don't want this server-
 * usable builder to drag client deps through its import graph.
 */
export interface BafaReportInput {
  /** Stable timestamp for the document header. */
  generatedAt: string | Date;
  /** The applicant org. */
  applicant: {
    legalName: string;
    addressStreet?: string | null;
    addressZip?: string | null;
    addressCity?: string | null;
    addressCountry?: string | null;
    vatNumber?: string | null;
    contactPerson?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    bafaAktenzeichen?: string | null;
  };
  /** The operation under authorization. */
  operation: {
    id: string;
    reference: string;
    description: string;
    operationType: string;
    status: string;
    shipFromCountry: string;
    shipToCountry: string;
    endUseCountry: string | null;
    routeStops: string[];
    declaredEndUse: string;
    endUserName: string | null;
    endUserSector: string | null;
    catchAllArt4Hit: boolean;
    catchAllArt5Hit: boolean;
    catchAllArt9Hit: boolean;
    catchAllArt10Hit: boolean;
    notificationDuty: boolean;
    scheduledShipDate: string | Date | null;
    createdAt: string | Date;
    counterparty: {
      legalName: string;
      tradeName?: string | null;
      countryCode: string;
      addressLines?: string[];
      vatNumber?: string | null;
      leiCode?: string | null;
    };
    lines: Array<{
      id: string;
      quantity: number;
      unitValue: number;
      unitCurrency: string;
      item: {
        name: string;
        internalSku?: string | null;
        manufacturerName?: string | null;
        manufacturerPartNo?: string | null;
        description?: string;
        eccnEU?: string | null;
        eccnUS?: string | null;
        usmlCategory?: string | null;
        mtcrCategory?: string | null;
        germanAlEntry?: string | null;
        hsCode?: string | null;
      };
      appliedLicense?: {
        licenseType: string;
        licenseNumber: string | null;
      } | null;
    }>;
    licenses: Array<{
      licenseType: string;
      licenseNumber: string | null;
      issuedAt: string | Date | null;
      validUntil: string | Date | null;
      status: string;
    }>;
  };
}

// ─── Mappers (Caelex → BAFA) ──────────────────────────────────────

/**
 * Map a Caelex TradeLicenseType to a BAFA Antragsart. AGG-12/16/27 and
 * any AGG-* type all collapse to AGG; EU-GEA → EUGEA; EZG / Einzel → EZG.
 * Intra-EU → IZG. Anything we don't recognise defaults to EZG since
 * Einzelausfuhrgenehmigung is the most-conservative kind.
 */
export function mapAntragsart(
  operationType: string,
  primaryLicenseType: string | null | undefined,
): BafaAntragsart {
  // Intra-EU operation → IZG (Annex IV transfer auth)
  if (operationType === "INTRA_EU") return "IZG";

  if (primaryLicenseType) {
    if (primaryLicenseType.startsWith("BAFA_AGG")) return "AGG";
    if (
      primaryLicenseType.includes("EUGEA") ||
      primaryLicenseType.includes("EU_GEA")
    )
      return "EUGEA";
    if (primaryLicenseType.includes("BAFA_EINZEL")) return "EZG";
  }
  return "EZG";
}

/**
 * Map Caelex's declaredEndUse enum (TradeEndUseClass) to BAFA's
 * Verwendungszweck enum. Caelex uses: CIVIL, MILITARY, DUAL_USE,
 * RESEARCH, GOVERNMENT, UNKNOWN.
 */
export function mapVerwendungszweck(
  declaredEndUse: string,
): BafaVerwendungszweck {
  switch (declaredEndUse) {
    case "CIVIL":
      return "zivil";
    case "MILITARY":
    case "MILITAERISCH":
      return "militaerisch";
    case "DUAL_USE":
      return "dual_use";
    case "RESEARCH":
    case "FORSCHUNG":
      return "forschung";
    case "GOVERNMENT":
    case "BEHOERDE":
      return "behoerde";
    default:
      return "unbekannt";
  }
}

/**
 * Coerce a date-ish to ISO 8601 string. Returns undefined for null /
 * undefined (NOT empty string — schema-types use `undefined` to
 * encode "absent" cleanly).
 */
function toIso(d: string | Date | null | undefined): string | undefined {
  if (d == null) return undefined;
  if (d instanceof Date) return d.toISOString();
  return d;
}

/**
 * Coerce a date-ish to a yyyy-mm-dd-only string (BAFA prefers
 * date-only for Versanddatum / Versanddatum-like fields).
 */
function toIsoDate(d: string | Date | null | undefined): string | undefined {
  if (d == null) return undefined;
  const iso = d instanceof Date ? d.toISOString() : d;
  // Extract first ten chars if it looks like a full timestamp,
  // otherwise pass through unchanged so callers can supply pre-
  // formatted dates without re-parsing.
  return iso.length >= 10 && iso[4] === "-" ? iso.slice(0, 10) : iso;
}

// ─── Builder ──────────────────────────────────────────────────────

/**
 * buildBafaXmlReport — top-level entry point. Pure function: same
 * input → same output.
 */
export function buildBafaReport(input: BafaReportInput): BafaElanK2Document {
  const { applicant, operation, generatedAt } = input;

  // Determine application kind from the first license on the stack
  // (operations typically have one primary license; multi-license
  // stacks would require splitting into multiple <Antrag> blocks
  // which we don't model in Z5b — out of scope per Living-Plan).
  const primaryLicense = operation.licenses[0] ?? null;
  const antragsart = mapAntragsart(
    operation.operationType,
    primaryLicense?.licenseType,
  );

  // Counterparty address-lines come from TradeParty.addressLines
  // (a flat string[]). For BAFA we need Strasse / PLZ / Ort
  // separately — best-effort split. When parsing fails we just
  // drop everything into Strasse and leave PLZ/Ort empty so the
  // operator can fix in ELAN-K2.
  const counterpartyAnschrift = splitAddressLines(
    operation.counterparty.addressLines ?? [],
    operation.counterparty.countryCode,
  );

  // Catch-all hints — one bullet per triggered article.
  const catchAllHinweise: string[] = [];
  if (operation.catchAllArt4Hit)
    catchAllHinweise.push(
      "Art. 4 EU 2021/821 — WMD / Military end-use catch-all triggered",
    );
  if (operation.catchAllArt5Hit)
    catchAllHinweise.push(
      "Art. 5 EU 2021/821 — Cyber-surveillance / Human-Rights catch-all triggered",
    );
  if (operation.catchAllArt9Hit)
    catchAllHinweise.push(
      "§ 8 AWV — Nationaler Auffangtatbestand (DE) triggered",
    );
  if (operation.catchAllArt10Hit)
    catchAllHinweise.push(
      "Art. 10 EU 2021/821 — Innergemeinschaftliche Verbringung sensitiver Güter (Annex IV) triggered",
    );

  // Existing-licence cross-references
  const bestehende: string[] = operation.licenses.map((lic) => {
    const num = lic.licenseNumber ? ` Nr. ${lic.licenseNumber}` : "";
    const validUntil = toIsoDate(lic.validUntil);
    const validity = validUntil ? `, gültig bis ${validUntil}` : "";
    return `${lic.licenseType.replace(/_/g, " ")}${num} (${lic.status}${validity})`;
  });

  const waren: BafaWare[] = operation.lines.map((line, idx) => {
    // Bemerkung — pack the codes that don't have first-class XSD slots
    // plus any per-line license cross-reference.
    const remarks: string[] = [];
    if (line.item.internalSku)
      remarks.push(`Caelex SKU: ${line.item.internalSku}`);
    if (line.item.mtcrCategory) remarks.push(`MTCR: ${line.item.mtcrCategory}`);
    if (line.appliedLicense) {
      const num = line.appliedLicense.licenseNumber
        ? ` Nr. ${line.appliedLicense.licenseNumber}`
        : "";
      remarks.push(
        `Angewandte Lizenz: ${line.appliedLicense.licenseType.replace(/_/g, " ")}${num}`,
      );
    }
    return {
      PositionsNr: idx + 1,
      Bezeichnung: line.item.name,
      Beschreibung: line.item.description || undefined,
      Hersteller: line.item.manufacturerName || undefined,
      Typ: line.item.manufacturerPartNo || undefined,
      Zollnummer: line.item.hsCode || undefined,
      AusfuhrlistenNr: line.item.germanAlEntry || undefined,
      EUDualUseNr: line.item.eccnEU || undefined,
      USECCN: line.item.eccnUS || undefined,
      USMLCategory: line.item.usmlCategory || undefined,
      Menge: line.quantity,
      Mengeneinheit: "Stk", // TODO: model unit-of-measure on TradeOperationLine
      Einzelwert: line.unitValue,
      Waehrung: line.unitCurrency,
      Bemerkung: remarks.length > 0 ? remarks.join(" · ") : undefined,
    };
  });

  const antrag: BafaAntrag = {
    Antragsart: antragsart,
    Vorgangsbezeichnung: operation.reference,
    Beschreibung: operation.description || undefined,
    ErstelltAm: toIso(operation.createdAt) ?? toIso(generatedAt) ?? "",
    Antragsteller: {
      Name: applicant.legalName,
      Anschrift: {
        Strasse: applicant.addressStreet ?? "",
        PLZ: applicant.addressZip ?? undefined,
        Ort: applicant.addressCity ?? "",
        Land: applicant.addressCountry ?? "DE",
      },
      UStIdNr: applicant.vatNumber ?? undefined,
      Aktenzeichen: applicant.bafaAktenzeichen ?? undefined,
      Ansprechpartner: applicant.contactPerson ?? undefined,
      Email: applicant.contactEmail ?? undefined,
      Telefon: applicant.contactPhone ?? undefined,
    },
    Empfaenger: {
      Name: operation.counterparty.legalName,
      Anschrift: counterpartyAnschrift,
      Handelsname: operation.counterparty.tradeName ?? undefined,
      UStIdNr: operation.counterparty.vatNumber ?? undefined,
      LEI: operation.counterparty.leiCode ?? undefined,
    },
    Endverwender: {
      Name: operation.endUserName ?? operation.counterparty.legalName,
      Land: operation.endUseCountry ?? operation.shipToCountry,
      Sektor: operation.endUserSector ?? undefined,
      IdentischMitEmpfaenger:
        operation.endUserName == null ||
        operation.endUserName === operation.counterparty.legalName,
    },
    Lieferung: {
      VersendungVon: operation.shipFromCountry,
      VersendungNach: operation.shipToCountry,
      Versanddatum: toIsoDate(operation.scheduledShipDate),
      Transit: operation.routeStops,
    },
    Verwendungszweck: mapVerwendungszweck(operation.declaredEndUse),
    VerwendungSektor: operation.endUserSector ?? undefined,
    Waren: waren,
    CatchAllHinweise: catchAllHinweise,
    BestehendeGenehmigungen: bestehende,
    Anzeigepflicht: operation.notificationDuty,
  };

  return {
    SchemaVersion: BAFA_XSD_VERSION,
    Emitter: "Caelex Comply Trade",
    ErzeugtAm: toIso(generatedAt) ?? new Date().toISOString(),
    Antraege: [antrag],
  };
}

// ─── Address-line splitter ────────────────────────────────────────

/**
 * Best-effort split of a flat addressLines[] into BAFA's Anschrift
 * shape (Strasse / PLZ / Ort / Land).
 *
 * Heuristic:
 *   - Last line that looks like "<plz> <city>" → PLZ + Ort.
 *   - All preceding lines → joined into Strasse.
 *   - If no PLZ-line is detected, everything goes into Strasse and
 *     Ort stays empty.
 *
 * This is intentionally conservative; the operator reviews the export
 * before upload and can correct in ELAN-K2's interactive form.
 */
function splitAddressLines(
  lines: string[],
  countryCode: string,
): {
  Strasse: string;
  PLZ?: string;
  Ort: string;
  Land: string;
} {
  if (lines.length === 0) {
    return { Strasse: "", Ort: "", Land: countryCode };
  }

  // Look for a line of the form "<digits> <rest>" at the END
  const lastIdx = lines.length - 1;
  const last = lines[lastIdx] ?? "";
  const m = last.match(/^(\d{4,6})\s+(.+)$/);
  if (m) {
    return {
      Strasse: lines.slice(0, lastIdx).join(", "),
      PLZ: m[1],
      Ort: m[2] ?? "",
      Land: countryCode,
    };
  }

  // Fallback: take the whole thing as Strasse
  return {
    Strasse: lines.join(", "),
    Ort: "",
    Land: countryCode,
  };
}
