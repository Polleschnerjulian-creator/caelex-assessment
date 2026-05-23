/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Z14a — ATLAS-DE payload builder.
 *
 * Pure function that turns a Caelex TradeOperation (with counterparty,
 * lines, items, and licenses) into an AtlasPayload ready for the
 * serializer.
 *
 * "Pure" matters here:
 *
 *   - No `prisma` access, no `fetch`, no `Date.now()`-driven side
 *     effects. Caller supplies `generatedAt` so snapshot tests can fix
 *     the timestamp.
 *   - Deterministic output for identical input.
 *   - Safe to call from both Server Actions and from an /api route.
 *
 * The input shape intentionally mirrors the BAFA builder's input shape
 * (Z5b) — they consume the same Caelex domain slice. Duplicating the
 * shape (instead of importing) means this server-usable builder doesn't
 * drag any client-only deps through its import graph.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { ATLAS_XSD_VERSION } from "./atlas-payload";
import type {
  AtlasDeclaration,
  AtlasDeclarationType,
  AtlasItem,
  AtlasLicenseReference,
  AtlasPayload,
  AtlasPreviousDocument,
} from "./atlas-payload";

// ─── Input shape ──────────────────────────────────────────────────

/**
 * AtlasBuilderInput — operation + exporter context the builder needs.
 * Thin wrapper around the same Caelex slice the BAFA builder consumes,
 * plus `generatedAt` for snapshot stability.
 */
export interface AtlasBuilderInput {
  /** Stable timestamp for the document header. */
  generatedAt: string | Date;
  /** The exporter org (Ausführer). */
  exporter: {
    legalName: string;
    addressStreet?: string | null;
    addressZip?: string | null;
    addressCity?: string | null;
    addressCountry?: string | null;
    /** EORI — required by ATLAS. Falls back to a placeholder if absent. */
    eoriNumber?: string | null;
    vatNumber?: string | null;
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
    scheduledShipDate: string | Date | null;
    createdAt: string | Date;
    /**
     * Optional declared customs office code. Falls back to a sensible
     * default if absent ("DE000000" = placeholder for "select office").
     */
    officeOfExportCode?: string | null;
    officeOfExportName?: string | null;
    /** Optional transport-document type + reference. */
    transportDocType?: string | null;
    transportDocReference?: string | null;
    /**
     * Transport mode at border (UCC code: 1=Sea, 4=Air, etc.).
     * Default "4" (Air) because most space cargo flies.
     */
    transportModeBorder?: string | null;
    /**
     * Previous-document references (MRNs, IPR auths) — only relevant
     * for re-exports. Empty for standard EXPORT operations.
     */
    previousDocuments?: Array<{
      typeCode: string;
      reference: string;
    }>;
    counterparty: {
      legalName: string;
      tradeName?: string | null;
      countryCode: string;
      addressLines?: string[];
      vatNumber?: string | null;
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
        eccnEU?: string | null;
        eccnUS?: string | null;
        germanAlEntry?: string | null;
        hsCode?: string | null;
        /** Net mass (kg) — pulled from parametric attributes when present. */
        netMassKg?: number | null;
      };
      appliedLicense?: {
        licenseType: string;
        licenseNumber: string | null;
        validUntil?: string | Date | null;
      } | null;
    }>;
    /** All licenses on the operation; merged into per-item license references. */
    licenses: Array<{
      licenseType: string;
      licenseNumber: string | null;
      validUntil: string | Date | null;
    }>;
  };
}

// ─── Mappers (Caelex → ATLAS) ─────────────────────────────────────

/**
 * Map a Caelex TradeOperationType to an ATLAS DeclarationType.
 *   EXPORT          → EXPORT
 *   REEXPORT        → REEXPORT
 *   INTRA_EU        → INTRA_EU_TRANSIT (only when Annex IV items)
 *   TRANSIT         → REEXPORT (closest equivalent — non-EU transit)
 *   TECH_TRANSFER   → EXPORT (treated as standard export for ATLAS)
 *   DEEMED_EXPORT   → EXPORT
 *   CLOUD_PROVISION → EXPORT
 *   anything else   → EXPORT (conservative default)
 */
export function mapDeclarationType(
  operationType: string,
): AtlasDeclarationType {
  switch (operationType) {
    case "REEXPORT":
    case "TRANSIT":
      return "REEXPORT";
    case "INTRA_EU":
      return "INTRA_EU_TRANSIT";
    default:
      return "EXPORT";
  }
}

