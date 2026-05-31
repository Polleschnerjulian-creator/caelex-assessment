import "server-only";
import type {
  TradeEUCRequest,
  TradeEUCFormType,
  TradeOperationLine,
  TradeItem,
} from "@prisma/client";

/**
 * Caelex Trade — Z6: EU End-Use Certificate (EUC) Annex IIIa template.
 *
 * EU Regulation 2021/821 ("EU Dual-Use Regulation") Annex IIIa defines
 * the standardised end-use statement that exporters must obtain from
 * their non-EU counterparties for many dual-use exports. The template
 * has a stable structure across BAFA, BIS-711, DDTC-DS83 et al. — the
 * legal anchor is the EU Reg, with BAFA C1/C6/C7 being the German
 * national implementation that closely mirrors the Annex IIIa fields.
 *
 * This file is the PURE DATA MODEL of an Annex IIIa certificate. It
 * does not render. Rendering lives in `./annex-iiia-pdf.ts`. Splitting
 * the two means the structure is testable without a PDF runtime.
 *
 * Legal anchors:
 *  - EU 2021/821 Annex IIIa (End-Use Statement template)
 *  - BAFA Merkblatt zur Endverbleibserklärung (national DE form)
 *  - §22 AWV (German export ordinance, EUC requirement)
 *  - 15 CFR §748.11 (US BIS Form 711 equivalent)
 *  - ITAR §126.4(d) (US DDTC NDAA Compliance / DS-83 equivalent)
 */

// ─── Public types ───────────────────────────────────────────────────

/** Counterparty payload as needed by the template (subset of TradeParty). */
export interface AnnexCounterparty {
  legalName: string;
  tradeName?: string | null;
  countryCode: string;
  addressLines?: string[];
}

/** Operation context (optional — blanket EUCs may have no operation). */
export interface AnnexOperation {
  reference: string;
  description: string;
  shipToCountry: string;
  endUseCountry?: string | null;
  declaredEndUse: string; // TradeEndUseClass as string
  endUserName?: string | null;
  endUserSector?: string | null;
  lines?: AnnexOperationLine[];
}

export interface AnnexOperationLine {
  itemName: string;
  internalSku?: string | null;
  description?: string;
  quantity: number;
  eccnEU?: string | null;
  eccnUS?: string | null;
  usmlCategory?: string | null;
}

export interface AnnexEUCInput {
  euc: Pick<
    TradeEUCRequest,
    | "id"
    | "formType"
    | "status"
    | "requestedAt"
    | "sentAt"
    | "receivedAt"
    | "validatedAt"
    | "validUntil"
    | "notes"
  >;
  /** The counterparty signing the certificate (foreign end-user). */
  counterparty: AnnexCounterparty;
  /** Optional shipment-specific operation. NULL = blanket EUC. */
  operation?: AnnexOperation | null;
  /** Org name issuing the EUC request (the EU exporter). */
  exporterOrgName: string;
}

// ─── Template document model ────────────────────────────────────────

export type AnnexFieldValue = string | null;

export interface AnnexField {
  /** Human-readable label (English). */
  label: string;
  /** Field value as it should appear in the rendered PDF. */
  value: AnnexFieldValue;
  /** True if this field is mandatory per Annex IIIa. */
  required: boolean;
}

export type AnnexSectionId =
  | "header"
  | "exporter"
  | "importer"
  | "end_user"
  | "goods"
  | "end_use_statement"
  | "no_diversion"
  | "re_export_prohibition"
  | "signature";

export interface AnnexSection {
  id: AnnexSectionId;
  /** Roman-numeral or letter index per Annex IIIa (e.g. "I.", "II."). */
  ordinal: string;
  title: string;
  /** Optional narrative paragraph rendered before the fields. */
  paragraph?: string;
  /** Structured key/value fields shown in this section. */
  fields: AnnexField[];
  /** Optional bullet list (used for the goods table and the
   *  re-export prohibition clauses). */
  bullets?: string[];
}

