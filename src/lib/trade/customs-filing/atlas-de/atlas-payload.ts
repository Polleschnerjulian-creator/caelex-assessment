/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Z14a — ATLAS-DE Ausfuhranmeldung (German customs e-export filing).
 *
 * ATLAS = Automatisiertes Tarif- und Lokales Zoll-Abwicklungs-System,
 * operated by the German Generalzolldirektion (GZD). The ATLAS-AES
 * subsystem accepts XML-based export declarations
 * (Ausfuhranmeldungen) covering EU dual-use goods, ITAR / EAR re-export
 * cross-references, and intra-EU transits of Annex IV items.
 *
 * This module is **type + builder + serializer**, NOT a live submitter.
 * Z14a stops at "generate a syntactically-correct ATLAS payload from a
 * Caelex TradeOperation". The actual SOAP / AS4-EDIFACT bridge into
 * GZD's IT-Verfahren ATLAS is a separate future sprint.
 *
 * ── Source documents ───────────────────────────────────────────────
 *   - Zoll.de — IT-Verfahren ATLAS, Teilverfahren AES (export filing)
 *     https://www.zoll.de/DE/Fachthemen/Zoelle/ATLAS/IT-Verfahren-ATLAS/
 *     ausfuhrverfahren-aes/ausfuhrverfahren-aes_node.html
 *   - EU Customs Code (UCC) Reg (EU) No 952/2013, Art. 263-269 (export
 *     declaration data set IE515 / IE599).
 *   - ATLAS XSD bundle (versioned ~quarterly by GZD; we pin the version
 *     constant below and bump when the schema migrates).
 *
 * ── Scope ──────────────────────────────────────────────────────────
 * Caelex emits the data subset that maps cleanly from a TradeOperation:
 *
 *   - <Exporter>          — Ausführer (export-declaration applicant)
 *   - <Consignee>         — Empfänger im Drittland
 *   - <Office>            — Ausfuhrzollstelle (departure customs office)
 *   - <Item>              — Warenposition (with KN/CN code, value, weight)
 *   - <TransportDocument> — Beförderungspapier (B/L, AWB, CMR)
 *   - <PreviousDocument>  — Vorpapier (only for re-exports)
 *   - <LicenseReference>  — Bewilligungs-/Genehmigungsnachweis
 *                            (BAFA EZG/AGG number or EU GEA reference)
 *
 * Elements outside this subset (Bürgschaft, Sicherheitsleistung, value-
 * detail breakdowns, internal procedure codes for Carnet-ATA etc.)
 * stay manual — operators add them in the ATLAS frontend after upload.
 *
 * ── Naming convention ─────────────────────────────────────────────
 * GZD's XSD uses English element names (per WCO Customs Data Model
 * v3) with PascalCase. We mirror this 1:1. TS identifiers are ASCII-
 * safe; the serializer emits the canonical PascalCase form.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── XSD version ──────────────────────────────────────────────────
// Pinned to the schema version GZD published with the May 2026
// ATLAS-AES release. Drift is detected by Z14a's version-check (TBD
// in a later sub-sprint, mirroring Z5c for BAFA).
export const ATLAS_XSD_VERSION = "2026-04-01";

// ─── Declaration kind ─────────────────────────────────────────────

/**
 * AnmeldungsArt — the type of export declaration. ATLAS distinguishes
 * normal exports, re-exports, intra-EU transits (when goods are sensitive
 * Annex IV items), and temporary exports. Maps from Caelex's
 * TradeOperationType.
 */
export type AtlasDeclarationType =
  /** Standard export of EU-origin or duty-paid goods to a third country */
  | "EXPORT"
  /** Re-export of non-EU-origin goods (was on customs-warehouse / IPR) */
  | "REEXPORT"
  /** Intra-EU transit of Annex IV dual-use items */
  | "INTRA_EU_TRANSIT"
  /** Temporary export with re-import expected (Carnet-ATA etc.) */
  | "TEMP_EXPORT";

// ─── Postal address ───────────────────────────────────────────────

/**
 * Address block per WCO data model. ATLAS requires city + country
 * always; street + postcode required for EU establishments.
 */
export interface AtlasAddress {
  /** Street + house number. Required for EU; optional for third-country consignees. */
  Street?: string | undefined;
  /** Postal code. Required for EU; recommended for US/JP/AU consignees. */
  PostalCode?: string | undefined;
  /** City / municipality. Required. */
  City: string;
  /** ISO 3166-1 alpha-2. Required. */
  CountryCode: string;
}

// ─── Exporter (Ausführer) ─────────────────────────────────────────

/**
 * Exporter — the operator's legal entity, the EORI-bearing party. In
 * Caelex this maps to the Organization of the user generating the
 * declaration.
 */
