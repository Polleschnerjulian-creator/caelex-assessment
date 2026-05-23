/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Z14b — AES US (Automated Export System) export-filing payload.
 *
 * AES is the US Customs and Border Protection (CBP) electronic
 * export-filing system. AES filings are mandatory for:
 *
 *   - All shipments where any single commodity is valued > USD 2,500
 *   - Any commodity requiring a Bureau of Industry and Security (BIS)
 *     export license, a DDTC ITAR license, or any other federal export
 *     authorization, regardless of value
 *   - Shipments to embargoed destinations (Cuba, Iran, North Korea,
 *     Syria — even sub-USD-2,500)
 *
 * Historically AES accepted ANSI ASC X.12 EDI 601 (Standard Carrier
 * Alpha Code transactions). The newer ACE (Automated Commercial
 * Environment) Cargo Manifest accepts XML — CBP-CATAIR documents
 * specify the wire format. Caelex emits both formats; this module is
 * **XML-flavoured** with a flat element vocabulary that maps cleanly
 * to either EDI segments or XML elements.
 *
 * This module is **type + builder + serializer**, NOT a live submitter.
 * Z14b stops at "generate a syntactically-correct AES payload from a
 * Caelex TradeOperation." Actual ACE submission via the AES Direct or
 * ACE AESTIR portals is a separate future sprint.
 *
 * ── Source documents ───────────────────────────────────────────────
 *   - CBP "AES Trade Implementation Guide" (latest revision tracked
 *     under https://www.cbp.gov/trade/aes/aestir).
 *   - 15 CFR Part 30 — Foreign Trade Regulations (FTR) — defines who
 *     must file, what data is required, and timing.
 *   - U.S. Census Bureau "AESDirect User Guide" — operational details
 *     of pre-departure and post-departure filings.
 *
 * ── Scope ──────────────────────────────────────────────────────────
 * Caelex emits the data subset that maps cleanly from a TradeOperation:
 *
 *   - <USPPI>             — US Principal Party in Interest (the
 *                            US-based exporter or its agent)
 *   - <UltimateConsignee> — Foreign party that finally receives goods
 *   - <IntermediateConsignee> — Optional foreign middleman
 *   - <Carrier>           — Air / ocean carrier transporting goods
 *   - <Commodity>         — Line-item with HTS code, ECCN, value, qty
 *   - <LicenseCode>       — License-authority indicator
 *                            (C30 = no license required; C31 = BIS
 *                            license; C32 = License Exception STA; etc.)
 *   - <DestinationCountry> — ISO 3166-1 alpha-2 destination
 *
 * Elements outside this subset (intermodal containers, in-bond entries,
 * filer-elected-late-filing flags) stay manual — the filer completes
 * them in AESDirect after upload.
 *
 * ── Naming convention ─────────────────────────────────────────────
 * CBP-CATAIR uses English element names with PascalCase. We mirror
 * this 1:1 in our TS types so the serializer is a straight property-
 * name mapping.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Schema version ───────────────────────────────────────────────
// Pinned to the CBP AES CATAIR revision Caelex was tested against.
// Bump when CBP publishes a new revision. A drift-detector
// (mirroring Z5c for BAFA) lives in a later sub-sprint.
export const AES_SCHEMA_VERSION = "2026-CATAIR-R8";

// ─── Filing kind ──────────────────────────────────────────────────

/**
 * AES filing-action types per CATAIR. Maps from Caelex's
 * TradeOperationType + status.
 */
export type AesFilingAction =
  /** Standard pre-departure filing (most common) */
  | "ADD"
  /** Replace a previously-filed AES record */
  | "REPLACE"
  /** Cancel a previously-filed AES record */
  | "CANCEL";

/**
 * Mode of transportation per CBP CATAIR Appendix B.
 *   "10" — Vessel, non-container
 *   "11" — Vessel, container
 *   "20" — Rail
 *   "30" — Truck
 *   "40" — Air
 *   "50" — Mail
 *   "60" — Passenger handcarried
 *   "70" — Fixed transport installation
 */
export type AesTransportMode =
  | "10"
  | "11"
  | "20"
  | "30"
  | "40"
  | "50"
  | "60"
  | "70";

// ─── Address ──────────────────────────────────────────────────────

/**
 * Address block per CBP-CATAIR. State is required for US addresses
 * (ISO-3166-2 sub-division code), and ZIP / PostalCode is required
 * for US addresses.
 */
export interface AesAddress {
  /** Street + house number. Required. */
  Street: string;
  /** City / municipality. Required. */
  City: string;
  /**
   * State / sub-division code. Required for US addresses (e.g. "CA",
   * "TX"), optional otherwise.
   */
  StateOrProvince?: string | undefined;
  /**
   * Postal code / ZIP. Required for US addresses; recommended for
   * foreign consignees in countries that use postal codes.
   */
  PostalCode?: string | undefined;
  /** ISO 3166-1 alpha-2 country code. Required. */
  CountryCode: string;
}

// ─── USPPI (US Principal Party in Interest) ───────────────────────

/**
 * USPPI — the US Principal Party in Interest. The party in the US who
 * receives the primary benefit, monetary or otherwise, from the export
 * transaction. Per 15 CFR § 30.3, the USPPI is typically the US seller,
 * manufacturer, or order party.
 *
 * In Caelex this maps to the Organization filing the export (when the
 * organization is US-based) or to the US-side authorized agent
 * (typically a freight forwarder) when the Caelex org is non-US.
 */
export interface AesUSPPI {
  /** Legal name. Required. */
  Name: string;
  /** Address block. Required (must be US). */
  Address: AesAddress;
  /**
   * Employer Identification Number (EIN) or Social Security Number
   * (SSN) per 15 CFR § 30.3(b). For corporate filers this is the
   * 9-digit EIN, no hyphen. Required.
   */
  IdentifierType: "EIN" | "SSN" | "DUNS";
  /** Identifier value (e.g. "981234567"). Required. */
  IdentifierValue: string;
  /** Contact-person name. Required. */
  ContactName: string;
  /** Contact phone (E.164 format preferred). Required. */
  ContactPhone: string;
  /** Contact email. Recommended. */
  ContactEmail?: string | undefined;
}

// ─── Ultimate Consignee ───────────────────────────────────────────

/**
 * UltimateConsignee — the party abroad who actually receives and uses
 * the merchandise. Distinct from the intermediate consignee (broker /
 * forwarder). Per 15 CFR § 30.6(a)(15) the ultimate consignee may be
 * the buyer, the end user, or the foreign principal party in interest.
 *
 * Maps from TradeOperation.endUserName + counterparty when end-user
 * differs, otherwise counterparty.
 */
export interface AesUltimateConsignee {
  /** Legal name. Required. */
  Name: string;
  /** Address block. Required. */
  Address: AesAddress;
  /**
   * Consignee type per CATAIR Appendix C.
   *   "D" — Direct consumer
   *   "G" — Government entity
   *   "O" — Other / unknown
   *   "R" — Reseller
   */
  Type: "D" | "G" | "O" | "R";
}

// ─── Intermediate Consignee ───────────────────────────────────────

/**
 * IntermediateConsignee — the foreign party that delivers the goods
 * to the ultimate consignee (typically a forwarder / customs broker
 * at the destination port). Optional — only when the chain has an
 * intermediary.
 */
export interface AesIntermediateConsignee {
  Name: string;
  Address: AesAddress;
}

// ─── Carrier ──────────────────────────────────────────────────────

/**
 * Carrier — the entity transporting the goods (airline, shipping line,
 * trucking company). Required for AES per 15 CFR § 30.6(a)(11).
 */
export interface AesCarrier {
  /** Carrier legal name. Required. */
  Name: string;
  /**
   * Standard Carrier Alpha Code (SCAC) for vessel / rail / truck, or
   * IATA airline code for air. Required.
   *
   * Examples: "MAEU" (Maersk), "UPSN" (UPS), "LH" (Lufthansa Cargo).
   */
  SCACorIATA: string;
}

// ─── Commodity (Line-Item) ────────────────────────────────────────

/**
 * Commodity — one Schedule B / HTS line of the goods schedule. Per
 * 15 CFR § 30.6(a)(20) each line carries a Schedule B (US export
 * classification) code, value, quantity, weight, license info, and
 * end-use category.
 */
export interface AesCommodity {
  /** 1-indexed position within the filing. Required. */
  LineNumber: number;
  /** Commodity description / Warenbezeichnung. Required, max 250 chars. */
  Description: string;
  /**
   * Schedule B / HTS-US code (10 digits — Schedule B for exports,
   * HTSUS for imports; CBP accepts either at the same level of
   * precision for AES). Required. Format: "8412.90.0080".
   */
  ScheduleBOrHTS: string;
  /**
   * Export Control Classification Number (ECCN) per 15 CFR § 738.2.
   * Required when the item is subject to the EAR and not designated
   * EAR99. Format: "9A515.a".
   */
  ECCN?: string | undefined;
  /**
   * USML category for ITAR items per 22 CFR § 121. Format: "XV(a)(7)".
   * Required when the item is on the USML — but for ITAR exports the
   * filer typically uses a DDTC license-code (C36 / C37) AND USML
   * category here for cross-reference.
   */
  USML?: string | undefined;
  /**
   * License-authority code per CATAIR Appendix F:
   *   "C30" — No license required (NLR)
   *   "C31" — BIS license required
   *   "C32" — License Exception STA
   *   "C33" — License Exception ENC
   *   "C34" — License Exception CIV (obsolete; kept for legacy)
   *   "C35" — License Exception TMP
   *   "C36" — DDTC license (ITAR controlled)
   *   "C37" — DDTC license exemption
   *   "C60" — OFAC license required
   *
   * Required. Defaults to "C30" (NLR) when no license is on the line.
   */
  LicenseCode: string;
  /**
   * BIS license number, DDTC DSP number, OFAC license, or License
   * Exception self-reference (e.g. "STA-EAR-740.20"). Required for
   * LicenseCode != "C30".
   */
  LicenseNumber?: string | undefined;
  /** Quantity in Schedule-B units. Required. */
  Quantity: number;
  /**
   * Unit of measure per Schedule B (e.g. "NO" = number, "KG" = kg,
   * "M2" = square metres). Required.
   */
  UnitOfMeasure: string;
  /** Total commodity value in USD. Required. */
  ValueUSD: number;
  /** Shipping weight in kilograms. Required. */
  ShippingWeightKg: number;
  /**
   * Country of origin (ISO 3166-1 alpha-2) per FTR § 30.6(a)(15).
   * Required.
   */
  CountryOfOrigin: string;
  /**
   * Origin-of-goods indicator: "D" (Domestic / US origin) or "F"
   * (Foreign origin). Required by AES.
   */
  OriginIndicator: "D" | "F";
  /**
   * Export information code per CATAIR Appendix D — provides the
   * end-use category. Common values:
   *   "OS" — All other shipments (default)
   *   "FS" — Foreign-trade-zone shipment
   *   "GP" — US government, non-defense
   *   "GS" — Shipments under foreign military sales (FMS)
   *   "TE" — Temporary export
   *   "TP" — Temporary export to be returned
   */
  ExportInformationCode: string;
}

// ─── Filing (root) ────────────────────────────────────────────────

/**
 * Filing — the top-level AES electronic-filing data object. Maps to a
 * single AES record submitted via ACE / AESDirect. After acceptance,
 * AES returns the ITN (Internal Transaction Number — format
 * "X20260615000123") that the filer prints on the air waybill / B/L.
 */
export interface AesFiling {
  /**
   * Filer-assigned shipment reference. Echoed in AES response messages.
   * Format: alphanumeric, max 17 chars, must be unique per USPPI EIN.
   */
  ShipmentReferenceNumber: string;
  /** Filing-action kind: ADD / REPLACE / CANCEL. */
  FilingAction: AesFilingAction;
  /**
   * Filer type code per CATAIR Appendix E:
   *   "USPPI"            — USPPI files directly
   *   "AUTHORIZED_AGENT" — Forwarder files on USPPI's behalf
   */
  FilerType: "USPPI" | "AUTHORIZED_AGENT";
  /**
   * Estimated export date — when the goods will physically leave US
   * customs territory. Required, yyyy-mm-dd. Per FTR § 30.4, must be
   * filed before the goods are exported (pre-departure) for ITAR items
   * and certain license types.
   */
  ExportDate: string;
  /** USPPI block. */
  USPPI: AesUSPPI;
  /** Ultimate-consignee block. */
  UltimateConsignee: AesUltimateConsignee;
  /** Optional intermediate-consignee block. */
  IntermediateConsignee?: AesIntermediateConsignee | undefined;
  /** Carrier block. */
  Carrier: AesCarrier;
  /** Mode of transport at US border. */
  TransportMode: AesTransportMode;
  /**
   * Port-of-export code per CBP "Schedule D — Customs Districts and
   * Ports". 4-digit code, e.g. "2704" (LAX), "4601" (Newark), "5301" (DTW).
   */
  PortOfExport: string;
  /**
   * Country of ultimate destination (ISO 3166-1 alpha-2). Required.
   * This is the country where the goods will be consumed / used —
   * may differ from UltimateConsignee.Address.CountryCode for triangle
   * trades.
   */
  CountryOfDestination: string;
  /**
   * Goods schedule — non-empty array. AES requires at least one
   * commodity per filing.
   */
  Commodities: AesCommodity[];
  /**
   * Hazardous-materials indicator per 49 CFR § 172. True for shipments
   * containing hazmat (lithium batteries, propellant, etc.).
   */
  HazardousMaterials: boolean;
  /**
   * Routed-export-transaction indicator per FTR § 30.3(e). True when
   * the foreign principal party in interest (FPPI) authorizes the US
   * forwarder to facilitate the export.
   */
  RoutedExportTransaction: boolean;
  /**
   * Total filing value in USD (sum of commodity values). Per CATAIR
   * this is informational; CBP accepts inequality with sum-of-lines
   * because supplementary charges may apply.
   */
  TotalValueUSD: number;
}

// ─── Root payload ─────────────────────────────────────────────────

/**
 * AesPayload — root container. Wraps a single Filing plus transmission
 * metadata. The wire-format XML root tag is <AES_ExportFiling>.
 */
export interface AesPayload {
  /** CATAIR schema revision this payload was built against. */
  SchemaVersion: string;
  /**
   * Caelex emitter id — freeform identifier of the producing software,
   * helps CBP triage parser errors. Not validated by AES.
   */
  Emitter: string;
  /** Generation timestamp (ISO 8601). */
  GeneratedAt: string;
  /** Exactly one filing per payload — AES does not batch records. */
  Filing: AesFiling;
}
