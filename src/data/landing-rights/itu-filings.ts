/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * ITU satellite network filing registry — statically curated.
 *
 * Data sourcing policy: only entries with public-source confirmation
 * are included. Filing dates (API / CR/C / Notification) are omitted
 * unless they can be cross-referenced to a specific BR IFIC issue or
 * ITU Weekly Circular. BIU status comes from operator announcements
 * or industry press (SpaceNews, SpaceIntelReport, FCC filings that
 * reference the ITU network). Where an operator maintains multiple
 * filings for the same system, only the principal one(s) most widely
 * reported in public sources are listed here.
 *
 * Resolution 35 milestones (10 % / 50 % / 100 % of notified space
 * stations deployed by BIU + 2 / 5 / 7 years) are computed only when
 * BIU date is independently verified.
 *
 * The ITU SRS (Space Radiocommunication Stations) database is the
 * authoritative record: https://www.itu.int/ITU-R/space/snl/
 * Direct deep-links are included where a stable URL is available.
 */

import type { ITUFiling } from "./types";

export const ITU_FILINGS: ITUFiling[] = [
  // ─── Starlink Gen-1 (SpaceX) ───────────────────────────────────────
  {
    id: "starlink-gen1-ngso",
    satellite_network_id: "USASAT-NGSO-3",
    operator: "Starlink",
    system_type: "NGSO-FSS",
    biu_status: "biu_achieved",
    notes:
      "SpaceX's first-generation NGSO constellation, filed through the US administration. First operational satellites launched May 2019 (v0.9 batch), commercial 'Better Than Nothing Beta' service began October 2020. BIU in ITU terms was achieved during this operational ramp, but the precise BIU date tied to the specific ITU network ID is not cleanly reported in public sources — we therefore omit biu_date rather than approximate. SpaceX filed multiple companion network IDs at the Ku/Ka bands; USASAT-NGSO-3 is the most commonly cited in FCC cross-references.",
    last_verified: "2026-04-17",
  },

  // ─── Kuiper (Amazon) ───────────────────────────────────────────────
  {
    id: "kuiper-ngso",
    satellite_network_id: "USASAT-NGSO-8",
    operator: "Kuiper",
    system_type: "NGSO-FSS",
    biu_status: "pre_biu",
    notes:
      "Amazon's Project Kuiper NGSO constellation. FCC authorised 30 July 2020 (3,236 satellites). First two prototype satellites (KuiperSat-1 and KuiperSat-2) launched 6 October 2023. First operational production batch deployed 2025. The ITU network ID for Kuiper is commonly cited as USASAT-NGSO-8 in FCC cross-references but we have not directly verified the exact SRS entry; filing dates are therefore omitted. BIU has not been publicly declared as of the verification date.",
    last_verified: "2026-04-17",
  },

  // ─── OneWeb (Eutelsat-OneWeb) ──────────────────────────────────────
  {
    id: "oneweb-ngso",
    satellite_network_id: "L5",
    operator: "OneWeb",
    system_type: "NGSO-FSS",
    biu_status: "biu_achieved",
    notes:
      "OneWeb NGSO Ku-band constellation, filed through the UK administration (formerly under WorldVu / OneWeb Satellites, now Eutelsat Group after the 2023 merger). Constellation phase 1 (648 satellites for the 'L5' network) completed launches March 2023, global coverage declared late 2023 with commercial service roll-out through 2024. BIU in the ITU sense was broadly achieved through this operational milestone but the precise SRS BIU date is not cleanly documented in public press; omitted here. The 'L5' name is publicly cited in UK Ofcom and ITU references.",
    last_verified: "2026-04-17",
  },

  // ─── SES O3b (original MEO constellation) ──────────────────────────
  {
    id: "ses-o3b-meo",
    satellite_network_id: "MEOSAT",
    operator: "SES",
    system_type: "NGSO-FSS",
    biu_status: "biu_achieved",
    notes:
      "SES O3b MEO constellation, filed through the Isle of Man / UK administration under the MEOSAT series. First four operational satellites launched 2013; commercial service began 2014. BIU long-achieved. Additional O3b mPOWER generation satellites launched from December 2022 through 2024 — these are the second-generation operational vehicles but reuse elements of the same ITU filing family. Precise SRS entry and BIU date are not cleanly documented in public press; omitted here.",
    last_verified: "2026-04-17",
  },

  // ─── Starlink Gen-2 (SpaceX) ───────────────────────────────────────
  {
    id: "starlink-gen2-ngso",
    satellite_network_id: "USASAT-NGSO-8A",
    operator: "Starlink",
    system_type: "NGSO-FSS",
    biu_status: "pre_biu",
    notes:
      "SpaceX's second-generation NGSO Starlink system ('Gen2'). FCC partial grant 1 December 2022 (7,500 of the requested 29,988 satellites). SpaceX also filed companion ITU network IDs through Tonga (TONGASAT) in earlier years, but the principal US filing is what the FCC authorisation references. Exact SRS network ID nomenclature varies across sources (USASAT-NGSO-8A and related strings appear); we cite the most common form but omit filing dates pending direct SRS confirmation. V2-Mini satellites have been launching since 2023; full-size V2 (deployable via Starship) still pending. BIU for Gen-2 not yet publicly declared by SpaceX as a discrete milestone.",
    last_verified: "2026-04-17",
  },
];

export function getITUFiling(id: string): ITUFiling | undefined {
  return ITU_FILINGS.find((f) => f.id === id);
}

export function getITUFilingsByOperator(operator: string): ITUFiling[] {
  return ITU_FILINGS.filter(
    (f) => f.operator.toLowerCase() === operator.toLowerCase(),
  );
}
