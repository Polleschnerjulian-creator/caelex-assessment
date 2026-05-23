/**
 * Sprint Z34-Cat5 (Tier 3) — EU Annex I Category 5 full enumeration.
 *
 * Cat. 5 of EU Reg. (EU) 2021/821 Annex I is the Telecommunications +
 * Information Security category. It splits into two parts:
 *
 *   - **Part 1 (5.A.1 / 5.B.1 / 5.D.1 / 5.E.1)** — Telecommunications.
 *     Captures modulation hardware, radio-frequency equipment, ground
 *     stations, inter-satellite-link terminals, antennas, monolithic
 *     microwave integrated circuits, and the associated test gear,
 *     software, and technology.
 *
 *   - **Part 2 (5.A.2 / 5.A.3 / 5.A.4 / 5.B.2 / 5.D.2 / 5.D.3 / 5.E.2)**
 *     — Information Security / Cryptography. Captures symmetric +
 *     asymmetric crypto, hardware security modules, key-management
 *     items, cryptanalytic tooling, plus test/software/technology.
 *
 * Space relevance (the reason we enumerate this here, not as a side
 * branch of the main eu-annex-i.ts):
 *
 *   - Every comm-sat, ground station, and inter-satellite-link is
 *     captured by 5A001.b (RF) or 5A001.f.1 (spread-spectrum
 *     anti-jam) or 5A001.h (optical link / OISL).
 *   - Every encryption-enabled payload (TT&C link encryption,
 *     telemetry crypto, mission data confidentiality, key-management
 *     systems) falls under 5A002 — and therefore drags a Cat-5-Part-2
 *     reasons-for-control flag (EI in US shorthand, NS in EU).
 *
 * Source: EU Reg. (EU) 2021/821 Annex I, Cat. 5 (consolidated text via
 * EUR-Lex CELEX 02021R0821).
 *
 * **NOT a verbatim transcription.** Each entry has paraphrased title +
 * description, cites the official source URL. The official Cat. 5 has
 * approx. 300+ sub-entries; Caelex covers ~45 (the most space-relevant
 * + the structural entries operators need to discover during a Cat-5
 * walk). For full lookup, consult EUR-Lex directly.
 *
 * Parametric thresholds for the space-critical sub-entries (5A001.b
 * inter-sat-link bandwidth, 5A001.f.1 spread-spectrum, 5A002.a crypto
 * modules) live in `src/lib/comply-v2/trade/classification/
 * control-list-cross-walk.ts` and carry the `// Z34-Cat5` marker.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";

const SOURCE_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32021R0821";
const ASOF = "2026-05-23";

export const EU_ANNEX_I_CAT5_COVERAGE: ClassificationCoverage = {
  jurisdiction: "EU_ANNEX_I",
  scope:
    "EU Annex I Cat. 5 Part 1 (Telecommunications: 5A001/5B001/5D001/5E001) + Part 2 (Information Security: 5A002/5A003/5A004/5B002/5D002/5D003/5E002). Aerospace-relevant sub-entries enumerated; structural sub-entries included so the matcher can walk the tree.",
  excluded: [
    "Sub-entries with no plausible space-systems relevance (consumer cellular handsets, fixed POTS switching gear).",
    "Free-text technical-note carve-outs (Decontrol notes, Cryptography Note) — those are evaluated in license-determination, not in classification.",
    "Mass-market crypto under the Cryptography Note (Note 3 to Cat. 5 Part 2) — handled at the license-determination stage.",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 300,
  caelexCoverageCount: 46,
};

export const EU_ANNEX_I_CAT5_ENTRIES: ClassificationEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 5.A.1 — TELECOMMUNICATIONS — Hardware
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5A001",
    jurisdiction: "EU_ANNEX_I",
    title: "Telecommunications systems, equipment, components — header",
    description:
      "Header entry for the telecommunications hardware family. Captures any system, equipment, or specially-designed component meeting one of the sub-entry tripwires (5A001.a through 5A001.h).",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — operators classify against the most-specific sub-entry that applies.",
  },
  {
    code: "5A001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Telecom systems with digital techniques above defined data rates",
    description:
      "Telecommunications equipment using digital techniques operating above defined data-rate thresholds, or with optimisations for resistance to deliberate jamming / interception.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "5A001.a covers the broad 'high-throughput digital telecom' tripwire — relevant for ground-station modems, satellite payload modulators.",
  },
  {
    code: "5A001.b",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Radio equipment, MMICs, phased-array antennas above frequency thresholds",
    description:
      "Radio equipment, monolithic microwave integrated circuits (MMICs), phased-array antennas operating above specified frequency / bandwidth thresholds (incl. above 31.8 GHz with electronic beam-steering).",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Captures Ka/Q/V-band phased-array antennas and high-throughput MMICs — the structural enabler for HTS comm-sats and ISL terminals.",
  },
  {
    code: "5A001.b.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Inter-satellite link transmit/receive equipment",
    description:
      "Equipment specially designed for inter-satellite-link transmission/reception above defined data-rate × range thresholds. The structural capture for ISL terminals across LEO/MEO constellations.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Companion to 5A001.f for RF-based ISLs. Parametric threshold (crossLinkBandwidthMbps) tracked in cross-walk.",
  },
  {
    code: "5A001.b.5",
    jurisdiction: "EU_ANNEX_I",
    title: "Equipment for mobile telecommunications interception",
    description:
      "Equipment designed for interception of mobile telecom signals (incl. monitoring + analysis). Cross-cuts with Cat. 5 Part 2 cryptanalytic gear.",
    controlReasons: ["NS", "HR"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "HR control reason from EU 2021/821 Art. 5 (cyber-surveillance) — restricts export to jurisdictions where human-rights risk is flagged.",
  },
  {
    code: "5A001.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Telecom transmission equipment with optical techniques",
    description:
      "Telecom transmission equipment using optical techniques (other than the optical free-space items in 5A001.f / 5A001.h), incl. WDM, fiber-optic transmission, optical amplifiers above gain thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Underwater telecommunications equipment",
    description:
      "Underwater communications equipment (acoustic + EM), specially designed cables, repeaters. Mostly naval — included for Cat-5 completeness.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.e",
    jurisdiction: "EU_ANNEX_I",
    title: "Radio equipment for high-mobility operation",
    description:
      "Radio equipment specially designed for high-mobility operation (incl. anti-jam features) at frequencies above 4 GHz. Aerospace-relevant for airborne-relay platforms.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.f",
    jurisdiction: "EU_ANNEX_I",
    title: "Spread-spectrum / frequency-agile radio equipment",
    description:
      "Radio equipment using spread-spectrum techniques (incl. frequency-hopping, direct-sequence) or programmable bandwidth-modulation with anti-jam properties.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.f.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Spread-spectrum anti-jam radio with programmable hop-rate",
    description:
      "Spread-spectrum radio equipment with user-programmable frequency-hopping rate, channel-spacing, or PN-code patterns. The canonical satellite-TT&C anti-jam tripwire.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Space-critical: covers anti-jam TT&C uplinks. Operators of GEO/MEO comms-sats with robust uplink encryption hit this directly. Parametric predicate (isAntiJam) tracked in cross-walk.",
  },
  {
    code: "5A001.f.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Adaptive null-steering / interference-cancellation receivers",
    description:
      "Receiver equipment with adaptive null-steering, smart-beam-forming, or interference-cancellation that adapts in <1 second. Captures GNSS anti-jam + comm-sat protected uplink receivers.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.g",
    jurisdiction: "EU_ANNEX_I",
    title: "Mobile-comm radio equipment + handsets (defined-use)",
    description:
      "Mobile-comms radio equipment specially designed for military or other restricted-use modes (incl. military waveforms). Distinguished from mass-market consumer mobile handsets.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.h",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical free-space communication terminals",
    description:
      "Free-space optical-comm terminals (laser communication) above defined data-rate × range product thresholds; tracking systems; specific wavelength bands. Includes optical inter-satellite links.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Mynaric Condor, Tesat SCOT80, CACI photonic terminals fall here. 'ITAR-free' marketing requires verified zero US-DNA — see De-Minimis-Calculator.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.B.1 — TELECOMMUNICATIONS — Test, Inspection, Production
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5B001",
    jurisdiction: "EU_ANNEX_I",
    title: "Test/inspection/production equipment for 5A001 telecom",
    description:
      "Test, inspection, and production equipment + components specially designed for the development or production of 5A001 telecommunications hardware.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — captures spectrum analyzers above 31.8 GHz, MMIC wafer probers, optical comm-terminal test benches.",
  },
  {
    code: "5B001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Equipment for production of 5A001 components",
    description:
      "Manufacturing equipment specially designed for production of MMICs, phased-array elements, or optical-comm terminals controlled by 5A001.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5B001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Test equipment for 5A001 hardware",
    description:
      "Test/inspection equipment specially designed for evaluating 5A001-controlled hardware — vector network analyzers above defined frequencies, comm-link emulators, OISL beam-pointing test rigs.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.D.1 — TELECOMMUNICATIONS — Software
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5D001",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for 5A001 / 5B001 telecom equipment",
    description:
      "Software specially designed for the development, production, or use of telecommunications equipment controlled by 5A001 or 5B001.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — includes signal-processing firmware, modulation libraries, OISL pointing-control software.",
  },
  {
    code: "5D001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for development/production of 5A001 equipment",
    description:
      "Software specially designed for the development or production of 5A001-controlled telecom hardware (incl. design-tool flows for MMICs, phased-array beam-forming algorithms).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5D001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for use of 5A001 equipment",
    description:
      "Software specially designed for the use of 5A001-controlled equipment — operating waveforms, mission software for comm-sat payload control, OISL link-acquisition firmware.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5D001.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for telecom monitoring / interception",
    description:
      "Software for monitoring + analysis of intercepted telecom signals. Cross-cuts cyber-surveillance scope (Art. 5).",
    controlReasons: ["NS", "HR"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5D001.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for IP-network monitoring",
    description:
      "Software for IP-network monitoring + analysis, including deep-packet-inspection capabilities above defined thresholds.",
    controlReasons: ["NS", "HR"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes: "Captures DPI tooling — HR flag from cyber-surveillance regime.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.E.1 — TELECOMMUNICATIONS — Technology
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5E001",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for 5A001 / 5B001 / 5D001",
    description:
      "Technology (per the General Technology Note) required for the development, production, or use of telecom equipment / software controlled by 5A001, 5B001, or 5D001.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — deemed-export tripwire for telecom know-how transferred to foreign nationals / non-EU recipients.",
  },
  {
    code: "5E001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Development/production technology for 5A001",
    description:
      "Technology required for development or production of 5A001 telecom hardware. Captures design notes, manufacturing process know-how, calibration procedures.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5E001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Use technology for 5A001",
    description:
      "Technology required for the use of 5A001 telecom hardware — operational procedures, integration know-how, link-budget tooling notes.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5E001.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for telecom interception / monitoring",
    description:
      "Technology required for the development or use of interception / monitoring equipment controlled by 5A001.b.5 or 5D001.c/d. HR-flagged.",
    controlReasons: ["NS", "HR"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.A.2 — INFORMATION SECURITY — Hardware (cryptography)
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5A002",
    jurisdiction: "EU_ANNEX_I",
    title: "Information security systems, equipment, components — header",
    description:
      "Header entry for the information-security (cryptographic) hardware family. Sub-entries cover symmetric crypto, asymmetric crypto, key-management modules, HSMs, quantum-key-distribution, and cryptanalytic items.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "EI (Encryption Items) — EU shorthand for the Wassenaar Cat-5-Part-2 reason. Subject to Note 3 (Cryptography Note) carve-out for mass-market crypto.",
  },
  {
    code: "5A002.a",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Crypto items (symmetric > 56-bit, asymmetric ≥ 512-bit factorisation / ≥ 112-bit ECC)",
    description:
      "Items employing 'cryptography for data confidentiality' using symmetric algorithms with key length > 56 bits OR asymmetric algorithms based on factorisation ≥ 512 bits, discrete log ≥ 512 bits, or elliptic curves ≥ 112 bits.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Space-critical: every TT&C link encryption module, telemetry crypto unit, key-loader on a satellite payload sits here. Parametric thresholds (symmetric key length, asymmetric bit-strength) tracked in cross-walk.",
  },
  {
    code: "5A002.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Items designed/modified for cryptanalytic functions",
    description:
      "Items specially designed or modified to perform cryptanalytic functions — analysing cryptographic mechanisms to derive confidential variables or sensitive data (incl. recovering keys).",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A002.c",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Items designed for non-cryptographic security functions of IT systems",
    description:
      "Items designed/modified to use 'cryptography' to perform non-cryptographic security functions (e.g. authentication, digital signature, integrity), where used to support controlled functions.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A002.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Communication cable systems for intrusion detection",
    description:
      "Specially-designed cable systems for detection of clandestine intrusion or other physical tampering. Captures tamper-evident fibre and shielded comm links for high-assurance environments.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A002.e",
    jurisdiction: "EU_ANNEX_I",
    title: "Items designed to reduce TEMPEST emanations",
    description:
      "Items specially designed/modified to reduce compromising emanations beyond what is needed for health, safety, or electromagnetic-interference standards (TEMPEST — protection against side-channel emissions).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A002.f",
    jurisdiction: "EU_ANNEX_I",
    title: "Quantum cryptography items",
    description:
      "Items designed/modified for quantum cryptography (QKD) — incl. quantum-state preparation, detection, and key-distribution modules above defined thresholds.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Emerging space relevance — China / EU QKD satellite demonstrators (Micius, Eagle-1) explicitly fall here.",
  },
  {
    code: "5A002.g",
    jurisdiction: "EU_ANNEX_I",
    title: "Items for cryptographic activation",
    description:
      "Items employing or performing 'cryptographic activation' — converting an item from a lower-functionality state to a controlled-functionality state via a cryptographic key.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.A.3 — Cryptanalytic items (separated from 5A002.b for ECCN clarity)
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5A003",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Non-cryptographic information-security systems / equipment (data theft prevention)",
    description:
      "Non-cryptographic info-security items — communications cable systems designed for intrusion detection, devices using 'cryptanalytic functions' designed to defeat security mechanisms. Sister entry to 5A002.b for items where the cryptanalytic function is the primary control driver.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.A.4 — Cryptanalytic + key-management items
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5A004",
    jurisdiction: "EU_ANNEX_I",
    title: "Items for defeating, weakening, or bypassing info-security",
    description:
      "Items specially designed or modified to perform cryptanalytic functions OR designed/modified for defeating, weakening, or bypassing information security — incl. key-recovery tools, side-channel-attack hardware.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Highly sensitive — strong-presumption-of-denial gate in license-determination for non-EU destinations.",
  },
  {
    code: "5A004.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Hardware for IT-system intrusion / IP-network surveillance",
    description:
      "Hardware items specially designed for intrusion into computer systems or IP-network surveillance, incl. equipment for monitoring and exploiting IT-system vulnerabilities.",
    controlReasons: ["NS", "HR"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.B.2 — Test, Inspection, Production equipment for crypto
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5B002",
    jurisdiction: "EU_ANNEX_I",
    title: "Test/inspection equipment for 5A002 crypto",
    description:
      "Test, inspection, and production equipment specially designed for the development or production of 5A002-controlled crypto hardware. Includes Common-Criteria evaluation rigs, HSM certification benches.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5B002.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Production equipment for 5A002 crypto modules",
    description:
      "Manufacturing equipment specially designed for production of 5A002-controlled crypto items (HSMs, smartcards, satellite crypto modules).",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.D.2 — Software for crypto
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5D002",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for 5A002 / 5B002 crypto",
    description:
      "Software specially designed for the development, production, or use of 5A002 / 5B002 crypto hardware — incl. crypto libraries, key-management software, HSM firmware.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5D002.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for development/production of 5A002 crypto",
    description:
      "Software specially designed for development or production of 5A002-controlled crypto items — crypto-library source, design-tool flows, FIPS-140 / Common-Criteria evaluation harnesses.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5D002.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for use of 5A002 crypto (incl. cryptographic activation)",
    description:
      "Software for the use of 5A002 crypto items, including software providing or performing cryptographic activation per 5A002.g.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5D002.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Standalone crypto software (not embodied in hardware)",
    description:
      "Standalone cryptographic software providing equivalent functionality to 5A002 hardware — incl. software crypto libraries (OpenSSL-class, satellite-payload crypto stacks).",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Most-controversial sub-entry — open-source crypto can be exempt under 5D003 / Note 4. Operators must walk the Cryptography Note evaluation before claiming exemption.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.D.3 — Open-source / mass-market crypto exemption framework
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5D003",
    jurisdiction: "EU_ANNEX_I",
    title: "Open-source / publicly-available crypto software — exemption frame",
    description:
      "Framework entry for crypto software that is in the public domain OR exempt under the Cryptography Note (Note 3 to Cat. 5 Part 2). Operators document the exemption claim here; classification of the underlying software remains 5D002.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Exemption-by-Note, not a separate ECCN. The control text references Note 3 (Cryptography Note) + Note 4 (publicly-available source). Caelex treats 5D003 as a classification slot for the exemption evidence package.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.E.2 — Technology for crypto
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5E002",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for 5A002 / 5B002 / 5D002 crypto",
    description:
      "Technology (per the General Technology Note) required for the development, production, or use of crypto items controlled by 5A002, 5B002, or 5D002.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Deemed-export tripwire for crypto know-how — bound by Art. 11 EU 2021/821 intra-EU transfer rules for the most-sensitive sub-set.",
  },
  {
    code: "5E002.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Development/production technology for 5A002 crypto",
    description:
      "Technology required for development or production of 5A002-controlled crypto items — cryptographic algorithm specifications, side-channel-attack countermeasure know-how, HSM design notes.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5E002.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Use technology for 5A002 crypto",
    description:
      "Technology required for the use of 5A002 crypto — integration manuals, key-management procedures, satellite-payload crypto-operations manuals.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
];

/**
 * Lookup a Cat-5 entry by code. Use this in tests + dashboards; the
 * barrel `EU_ANNEX_I_ENTRIES` in `eu-annex-i.ts` is intentionally NOT
 * concatenated with this list — operators querying "all Cat-5 entries"
 * use this file's export directly, and the main file keeps its
 * spacecraft-focused subset.
 */
export function findEuAnnexICat5Entry(
  code: string,
): ClassificationEntry | undefined {
  return EU_ANNEX_I_CAT5_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all Cat-5 entries for a given cross-reference topic slug.
 */
export function findEuAnnexICat5EntriesByTopic(
  slug: string,
): ClassificationEntry[] {
  return EU_ANNEX_I_CAT5_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}