/**
 * Map a Caelex TradeLicenseType to an ATLAS license-reference type code.
 *   BAFA_EINZEL        → X002 (EZG)
 *   BAFA_AGG_*         → X003 (Sammelausfuhrgenehmigung)
 *   BAFA_EUGEA_*       → Y901 (EU General Export Authorisation)
 *   BIS_*              → Y902 (informational — US license cross-ref)
 *   DDTC_*             → L116 (ITAR — informational, ATLAS may reject)
 *   anything else      → X002 (conservative default)
 */
export function mapLicenseTypeCode(licenseType: string): string {
  if (licenseType.startsWith("BAFA_AGG")) return "X003";
  if (licenseType.startsWith("BAFA_EUGEA")) return "Y901";
  if (licenseType.startsWith("BAFA")) return "X002";
  if (licenseType.startsWith("BIS_")) return "Y902";
  if (licenseType.startsWith("DDTC_")) return "L116";
  return "X002";
}

/**
 * Resolve issuing authority from license type prefix. Pure heuristic;
 * passed-through to ATLAS for human-readable display.
 */
function issuingAuthorityFromLicenseType(
  licenseType: string,
): string | undefined {
  if (licenseType.startsWith("BAFA")) return "BAFA";
  if (licenseType.startsWith("BIS_")) return "US BIS";
  if (licenseType.startsWith("DDTC_")) return "US DDTC";
  return undefined;
}

/**
 * Coerce a date-ish to a yyyy-mm-dd string. Returns undefined for null.
 */
function toIsoDate(d: string | Date | null | undefined): string | undefined {
  if (d == null) return undefined;
  const iso = d instanceof Date ? d.toISOString() : d;
  return iso.length >= 10 && iso[4] === "-" ? iso.slice(0, 10) : iso;
}

/**
 * Coerce a date-ish to an ISO 8601 string. Returns undefined for null.
 */
function toIso(d: string | Date | null | undefined): string | undefined {
  if (d == null) return undefined;
  return d instanceof Date ? d.toISOString() : d;
}

// ─── Address splitter ─────────────────────────────────────────────

/**
 * Best-effort split of a flat addressLines[] into Street + PostalCode +
 * City for ATLAS's structured Address block. Heuristic mirrors Z5b.
 */
function splitAddressLines(
  lines: string[],
  countryCode: string,
): {
  Street?: string | undefined;
  PostalCode?: string | undefined;
  City: string;
  CountryCode: string;
} {
  if (lines.length === 0) {
    return { City: "", CountryCode: countryCode };
  }

  const lastIdx = lines.length - 1;
  const last = lines[lastIdx] ?? "";
  const m = last.match(/^(\d{4,6})\s+(.+)$/);
  if (m) {
    const streetJoined = lines.slice(0, lastIdx).join(", ");
    return {
      Street: streetJoined.length > 0 ? streetJoined : undefined,
      PostalCode: m[1],
      City: m[2] ?? "",
      CountryCode: countryCode,
    };
  }

  return {
    Street: lines.join(", "),
    City: "",
    CountryCode: countryCode,
  };
}

// ─── Builder ──────────────────────────────────────────────────────

/**
 * buildAtlasPayload — top-level entry-point.
 *
 * Pure function: same input → same output. Caller fixes `generatedAt`
 * when they want byte-for-byte reproducibility across runs.
 */
