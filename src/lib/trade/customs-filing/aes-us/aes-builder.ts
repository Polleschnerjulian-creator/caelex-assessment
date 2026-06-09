/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Z14b — AES US payload builder.
 *
 * Pure function that turns a Caelex TradeOperation (with counterparty,
 * lines, items, and licenses) into an AesPayload ready for the
 * serializer.
 *
 * "Pure" matters here:
 *
 *   - No `prisma` access, no `fetch`, no `Date.now()`-driven side
 *     effects. Caller supplies `generatedAt` for snapshot stability.
 *   - Deterministic output for identical input.
 *   - Safe to call from both Server Actions and from an /api route.
 *
 * The input shape mirrors the BAFA / ATLAS builder shape — they all
 * consume the same Caelex domain slice.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { AES_SCHEMA_VERSION } from "./aes-payload";
import type {
  AesCommodity,
  AesFiling,
  AesPayload,
  AesTransportMode,
} from "./aes-payload";
import { resolveIdentifierOrPlaceholder } from "../export-identifier";

// ─── Input shape ──────────────────────────────────────────────────

/**
 * AesBuilderInput — operation + USPPI context the builder needs.
 */
export interface AesBuilderInput {
  /** Stable timestamp for the document header. */
  generatedAt: string | Date;
  /** The USPPI (US Principal Party in Interest). */
  usppi: {
    legalName: string;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZip?: string | null;
    addressCountry?: string | null;
    /**
     * EIN (9-digit, no hyphen). When EIN + DUNS are both absent the builder
     * emits an HONEST "⚠ FEHLT" placeholder (never a fabricated "000000000"),
     * so the AES draft is flagged not-fileable. Fail-closed.
     */
    einNumber?: string | null;
    /** D-U-N-S — used when EIN is absent. */
    dunsNumber?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  };
  /** The operation under export-clearance. */
  operation: {
    id: string;
    reference: string;
    description: string;
    operationType: string;
    shipFromCountry: string;
    shipToCountry: string;
    endUseCountry: string | null;
    endUserName: string | null;
    endUserSector: string | null;
    scheduledShipDate: string | Date | null;
    createdAt: string | Date;
    /** Port of export (Schedule D 4-digit code), e.g. "2704" (LAX). */
    portOfExport?: string | null;
    /** Carrier name + SCAC/IATA code. */
    carrierName?: string | null;
    carrierCode?: string | null;
    /** Transport mode at US border per CATAIR Appendix B. */
    transportMode?: AesTransportMode | null;
    /** Hazardous-materials indicator (49 CFR § 172). */
    hazardousMaterials?: boolean | null;
    /** Routed-export-transaction indicator per FTR § 30.3(e). */
    routedExportTransaction?: boolean | null;
    counterparty: {
      legalName: string;
      tradeName?: string | null;
      countryCode: string;
      addressLines?: string[];
    };
    lines: Array<{
      id: string;
      quantity: number;
      unitValue: number;
      unitCurrency: string;
      item: {
        name: string;
        description?: string;
        countryOfOrigin?: string | null;
        eccnUS?: string | null;
        usmlCategory?: string | null;
        hsCode?: string | null;
        netMassKg?: number | null;
      };
      appliedLicense?: {
        licenseType: string;
        licenseNumber: string | null;
      } | null;
    }>;
    licenses: Array<{
      licenseType: string;
      licenseNumber: string | null;
    }>;
  };
}

// ─── Mappers (Caelex → AES) ───────────────────────────────────────