export interface AtlasExporter {
  /** Company legal name. Required. */
  Name: string;
  /** Address block. Required. */
  Address: AtlasAddress;
  /**
   * EORI number — Economic Operator Registration & Identification.
   * Format: DE + 10–15 alphanumerics, e.g. "DE5300000012345".
   * Required by ATLAS for all export declarants.
   */
  EORI: string;
  /** UStIdNr / VAT number. Recommended (de-duplicates against EORI). */
  VATNumber?: string | undefined;
  /** Contact person email. Optional but ATLAS prefers it for IE599 receipt. */
  ContactEmail?: string | undefined;
}

// ─── Consignee (Empfänger im Drittland) ───────────────────────────

/**
 * Consignee — the recipient party in the destination third country.
 * Maps from TradeOperation.counterparty.
 */
export interface AtlasConsignee {
  /** Recipient legal name. Required. */
  Name: string;
  /** Recipient address. Required. */
  Address: AtlasAddress;
  /**
   * EORI of the consignee if known. Most third-country consignees lack
   * an EORI — leave undefined.
   */
  EORI?: string | undefined;
  /** Trade name if distinct from legal name. Optional. */
  TradeName?: string | undefined;
}

// ─── Office (Ausfuhrzollstelle) ───────────────────────────────────

/**
 * Office — the customs office at which the goods will be presented for
 * export clearance. ATLAS uses a 6-character code: first two are ISO-
 * country (DE), rest is the office identifier.
 *
 * Example: "DE000891" = Zollamt Frankfurt am Main, "DE003001" = ZA Köln
 */
export interface AtlasOffice {
  /** Office code (e.g. "DE000891"). Required. */
  ReferenceNumber: string;
  /** Human-readable office name. Optional, for operator clarity. */
  Name?: string | undefined;
}

// ─── Transport document ───────────────────────────────────────────

/**
 * Beförderungspapier — the carriage document referencing the shipment
 * (Air Waybill, Bill of Lading, CMR consignment note, etc.).
 */
export interface AtlasTransportDocument {
  /**
   * Document-type code per UCC DA Annex B.
   *   "N740" — Air Waybill
   *   "N741" — Master Air Waybill
   *   "N703" — Bill of Lading
   *   "N730" — CMR consignment note
   *   "N714" — Rail consignment note
   */
  TypeCode: string;
  /** Free-form reference (waybill number, B/L number). Required. */
  Reference: string;
}

// ─── Previous document (for re-exports) ───────────────────────────

/**
 * Vorpapier — links a re-export declaration back to the prior import
 * MRN, IPR authorization number, or customs-warehouse entry. Required
 * for AtlasDeclarationType === "REEXPORT".
 */
export interface AtlasPreviousDocument {
  /**
   * Document-class code: "N830" = previous declaration; "N820" =
   * Carnet-ATA carnet; "N831" = customs-warehouse entry; etc.
   */
  TypeCode: string;
  /** MRN / reference (e.g. "26DE12345678901234"). Required. */
  Reference: string;
}

// ─── License reference (Genehmigungsnachweis) ─────────────────────

/**
 * License reference — explicit cross-link to a BAFA export license or
 * EU general authorisation that covers this declaration. Required when
 * the item triggers a license requirement (per Caelex license-determination
 * engine).
 *
 * Each Caelex TradeLicense on the operation becomes one entry; we emit
 * a separate <LicenseReference> per type code so ATLAS can correlate
 * the right one to the right item.
 */
export interface AtlasLicenseReference {
  /**
   * License-document type code:
   *   "X002" — BAFA Einzelausfuhrgenehmigung (EZG)
   *   "X003" — BAFA Sammelausfuhrgenehmigung (AGG)
   *   "Y901" — EU General Export Authorisation (EUGEA)
   *   "Y902" — License Exception (US BIS — informational only)
   *   "L116" — DDTC DSP-5 (ITAR — re-export from EU territory)
   */
  TypeCode: string;
  /** License number, e.g. "AGG12-2026-007". Required. */
  Reference: string;
  /** Optional issuing authority (BAFA, BIS, DDTC). */
  IssuingAuthority?: string | undefined;
  /** Optional validity end-date, yyyy-mm-dd. */
  ValidUntil?: string | undefined;
}

// ─── Item (Warenposition) ─────────────────────────────────────────

/**
 * Item — one line of the goods schedule. Each line is one declared
 * commodity with its KN/CN tariff code, quantities, value, weight, and
 * country of origin. ATLAS expects per-item linkage to its covering
 * license reference (via LicenseReferenceTypeCode + LicenseReference).
 */