export interface AnnexDocument {
  title: string;
  /** EU form code (e.g. "EU 2021/821 — Annex IIIa"). */
  documentCode: string;
  /** Form type the operator selected (BAFA, BIS, DDTC, etc.). */
  formType: TradeEUCFormType;
  /** Date the certificate was prepared / printed (ISO yyyy-mm-dd). */
  preparedOn: string;
  /** Optional validity-end date (ISO yyyy-mm-dd). */
  validUntil: string | null;
  /** All sections in display order. */
  sections: AnnexSection[];
}

// ─── Builder ────────────────────────────────────────────────────────

/**
 * Build the Annex IIIa document model from an EUC request + relations.
 *
 * The function is pure — no I/O, no PDF runtime. Test it by passing in
 * fixture data and asserting on the returned `AnnexDocument`.
 */
export function buildAnnexIIIaDocument(input: AnnexEUCInput): AnnexDocument {
  const { euc, counterparty, operation, exporterOrgName } = input;
  const preparedOn = formatDate(new Date());
  const validUntil = euc.validUntil ? formatDate(euc.validUntil) : null;

  return {
    title: "End-Use Certificate",
    documentCode: documentCodeFor(euc.formType),
    formType: euc.formType,
    preparedOn,
    validUntil,
    sections: [
      buildHeaderSection(euc.formType, euc.id, preparedOn, validUntil),
      buildExporterSection(exporterOrgName),
      buildImporterSection(counterparty),
      buildEndUserSection(counterparty, operation),
      buildGoodsSection(operation),
      buildEndUseStatementSection(operation),
      buildNoDiversionSection(),
      buildReExportProhibitionSection(),
      buildSignatureSection(counterparty),
    ],
  };
}

// ─── Section builders ───────────────────────────────────────────────

function buildHeaderSection(
  formType: TradeEUCFormType,
  eucId: string,
  preparedOn: string,
  validUntil: string | null,
): AnnexSection {
  return {
    id: "header",
    ordinal: "",
    title: "End-Use Certificate (Annex IIIa)",
    paragraph:
      "This End-Use Certificate is issued in accordance with " +
      "Regulation (EU) 2021/821 of the European Parliament and of the " +
      "Council of 20 May 2021, setting up a Union regime for the " +
      "control of exports, brokering, technical assistance, transit " +
      "and transfer of dual-use items (recast).",
    fields: [
      {
        label: "Reference",
        value: eucId,
        required: true,
      },
      {
        label: "Form type",
        value: humanFormType(formType),
        required: true,
      },
      {
        label: "Issued on",
        value: preparedOn,
        required: true,
      },
      {
        label: "Valid until",
        value: validUntil ?? "Until revoked",
        required: false,
      },
    ],
  };
}

function buildExporterSection(exporterOrgName: string): AnnexSection {
  return {
    id: "exporter",
    ordinal: "I.",
    title: "Exporter",
    paragraph:
      "The exporter established in the European Union responsible for " +
      "the dispatch of the controlled items.",
    fields: [
      {
        label: "Exporter (legal name)",
        value: exporterOrgName,
        required: true,
      },
    ],
  };
}

function buildImporterSection(party: AnnexCounterparty): AnnexSection {
  return {
    id: "importer",
    ordinal: "II.",
    title: "Importer / Consignee",
    paragraph: "The party in the country of destination receiving the items.",
    fields: [
      {
        label: "Legal name",
        value: party.legalName,
        required: true,
      },
      {
        label: "Trade name",
        value: party.tradeName ?? null,
        required: false,
      },
      {
        label: "Address",
        value: formatAddress(party.addressLines),
        required: true,
      },
      {
        label: "Country of destination",
        value: party.countryCode,
        required: true,
      },
    ],
  };
}

