/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * BAFA ELAN-K2 XSD TypeScript types (Z5a).
 *
 * The German Federal Office for Economic Affairs and Export Control
 * (Bundesamt für Wirtschaft und Ausfuhrkontrolle / BAFA) operates the
 * ELAN-K2 portal — Elektronischer Antrag für Außenwirtschafts-Genehmigungen,
 * Komponente 2. The portal accepts both interactive form submission and
 * XML-Upload via a schema documented at
 * https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/ELAN-K2/
 *
 * This file is **type-only**: no runtime exports, no Zod parsers (yet).
 * The goal is a strongly-typed source-of-truth that the report builder
 * (Z5b) and the XSD-version watcher (Z5c) can both reference.
 *
 * ── Scope ──────────────────────────────────────────────────────────
 * BAFA's actual XSD covers ~400 elements across 12 application types
 * (AGG, EZG, EUGEA, IZG, KU, NAV, NRG, REX, SAU, SGE, SGM, V). The
 * Caelex export covers ONLY the subset that maps cleanly from our
 * canonical TradeOperation:
 *
 *   - <Antrag>           — top-level wrapper for an application
 *   - <Antragsteller>    — applicant (operator's organization)
 *   - <Empfänger>        — recipient (counterparty in destination country)
 *   - <Endverwender>     — end-user (often distinct from Empfänger)
 *   - <Ware>             — line-item with classification codes
 *   - <Zollnummer>       — customs tariff number per line item
 *   - <Lieferung>        — shipment route + scheduled date
 *   - <Verwendungszweck> — declared end-use
 *
 * Elements outside this subset (e.g. banking instructions, agent
 * appointments, multiple signatories) are NOT modeled here — operators
 * fill those manually in ELAN-K2 after uploading the Caelex baseline.
 *
 * ── Naming convention ─────────────────────────────────────────────
 * BAFA's XSD uses German element names with PascalCase. We mirror this
 * 1:1 in our TS types so the serializer is a straight property-name
 * mapping. ASCII-safe form (Empfaenger, Endverwender) for TS identifiers;
 * the serializer (Z5b) writes the umlaut form to the XML output.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── XSD version constant ─────────────────────────────────────────
// Mirrors the version embedded in BAFA's published schema file.
// 5 Feb 2026 per Caelex Trade Living-Plan § 7 Z5; bump when BAFA
// releases a new schema version. Z5c hard-codes EXPECTED and warns
// on divergence.
export const BAFA_XSD_VERSION = "2026-02-05";

// ─── Application kind (subset Caelex models) ──────────────────────

/**
 * Antragsart — the BAFA application type. Maps from Caelex's
 * TradeLicenseType. Only the four most-common operator scenarios
 * are emitted by Caelex's XML export; everything else stays manual.
 */
export type BafaAntragsart =
  /** Einzelausfuhrgenehmigung — single-shipment export license */
  | "EZG"
  /** Allgemeine Genehmigung (Sammelantrag) — general license collective filing */
  | "AGG"
  /** Innergemeinschaftliche Verbringungsgenehmigung — intra-EU transfer of Annex IV */
  | "IZG"
  /** EU Allgemeine Ausfuhrgenehmigung — EU general authorization (EUGEA) */
  | "EUGEA";

// ─── Address ──────────────────────────────────────────────────────

/**
 * Postal-address block. BAFA's XSD encodes <Anschrift> as a flat
 * sequence — street + zip + city + ISO-2 country.
 */
export interface BafaAnschrift {
  /** Strasse + Hausnummer. Required. */
  Strasse: string;
  /** Postleitzahl. Required for DE/AT/CH, optional for non-DACH. */
  PLZ?: string | undefined;
  /** Ort / Stadt. Required. */
  Ort: string;
  /** ISO 3166-1 alpha-2. Required. */
  Land: string;
}

// ─── Antragsteller (Applicant) ────────────────────────────────────

/**
 * Antragsteller — the entity submitting the application. In Caelex
 * this is always the Organization of the user generating the export.
 */
export interface BafaAntragsteller {
  /** Firmenname / company legal name. Required. */
  Name: string;
  /** Address block. Required. */
  Anschrift: BafaAnschrift;
  /**
   * Umsatzsteuer-Identifikationsnummer. Required for DE entities,
   * optional otherwise. Format DE123456789.
   */
  UStIdNr?: string | undefined;
  /**
   * BAFA-Aktenzeichen — pre-existing case reference, when known.
   * Optional — set on follow-up filings, omitted for first filings.
   */
  Aktenzeichen?: string | undefined;
  /** Contact-person name (Ansprechpartner). Optional. */
  Ansprechpartner?: string | undefined;
  /** Contact-person email. Optional but recommended. */
  Email?: string | undefined;
  /** Contact-person phone. Optional. */
  Telefon?: string | undefined;
}

// ─── Empfänger (Recipient) ────────────────────────────────────────

/**
 * Empfänger — the recipient/counterparty in the destination country.
 * In Caelex this maps to TradeOperation.counterparty.
 */
export interface BafaEmpfaenger {
  /** Firmenname / legal name. Required. */
  Name: string;
  /** Address. Required. */
  Anschrift: BafaAnschrift;
  /** Trade name / Handelsname if distinct. Optional. */
  Handelsname?: string | undefined;
  /** USt-IdNr or local VAT equivalent. Optional. */
  UStIdNr?: string | undefined;
  /** LEI code (ISO 17442). Optional. */
  LEI?: string | undefined;
}

// ─── Endverwender (End-user) ──────────────────────────────────────

/**
 * Endverwender — the final user of the goods. Often identical to
 * Empfänger; modelled separately because re-export and triangle-trade
 * scenarios split the two. Maps from TradeOperation.endUserName +
 * endUseCountry + endUserSector.
 */
export interface BafaEndverwender {
  /** End-user name. Required. */
  Name: string;
  /** End-user country (ISO 3166-1 alpha-2). Required. */
  Land: string;
  /**
   * Sektor — industry/sector (Behörden, Forschung, kommerziell, etc.).
   * Optional but strongly recommended by BAFA.
   */
  Sektor?: string | undefined;
  /**
   * Identisch_mit_Empfaenger — explicit flag when end-user == recipient.
   * BAFA accepts the simplification when this is true.
   */
  IdentischMitEmpfaenger: boolean;
}

// ─── Verwendungszweck (Declared end-use) ──────────────────────────

/**
 * Verwendungszweck — declared end-use classification.
 * BAFA enum: zivil (civil), military, dual_use, research, government,
 * unknown. Maps from TradeOperation.declaredEndUse.
 */
export type BafaVerwendungszweck =
  | "zivil"
  | "militaerisch"
  | "dual_use"
  | "forschung"
  | "behoerde"
  | "unbekannt";

// ─── Ware (Goods / Line-Item) ─────────────────────────────────────

/**
 * Ware — one line of the goods schedule (Güter-Position). Each line
 * is one item with its quantity, value, and classification codes.
 * Maps from TradeOperationLine + TradeItem.
 */
export interface BafaWare {
  /** Position number within the application (1-indexed). */
  PositionsNr: number;
  /** Item designation / Warenbezeichnung. Required. */
  Bezeichnung: string;
  /** Free-text description. Optional but recommended. */
  Beschreibung?: string | undefined;
  /** Manufacturer name. Optional. */
  Hersteller?: string | undefined;
  /** Manufacturer part-number / Typenbezeichnung. Optional. */
  Typ?: string | undefined;
  /**
   * Zolltarifnummer — 8-digit HS/CN tariff code (Kombinierte Nomenklatur).
   * Required by BAFA for EZG; optional for AGG/IZG.
   */
  Zollnummer?: string | undefined;
  /**
   * Ausfuhrlistennummer — German AL entry (e.g. "0009b", "5A001a").
   * Optional but required if item is on the AL.
   */
  AusfuhrlistenNr?: string | undefined;
  /**
   * EU dual-use entry — Annex I ECCN-style code (e.g. "9A515.a").
   * Optional but typically populated for space items.
   */
  EUDualUseNr?: string | undefined;
  /**
   * US ECCN for re-export tracking (FDPR / de-minimis). Caelex-specific,
   * not part of stock BAFA XSD but BAFA tolerates extra elements in
   * <Bemerkung> — we emit there.
   */
  USECCN?: string | undefined;
  /** USML category for ITAR items. Optional. */
  USMLCategory?: string | undefined;
  /** Quantity. Required. Decimal. */
  Menge: number;
  /** Quantity unit (Stk, kg, m, …). Required. */
  Mengeneinheit: string;
  /** Unit value. Required. Decimal. */
  Einzelwert: number;
  /** ISO 4217 currency code. Required. */
  Waehrung: string;
  /**
   * Bemerkung — free-text per-line annotation. Caelex uses this to
   * persist additional context (US ECCN, MTCR cat, applied-license
   * cross-reference) without requiring BAFA schema extensions.
   */
  Bemerkung?: string | undefined;
}

// ─── Lieferung (Shipment) ─────────────────────────────────────────

/**
 * Lieferung — shipment block. Route + scheduled date + transit stops.
 * Maps from TradeOperation.shipFromCountry / shipToCountry /
 * routeStops / scheduledShipDate.
 */
export interface BafaLieferung {
  /** Versendung aus — country of dispatch (ISO 3166-1 alpha-2). */
  VersendungVon: string;
  /** Versendung nach — country of receipt (ISO 3166-1 alpha-2). */
  VersendungNach: string;
  /**
   * Voraussichtliches Versanddatum — ISO 8601 date (yyyy-mm-dd).
   * Optional. Required for EZG when known.
   */
  Versanddatum?: string | undefined;
  /**
   * Transit-Routen — list of ISO 3166-1 alpha-2 codes for transit
   * stops. Empty array when direct.
   */
  Transit: string[];
}

// ─── Antrag (top-level Application) ───────────────────────────────

/**
 * Antrag — the top-level wrapper for one BAFA application. Bundles
 * the applicant, recipient, end-user, goods schedule, shipment, and
 * declared end-use.
 *
 * The XML root element wraps a single <Antrag> per Caelex export.
 * Batch submission (one root with many <Antrag>) is supported by
 * BAFA's XSD but not currently emitted by Caelex.
 */
export interface BafaAntrag {
  /** Application kind. Required. */
  Antragsart: BafaAntragsart;
  /** Caelex internal reference, echoed as Vorgangsbezeichnung. */
  Vorgangsbezeichnung: string;
  /** Free-text description / Antragsbeschreibung. Optional. */
  Beschreibung?: string | undefined;
  /** Created-at timestamp, ISO 8601. */
  ErstelltAm: string;
  /** Applicant block. */
  Antragsteller: BafaAntragsteller;
  /** Recipient block. */
  Empfaenger: BafaEmpfaenger;
  /** End-user block. */
  Endverwender: BafaEndverwender;
  /** Shipment-route block. */
  Lieferung: BafaLieferung;
  /** Declared end-use category. */
  Verwendungszweck: BafaVerwendungszweck;
  /** Optional sector of end-use. */
  VerwendungSektor?: string | undefined;
  /**
   * Goods schedule — non-empty array of <Ware> items. BAFA requires
   * at least one line for a valid Antrag.
   */
  Waren: BafaWare[];
  /**
   * Catch-all-Hinweise — concatenated list of triggered EU Art. 4 /
   * Art. 5 / Art. 10 / DE §8 AWV catch-alls. BAFA tolerates this in
   * <Bemerkung>; Caelex emits one bullet per hit.
   */
  CatchAllHinweise: string[];
  /**
   * Existing license stack to cross-reference. Each entry is a
   * one-line summary: "<type> <number> · gültig bis <date>".
   */
  BestehendeGenehmigungen: string[];
  /**
   * Anzeigepflicht-Flag — true when §8 AWV notification duty fires
   * without a covering license. BAFA case officers triage these
   * separately; we hoist it to a top-level boolean.
   */
  Anzeigepflicht: boolean;
}

// ─── Root document ────────────────────────────────────────────────

/**
 * BafaElanK2Document — the root XML element. Wraps one or more
 * <Antrag> elements plus the metadata BAFA needs to route the
 * submission.
 *
 * The XML root tag emitted is <ELAN_K2_Antragspaket> per BAFA's
 * naming convention. We hand-encode the wrapper in the serializer
 * rather than push it into a property here.
 */
export interface BafaElanK2Document {
  /** Schema version this document was generated against. */
  SchemaVersion: string;
  /**
   * Caelex emitter id — a freeform string identifying the software
   * that produced this XML. Helps BAFA's parser-error team triage
   * issues. BAFA does not validate this field.
   */
  Emitter: string;
  /** Generation timestamp (ISO 8601). */
  ErzeugtAm: string;
  /** One or more applications. */
  Antraege: BafaAntrag[];
}