export interface AtlasItem {
  /** 1-indexed position within the declaration. Required. */
  ItemNumber: number;
  /** Item designation / Warenbezeichnung. Required, max 280 chars. */
  Description: string;
  /**
   * Kombinierte Nomenklatur — 8-digit CN code (extended HS6 + EU CN2).
   * Required for ATLAS. Format: "84129080".
   */
  CNCode: string;
  /**
   * Country of origin (ISO 3166-1 alpha-2). Required.
   * For non-preferential origin per UCC Art. 60-61.
   */
  CountryOfOrigin: string;
  /** Net mass in kilograms. Required, decimal. */
  NetMassKg: number;
  /**
   * Supplementary unit (e.g. "PCE" pieces, "NAR" number-of-articles,
   * "MTR" metres) per UCC DA Annex 21-01. Required when CN-code mandates
   * a supplementary unit.
   */
  SupplementaryUnit?: string | undefined;
  /** Supplementary-unit quantity. Required when SupplementaryUnit set. */
  SupplementaryQuantity?: number | undefined;
  /**
   * Statistical value in EUR (or operation currency, converted at the
   * ECB reference rate of the declaration date). Required.
   */
  StatisticalValue: number;
  /** ISO 4217 currency for StatisticalValue. Required. */
  Currency: string;
  /**
   * AusfuhrlistenNr (DE Anlage AL position). Optional; required if the
   * item is on the AL. Format e.g. "0009b", "5A001a".
   */
  GermanAlEntry?: string | undefined;
  /** EU Annex I dual-use entry. Optional but populated for space items. */
  EUDualUseCode?: string | undefined;
  /** US ECCN for re-export cross-tracking. Optional. */
  USECCN?: string | undefined;
  /**
   * Per-item license-reference cross-link. Empty array = no license
   * required (e.g. EAR99 or non-controlled CN code).
   */
  Licenses: AtlasLicenseReference[];
  /** Free-text remark. Optional. */
  AdditionalInformation?: string | undefined;
}

// ─── Declaration (root) ───────────────────────────────────────────

/**
 * Declaration — the top-level ATLAS export-declaration data object.
 * Maps to a single IE515 (Ausfuhranmeldung) message that gets submitted
 * to GZD. After clearance, GZD returns the MRN (Movement Reference
 * Number) and later the IE599 (Ausgangsvermerk) confirming exit from
 * EU customs territory.
 */
export interface AtlasDeclaration {
  /** Caelex internal reference echoed as LocalReferenceNumber. */
  LocalReferenceNumber: string;
  /** Declaration kind. */
  DeclarationType: AtlasDeclarationType;
  /** Declaration date (yyyy-mm-dd). Required. */
  DeclarationDate: string;
  /** Exporter (Ausführer) block. */
  Exporter: AtlasExporter;
  /** Consignee block. */
  Consignee: AtlasConsignee;
  /** Departure customs office. */
  OfficeOfExport: AtlasOffice;
  /**
   * Country of destination (ISO 3166-1 alpha-2). Required.
   * This is the final destination, may differ from Consignee.CountryCode
   * for triangle trades.
   */
  DestinationCountry: string;
  /**
   * Country of dispatch (ISO 3166-1 alpha-2). Required.
   * Always an EU member state for ATLAS declarations.
   */
  DispatchCountry: string;
  /**
   * Mode of transport at border: 1=Sea, 2=Rail, 3=Road, 4=Air,
   * 5=Mail, 7=Fixed-installation, 8=Inland-waterway, 9=Self-propelled.
   * Per UCC DA Annex 13.
   */
  TransportModeBorder: string;
  /** Transport document reference (B/L, AWB, CMR). */
  TransportDocument?: AtlasTransportDocument | undefined;
  /**
   * Previous-document references. Required for REEXPORT, empty for
   * standard EXPORT. May contain multiple entries when re-exporting
   * goods that came in under several MRNs.
   */
  PreviousDocuments: AtlasPreviousDocument[];
  /**
   * Goods schedule — non-empty array of Items. ATLAS requires at least
   * one item per declaration.
   */
  Items: AtlasItem[];
  /**
   * Total invoice value in declaration currency. Sum of Item statistical
   * values (rough check; ATLAS does not strictly enforce equality
   * because supplementary charges can apply).
   */
  TotalInvoiceAmount: number;
  /** ISO 4217 currency for TotalInvoiceAmount. */
  TotalInvoiceCurrency: string;
}

// ─── Root payload ─────────────────────────────────────────────────

/**
 * AtlasPayload — root container. Wraps one Declaration plus metadata
 * for transmission. The wire-format XML root tag is
 * <ATLAS_Ausfuhranmeldung>.
 */
export interface AtlasPayload {
  /** Schema version this payload was built against. */
  SchemaVersion: string;
  /**
   * Caelex emitter id — freeform identifier of the producing software,
   * used by GZD's parser-team for triage. Not validated by ATLAS.
   */
  Emitter: string;
  /** Generation timestamp (ISO 8601). */
  GeneratedAt: string;
  /** Exactly one declaration per payload (ATLAS does not batch IE515). */
  Declaration: AtlasDeclaration;
}