export function buildAtlasPayload(input: AtlasBuilderInput): AtlasPayload {
  const { exporter, operation, generatedAt } = input;

  const declarationType = mapDeclarationType(operation.operationType);

  // Pre-build the operation-wide license-reference list. Each license
  // on the operation becomes a candidate per-item reference; we attach
  // the matched one(s) into Item.Licenses below.
  const allLicenses: AtlasLicenseReference[] = operation.licenses.map(
    (lic) => ({
      TypeCode: mapLicenseTypeCode(lic.licenseType),
      Reference: lic.licenseNumber ?? "(pending issuance)",
      IssuingAuthority: issuingAuthorityFromLicenseType(lic.licenseType),
      ValidUntil: toIsoDate(lic.validUntil),
    }),
  );

  const items: AtlasItem[] = operation.lines.map((line, idx) => {
    // Per-line license-references: prefer the explicit appliedLicense
    // when present, otherwise fall back to the full operation-stack
    // (every license covers every item by default).
    const itemLicenses: AtlasLicenseReference[] = line.appliedLicense
      ? [
          {
            TypeCode: mapLicenseTypeCode(line.appliedLicense.licenseType),
            Reference:
              line.appliedLicense.licenseNumber ?? "(pending issuance)",
            IssuingAuthority: issuingAuthorityFromLicenseType(
              line.appliedLicense.licenseType,
            ),
            ValidUntil: toIsoDate(line.appliedLicense.validUntil),
          },
        ]
      : allLicenses;

    // Stat-value per line: quantity × unitValue, kept in line currency.
    const statValue = line.quantity * line.unitValue;

    // Net mass per kg — TradeOperationLine has no first-class net-mass
    // field today, so we use item.netMassKg if surfaced (parametric
    // attribute), else 0. Operators correct in the ATLAS frontend.
    const netMass = (line.item.netMassKg ?? 0) * line.quantity;

    return {
      ItemNumber: idx + 1,
      Description: line.item.name,
      CNCode: line.item.hsCode ?? "00000000",
      CountryOfOrigin:
        line.item.countryOfOrigin ?? exporter.addressCountry ?? "DE",
      NetMassKg: netMass,
      SupplementaryUnit: "NAR",
      SupplementaryQuantity: line.quantity,
      StatisticalValue: statValue,
      Currency: line.unitCurrency,
      GermanAlEntry: line.item.germanAlEntry ?? undefined,
      EUDualUseCode: line.item.eccnEU ?? undefined,
      USECCN: line.item.eccnUS ?? undefined,
      Licenses: itemLicenses,
      AdditionalInformation:
        line.item.description && line.item.description.length > 0
          ? line.item.description
          : undefined,
    };
  });

  // Total invoice = sum of statistical values (rough — ATLAS does not
  // strictly enforce equality, supplementary charges can apply).
  const totalAmount = items.reduce((sum, it) => sum + it.StatisticalValue, 0);
  const totalCurrency = operation.lines[0]?.unitCurrency ?? "EUR";

  const counterpartyAddress = splitAddressLines(
    operation.counterparty.addressLines ?? [],
    operation.counterparty.countryCode,
  );

  const previousDocuments: AtlasPreviousDocument[] = (
    operation.previousDocuments ?? []
  ).map((pd) => ({
    TypeCode: pd.typeCode,
    Reference: pd.reference,
  }));

  const declaration: AtlasDeclaration = {
    LocalReferenceNumber: operation.reference,
    DeclarationType: declarationType,
    DeclarationDate:
      toIsoDate(operation.scheduledShipDate) ??
      toIsoDate(operation.createdAt) ??
      toIsoDate(generatedAt) ??
      "",
    Exporter: {
      Name: exporter.legalName,
      Address: {
        Street: exporter.addressStreet ?? undefined,
        PostalCode: exporter.addressZip ?? undefined,
        City: exporter.addressCity ?? "",
        CountryCode: exporter.addressCountry ?? "DE",
      },
      EORI: exporter.eoriNumber ?? "DE000000000000000",
      VATNumber: exporter.vatNumber ?? undefined,
      ContactEmail: exporter.contactEmail ?? undefined,
    },
    Consignee: {
      Name: operation.counterparty.legalName,
      Address: counterpartyAddress,
      TradeName: operation.counterparty.tradeName ?? undefined,
    },
    OfficeOfExport: {
      ReferenceNumber: operation.officeOfExportCode ?? "DE000000",
      Name: operation.officeOfExportName ?? undefined,
    },
    DispatchCountry: operation.shipFromCountry,
    DestinationCountry: operation.endUseCountry ?? operation.shipToCountry,
    TransportModeBorder: operation.transportModeBorder ?? "4",
    TransportDocument:
      operation.transportDocType && operation.transportDocReference
        ? {
            TypeCode: operation.transportDocType,
            Reference: operation.transportDocReference,
          }
        : undefined,
    PreviousDocuments: previousDocuments,
    Items: items,
    TotalInvoiceAmount: totalAmount,
    TotalInvoiceCurrency: totalCurrency,
  };

  return {
    SchemaVersion: ATLAS_XSD_VERSION,
    Emitter: "Caelex Comply Trade",
    GeneratedAt: toIso(generatedAt) ?? new Date().toISOString(),
    Declaration: declaration,
  };
}