/**
 * Map a Caelex TradeLicenseType to an AES license-authority code per
 * CATAIR Appendix F.
 *   BIS_EAR                       → C31 (BIS license required)
 *   BIS_LICENSE_EXCEPTION_STA     → C32 (License Exception STA)
 *   BIS_LICENSE_EXCEPTION_ENC     → C33 (License Exception ENC)
 *   BIS_LICENSE_EXCEPTION_CSA     → C33 (closest fit — Cybersecurity)
 *   DDTC_DSP5 / DSP73 / TAA / MLA → C36 (DDTC license)
 *   BAFA_* / OTHER                → C30 (NLR — informational only;
 *                                         AES only governs US-origin
 *                                         exports, BAFA does not apply)
 *   anything else                 → C30 (NLR fallback)
 */
export function mapLicenseCode(licenseType: string): string {
  if (licenseType === "BIS_EAR") return "C31";
  if (licenseType === "BIS_LICENSE_EXCEPTION_STA") return "C32";
  if (licenseType === "BIS_LICENSE_EXCEPTION_ENC") return "C33";
  if (licenseType === "BIS_LICENSE_EXCEPTION_CSA") return "C33";
  if (licenseType.startsWith("DDTC_")) return "C36";
  return "C30";
}

/**
 * Map Caelex's declared end-use + operation-type to an AES export
 * information code per CATAIR Appendix D.
 *   TEMP_EXPORT operationType   → "TP" (Temporary export, to return)
 *   GOVERNMENT declaredEndUse    → "GP" (US government, non-defense)
 *   MILITARY declaredEndUse      → "GS" (Foreign Military Sales)
 *   everything else              → "OS" (All other shipments — default)
 */
export function mapExportInformationCode(
  operationType: string,
  declaredEndUse: string | null,
): string {
  if (operationType === "TEMP_EXPORT") return "TP";
  if (declaredEndUse === "GOVERNMENT" || declaredEndUse === "BEHOERDE")
    return "GP";
  if (declaredEndUse === "MILITARY" || declaredEndUse === "MILITAERISCH")
    return "GS";
  return "OS";
}

/**
 * Map Caelex's endUserSector to an AES consignee-type code per CATAIR
 * Appendix C.
 *   "Government" / "Behörden"     → G
 *   "Reseller" / "Distributor"     → R
 *   "Direct consumer" / "End-user" → D
 *   anything else                  → O (Other / unknown)
 */
export function mapConsigneeType(
  sector: string | null | undefined,
): "D" | "G" | "O" | "R" {
  if (sector == null) return "O";
  const s = sector.toLowerCase();
  if (s.includes("government") || s.includes("behörd") || s.includes("public"))
    return "G";
  if (s.includes("reseller") || s.includes("distributor")) return "R";
  if (
    s.includes("end-user") ||
    s.includes("end user") ||
    s.includes("consumer")
  )
    return "D";
  return "O";
}

/**
 * Map a Caelex country-of-origin to an AES origin-indicator (D=Domestic
 * US, F=Foreign). Pure ISO-code comparison.
 */
export function mapOriginIndicator(
  countryOfOrigin: string | null | undefined,
): "D" | "F" {
  if (countryOfOrigin == null) return "F";
  return countryOfOrigin.toUpperCase() === "US" ? "D" : "F";
}

/**
 * Coerce a date-ish to a yyyy-mm-dd string.
 */
function toIsoDate(d: string | Date | null | undefined): string | undefined {
  if (d == null) return undefined;
  const iso = d instanceof Date ? d.toISOString() : d;
  return iso.length >= 10 && iso[4] === "-" ? iso.slice(0, 10) : iso;
}

/**
 * Coerce a date-ish to ISO 8601 string.
 */
function toIso(d: string | Date | null | undefined): string | undefined {
  if (d == null) return undefined;
  return d instanceof Date ? d.toISOString() : d;
}

// ─── Address splitter ─────────────────────────────────────────────

/**
 * Best-effort split of a flat addressLines[] into Street + City +
 * StateOrProvince + PostalCode for AES.
 *
 * Heuristic:
 *   - If the last line matches "<state-abbrev> <zip>" (e.g. "CA 90210"),
 *     take that as state + zip and the previous line as city.
 *   - Otherwise if the last line matches "<zip> <city>" use that.
 *   - All preceding lines join into Street.
 */