function buildEndUserSection(
  party: AnnexCounterparty,
  operation: AnnexOperation | null | undefined,
): AnnexSection {
  // Per Annex IIIa: if the end-user is the same as the importer,
  // the field may state "Same as importer". Otherwise an explicit
  // end-user name + address must be provided.
  const endUserName = operation?.endUserName?.trim();
  const sameAsImporter = !endUserName || endUserName === party.legalName;
  const endUserSector = operation?.endUserSector ?? null;

  return {
    id: "end_user",
    ordinal: "III.",
    title: "End-User (if different from Importer)",
    paragraph: sameAsImporter
      ? "The end-user is the same as the importer named in section II."
      : "The end-user is a party other than the importer in section II. " +
        "Both the importer and the end-user assume the obligations of " +
        "this certificate.",
    fields: [
      {
        label: "End-user (legal name)",
        value: sameAsImporter ? "Same as importer" : (endUserName ?? null),
        required: true,
      },
      {
        label: "End-user sector",
        value: endUserSector,
        required: false,
      },
      {
        label: "Country of end-use",
        value: operation?.endUseCountry ?? party.countryCode,
        required: true,
      },
    ],
  };
}

function buildGoodsSection(
  operation: AnnexOperation | null | undefined,
): AnnexSection {
  const lines = operation?.lines ?? [];
  const bullets = lines.length
    ? lines.map(formatGoodsLine)
    : [
        "[To be completed by the exporter: description, quantity, " +
          "EU Annex I ECCN, US ECCN/USML where applicable.]",
      ];

  return {
    id: "goods",
    ordinal: "IV.",
    title: "Description of the items",
    paragraph:
      "Complete description of the dual-use items covered by this " +
      "certificate, including the EU Annex I classification (and any " +
      "parallel US ECCN/USML category, where the items are subject " +
      "to US re-export controls).",
    fields: [
      {
        label: "Operation reference",
        value: operation?.reference ?? "Blanket certificate",
        required: false,
      },
    ],
    bullets,
  };
}

function buildEndUseStatementSection(
  operation: AnnexOperation | null | undefined,
): AnnexSection {
  const declared = operation?.declaredEndUse ?? "CIVIL";
  const description = operation?.description?.trim() ?? "";
  return {
    id: "end_use_statement",
    ordinal: "V.",
    title: "Statement of end-use",
    paragraph:
      "The undersigned hereby declares the end-use of the items " +
      "specified in section IV.",
    fields: [
      {
        label: "Declared end-use category",
        value: humanEndUse(declared),
        required: true,
      },
      {
        label: "End-use description",
        value:
          description.length > 0
            ? description
            : "[To be completed: detailed description of the intended " +
              "civilian end-use, end-product, and operational context.]",
        required: true,
      },
    ],
  };
}

function buildNoDiversionSection(): AnnexSection {
  return {
    id: "no_diversion",
    ordinal: "VI.",
    title: "No-diversion undertaking",
    paragraph:
      "The undersigned undertakes that the items described in section " +
      "IV will not be used, in whole or in part, for any purpose " +
      "connected with chemical, biological or nuclear weapons, or " +
      "missiles capable of delivering such weapons, nor for any " +
      "military end-use as defined in Article 4(1)(b) of Regulation " +
      "(EU) 2021/821 in a destination subject to an arms embargo, " +
      "nor for use as parts or components of military items listed " +
      "in any national military list that have been exported from " +
      "the territory of a Member State without authorisation, or in " +
      "breach of an authorisation prescribed by national legislation " +
      "of that Member State.",
    fields: [],
    bullets: [
      "No use for the development, production, handling, operation, " +
        "maintenance, storage, detection, identification or " +
        "dissemination of chemical, biological or nuclear weapons.",
      "No use for the development, production, maintenance or " +
        "storage of missiles capable of delivering such weapons.",
      "No use for any military end-use under Article 4(1)(b) of " +
        "Regulation (EU) 2021/821 in destinations subject to an arms " +
        "embargo.",
      "No use for human-rights violations or internal repression " +
        "under Article 5 of Regulation (EU) 2021/821 " +
        "(cyber-surveillance items).",
    ],
  };
}

