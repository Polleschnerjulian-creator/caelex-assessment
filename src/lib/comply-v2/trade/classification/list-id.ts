/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Caelex Trade — Control-list identifiers (`ListId`).
 *
 * `ListId` enumerates every regulatory control list an item can be
 * classified against in the Trade classification pipeline. It is the
 * shared vocabulary between the origin → regime map
 * (`origin-regime-map.ts`) and the licence-determination engine
 * (`license-determination.ts`), which routes each `ListId` to the
 * competent national authority.
 *
 * Values carry the BAFA/BIS/DDTC list-identification convention.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Identifier for a regulatory list that an item may match against.
 *
 * Aligned with `RegimeName` in the cross-walk (Z3b) but carries the
 * BAFA/BIS/DDTC list-identification convention rather than the
 * cross-walk's regime tag.
 */
export type ListId =
  /** US Munitions List, 22 CFR Part 121. Sits under ITAR. */
  | "USML"
  /** Council Reg. (EU) 833/2014 Annex IV (Russia/Belarus prohibition). */
  | "EU_ANNEX_IV"
  /** US Commerce Control List, 15 CFR Part 774. Sits under EAR. */
  | "EAR_CCL"
  /** EU Reg. 2021/821 Annex I (dual-use control list). */
  | "EU_ANNEX_I"
  /** German Ausfuhrliste Teil I A (Kriegswaffenliste) + Teil I B (national dual-use). */
  | "DE_AUSFUHRLISTE"
  /** Japan METI Schedule 1 (Goods) + Schedule 2 (Technology) under FEFTA + Export Trade Control Order. */
  | "JP_METI"
  /** UK Strategic Export Control Lists. */
  | "UK_STRATEGIC"
  /** Wassenaar Arrangement — multilateral baseline. */
  | "WASSENAAR"
  /** Missile Technology Control Regime Annex — multilateral baseline. */
  | "MTCR"
  /** Nuclear Suppliers Group Trigger List — multilateral baseline. */
  | "NSG"
  /** Australia Group Common Control List (CBW precursors) — multilateral baseline. */
  | "AG"
  /** EU Common Military List (Council Common Position 2008/944/CFSP). */
  | "EU_CML"
  /** Canada Export Control List, SOR/89-202. */
  | "CA_ECL"
  /** Australia Defence and Strategic Goods List (DSGL). */
  | "AU_DSGL"
  /** Korea Strategic Items list (MOTIE Strategic Trade Act). */
  | "KR_STRATEGIC"
  /** Switzerland Güterkontrollverordnung (GKV, SR 946.202.1). */
  | "CH_GKV"
  /** Norway List I / List II (Norwegian Export Control Regulations). */
  | "NO_LIST"
  /** India SCOMET Appendix 3 (Special Chemicals, Organisms, Materials, Equipment and Technologies). */
  | "IN_SCOMET";