function splitAddressLines(
  lines: string[],
  countryCode: string,
): {
  Street: string;
  City: string;
  StateOrProvince?: string | undefined;
  PostalCode?: string | undefined;
  CountryCode: string;
} {
  if (lines.length === 0) {
    return { Street: "", City: "", CountryCode: countryCode };
  }

  const lastIdx = lines.length - 1;
  const last = lines[lastIdx] ?? "";

  // "City, ST 90210" or "City ST 90210"
  const usStyle = last.match(/^(.+?)[,\s]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (usStyle) {
    return {
      Street: lines.slice(0, lastIdx).join(", "),
      City: usStyle[1]?.trim() ?? "",
      StateOrProvince: usStyle[2],
      PostalCode: usStyle[3],
      CountryCode: countryCode,
    };
  }

  // "90210 City"
  const intlStyle = last.match(/^(\d{4,6})\s+(.+)$/);
  if (intlStyle) {
    return {
      Street: lines.slice(0, lastIdx).join(", "),
      City: intlStyle[2] ?? "",
      PostalCode: intlStyle[1],
      CountryCode: countryCode,
    };
  }

  return {
    Street: lines.slice(0, lastIdx).join(", "),
    City: last,
    CountryCode: countryCode,
  };
}

// ─── Builder ──────────────────────────────────────────────────────

/**
 * buildAesPayload — top-level entry-point.
 *
 * Pure function: same input → same output.
 */
export function buildAesPayload(input: AesBuilderInput): AesPayload {
  const { usppi, operation, generatedAt } = input;

  const commodities: AesCommodity[] = operation.lines.map((line, idx) => {
    // License-code resolution: prefer per-line appliedLicense, else
    // the operation-wide first BIS / DDTC license, else NLR (C30).
    let licCode = "C30";
    let licNumber: string | undefined;

    if (line.appliedLicense) {
      licCode = mapLicenseCode(line.appliedLicense.licenseType);
      licNumber = line.appliedLicense.licenseNumber ?? undefined;
    } else {
      const usLicense = operation.licenses.find(
        (l) =>
          l.licenseType.startsWith("BIS_") || l.licenseType.startsWith("DDTC_"),
      );
      if (usLicense) {
        licCode = mapLicenseCode(usLicense.licenseType);
        licNumber = usLicense.licenseNumber ?? undefined;
      }
    }

    // Stat value in USD. AES requires USD. Naive USD assumption: when
    // unitCurrency is USD we pass through; for other currencies we
    // leave the raw value and operators correct in AESDirect (FX
    // conversion is out of scope for Z14b).
    const valueUSD = line.quantity * line.unitValue;

    // Shipping weight per line (net mass × quantity).
    const shipWeight = (line.item.netMassKg ?? 0) * line.quantity;

    return {
      LineNumber: idx + 1,
      Description: line.item.name,
      // Pad HS code to 10-digit Schedule B if shorter; AESDirect accepts
      // 6/8/10 but normalises to 10 internally — we pre-pad with zeros.
      ScheduleBOrHTS: padHsCode(line.item.hsCode ?? "0000000000"),
      ECCN: line.item.eccnUS ?? undefined,
      USML: line.item.usmlCategory ?? undefined,
      LicenseCode: licCode,
      LicenseNumber: licNumber,
      Quantity: line.quantity,
      UnitOfMeasure: "NO",
      ValueUSD: valueUSD,
      ShippingWeightKg: shipWeight,
      CountryOfOrigin: line.item.countryOfOrigin ?? "US",
      OriginIndicator: mapOriginIndicator(line.item.countryOfOrigin),
      ExportInformationCode: mapExportInformationCode(
        operation.operationType,
        operation.endUserSector,
      ),
    };
  });

  const totalValueUSD = commodities.reduce((sum, c) => sum + c.ValueUSD, 0);

  const consigneeAddress = splitAddressLines(
    operation.counterparty.addressLines ?? [],
    operation.counterparty.countryCode,
  );

  // Identifier-type preference: EIN > DUNS > (honest placeholder).
  const identifierType: "EIN" | "DUNS" | "SSN" = usppi.einNumber
    ? "EIN"
    : usppi.dunsNumber
      ? "DUNS"
      : "EIN";
  // Fail-closed: when both EIN and DUNS are absent we emit a loud,
  // human-readable placeholder — NEVER a fabricated "000000000" that
  // could travel into a real AES filing as a false statement.
  const identifierValue = resolveIdentifierOrPlaceholder(
    usppi.einNumber ?? usppi.dunsNumber,
  );

  // Ultimate consignee may be different from immediate counterparty
  // when endUserName is set (re-export / triangle-trade).
  const ultimateConsigneeName =
    operation.endUserName ?? operation.counterparty.legalName;

  const filing: AesFiling = {
    ShipmentReferenceNumber: operation.reference.slice(0, 17),
    FilingAction: "ADD",
    FilerType: "USPPI",
    ExportDate:
      toIsoDate(operation.scheduledShipDate) ??
      toIsoDate(operation.createdAt) ??
      toIsoDate(generatedAt) ??
      "",
    USPPI: {
      Name: usppi.legalName,
      Address: {
        Street: usppi.addressStreet ?? "",
        City: usppi.addressCity ?? "",
        StateOrProvince: usppi.addressState ?? undefined,
        PostalCode: usppi.addressZip ?? undefined,
        CountryCode: usppi.addressCountry ?? "US",
      },
      IdentifierType: identifierType,
      IdentifierValue: identifierValue,
      ContactName: usppi.contactName ?? "(operator)",
      ContactPhone: usppi.contactPhone ?? "0000000000",
      ContactEmail: usppi.contactEmail ?? undefined,
    },
    UltimateConsignee: {
      Name: ultimateConsigneeName,
      Address: consigneeAddress,
      Type: mapConsigneeType(operation.endUserSector),
    },
    Carrier: {
      Name: operation.carrierName ?? "(pending carrier)",
      SCACorIATA: operation.carrierCode ?? "ZZZZ",
    },
    TransportMode: operation.transportMode ?? "40",
    // Fail-closed: prefer the per-operation port, else an HONEST placeholder
    // (the caller passes the org's default exportPortCode in here) — never a
    // fabricated "0000".
    PortOfExport: resolveIdentifierOrPlaceholder(operation.portOfExport),
    CountryOfDestination: operation.endUseCountry ?? operation.shipToCountry,
    Commodities: commodities,
    HazardousMaterials: operation.hazardousMaterials ?? false,
    RoutedExportTransaction: operation.routedExportTransaction ?? false,
    TotalValueUSD: totalValueUSD,
  };

  return {
    SchemaVersion: AES_SCHEMA_VERSION,
    Emitter: "Caelex Comply Trade",
    GeneratedAt: toIso(generatedAt) ?? new Date().toISOString(),
    Filing: filing,
  };
}

// ─── HS code normaliser ───────────────────────────────────────────

/**
 * Pad an HS / Schedule B code to 10 digits by appending zeros. Strips
 * dots first ("8412.90.0080" → "8412900080"). AESDirect normalises to
 * 10 digits internally; we pre-pad to avoid silent ambiguity.
 *
 * Returns the cleaned-and-padded value, or the original input if it
 * contains non-digit characters that can't be normalised (e.g. an EU
 * CN code with letters).
 */
function padHsCode(raw: string): string {
  const digitsOnly = raw.replace(/[.\-\s]/g, "");
  if (!/^\d+$/.test(digitsOnly)) return raw;
  if (digitsOnly.length >= 10) return digitsOnly.slice(0, 10);
  return digitsOnly.padEnd(10, "0");
}