function buildReExportProhibitionSection(): AnnexSection {
  return {
    id: "re_export_prohibition",
    ordinal: "VII.",
    title: "Re-export prohibition",
    paragraph:
      "The undersigned undertakes that the items described in section " +
      "IV will not be re-exported, transferred, or otherwise made " +
      "available, directly or indirectly, to any third party or to " +
      "any country other than the country of destination stated in " +
      "section II, without the prior written consent of the exporter " +
      "and, where required, the prior written authorisation of the " +
      "competent authority of the exporting Member State pursuant to " +
      "Article 11 of Regulation (EU) 2021/821.",
    fields: [],
    bullets: [
      "No onward shipment to any third country without exporter " + "consent.",
      "No transfer to any third party (including affiliates, " +
        "subsidiaries, or sub-contractors) without exporter consent.",
      "Where the items are also subject to US re-export controls " +
        "(15 CFR §734.14, §744), the additional written authorisation " +
        "of the US Bureau of Industry and Security or US Department " +
        "of State (DDTC) shall be obtained as required.",
      "Notification to the exporter within fourteen (14) days of any " +
        "request from a third party to acquire, license, or otherwise " +
        "obtain the items.",
    ],
  };
}

function buildSignatureSection(party: AnnexCounterparty): AnnexSection {
  return {
    id: "signature",
    ordinal: "VIII.",
    title: "Signature of the importer / end-user",
    paragraph:
      "By signing below, the undersigned acknowledges that all " +
      "statements in this certificate are true and complete, and " +
      "accepts the obligations set out in sections VI and VII.",
    fields: [
      {
        label: "Signed for (legal entity)",
        value: party.legalName,
        required: true,
      },
      {
        label: "Name of signatory",
        value: null,
        required: true,
      },
      {
        label: "Title / function",
        value: null,
        required: true,
      },
      {
        label: "Place of signature",
        value: null,
        required: true,
      },
      {
        label: "Date of signature",
        value: null,
        required: true,
      },
      {
        label: "Signature",
        value: null,
        required: true,
      },
      {
        label: "Company stamp / seal",
        value: null,
        required: false,
      },
    ],
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function documentCodeFor(formType: TradeEUCFormType): string {
  switch (formType) {
    case "BAFA_C1":
      return "EU 2021/821 — Annex IIIa (BAFA C1)";
    case "BAFA_C6":
      return "EU 2021/821 — Annex IIIa (BAFA C6, re-export)";
    case "BAFA_C7":
      return "EU 2021/821 — Annex IIIa (BAFA C7, Hong Kong)";
    case "BIS_711":
      return "EU 2021/821 — Annex IIIa (cross-referenced with BIS-711)";
    case "DDTC_DS83":
      return "EU 2021/821 — Annex IIIa (cross-referenced with DDTC DS-83)";
    case "OTHER":
    default:
      return "EU 2021/821 — Annex IIIa";
  }
}

function humanFormType(formType: TradeEUCFormType): string {
  switch (formType) {
    case "BAFA_C1":
      return "BAFA C1 — Endverbleibserklärung (civilian)";
    case "BAFA_C6":
      return "BAFA C6 — Endverbleibserklärung (re-export)";
    case "BAFA_C7":
      return "BAFA C7 — Endverbleibserklärung (Hong Kong)";
    case "BIS_711":
      return "US BIS Form 711 — Statement by Ultimate Consignee";
    case "DDTC_DS83":
      return "US DDTC DS-83 — NDAA Compliance Statement";
    case "OTHER":
    default:
      return "Other end-use certificate";
  }
}

function humanEndUse(declared: string): string {
  switch (declared) {
    case "CIVIL":
      return "Civilian / commercial";
    case "DUAL_USE":
      return "Mixed civilian / military (dual-use)";
    case "MILITARY":
      return "Military";
    case "WMD_RELATED":
      return "WMD-related (Art. 4(1)(a) catch-all concern)";
    case "RESEARCH":
      return "Research";
    case "GOVERNMENT":
      return "Government / institutional";
    case "UNKNOWN":
      return "Not yet determined";
    default:
      // Unknown token: render a readable fallback rather than a raw
      // SCREAMING_SNAKE enum value on a signed certificate.
      return declared
        .toLowerCase()
        .split("_")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
  }
}

function formatAddress(lines: string[] | undefined): string {
  if (!lines || lines.length === 0) {
    return "[Address to be completed by the importer]";
  }
  return lines.filter((l) => l && l.trim().length > 0).join(", ");
}

function formatGoodsLine(line: AnnexOperationLine): string {
  const sku = line.internalSku ? ` (SKU ${line.internalSku})` : "";
  const eccnEU = line.eccnEU ? ` · EU Annex I ${line.eccnEU}` : "";
  const eccnUS = line.eccnUS ? ` · US ECCN ${line.eccnUS}` : "";
  const usml = line.usmlCategory ? ` · USML ${line.usmlCategory}` : "";
  const qty = `qty ${line.quantity}`;
  return `${line.itemName}${sku} — ${qty}${eccnEU}${eccnUS}${usml}`;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Convenience: adapt Prisma rows → builder input ─────────────────

/**
 * Tiny adapter so the route handler can pass the eagerly-loaded EUC +
 * counterparty + operation+lines straight in without doing the
 * field-mapping inline. Kept here so the data contract lives next to
 * the builder.
 */
export function adaptEUCForAnnex(args: {
  euc: TradeEUCRequest;
  party: {
    legalName: string;
    tradeName: string | null;
    countryCode: string;
    addressLines: string[];
  };
  operation:
    | (Pick<
        AnnexOperation,
        | "reference"
        | "description"
        | "shipToCountry"
        | "endUseCountry"
        | "declaredEndUse"
        | "endUserName"
        | "endUserSector"
      > & {
        lines: Array<
          Pick<TradeOperationLine, "quantity"> & {
            item: Pick<
              TradeItem,
              | "name"
              | "internalSku"
              | "description"
              | "eccnEU"
              | "eccnUS"
              | "usmlCategory"
            >;
          }
        >;
      })
    | null;
  exporterOrgName: string;
}): AnnexEUCInput {
  const { euc, party, operation, exporterOrgName } = args;

  const mappedOperation: AnnexOperation | null = operation
    ? {
        reference: operation.reference,
        description: operation.description,
        shipToCountry: operation.shipToCountry,
        endUseCountry: operation.endUseCountry,
        declaredEndUse: operation.declaredEndUse,
        endUserName: operation.endUserName,
        endUserSector: operation.endUserSector,
        lines: operation.lines.map((l) => ({
          itemName: l.item.name,
          internalSku: l.item.internalSku,
          description: l.item.description,
          quantity: l.quantity,
          eccnEU: l.item.eccnEU,
          eccnUS: l.item.eccnUS,
          usmlCategory: l.item.usmlCategory,
        })),
      }
    : null;

  return {
    euc: {
      id: euc.id,
      formType: euc.formType,
      status: euc.status,
      requestedAt: euc.requestedAt,
      sentAt: euc.sentAt,
      receivedAt: euc.receivedAt,
      validatedAt: euc.validatedAt,
      validUntil: euc.validUntil,
      notes: euc.notes,
    },
    counterparty: {
      legalName: party.legalName,
      tradeName: party.tradeName,
      countryCode: party.countryCode,
      addressLines: party.addressLines,
    },
    operation: mappedOperation,
    exporterOrgName,
  };
}
