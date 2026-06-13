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
 *   - Comm-sat / ground-station radio links are captured by the
 *     5A001.b advanced-radio parent (incl. spread-spectrum / anti-jam at
 *     5A001.b.3); optical inter-satellite links are the EU-autonomous
 *     AM-005 entry in eu-annex-i.ts.
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
 * Parametric thresholds for the space-relevant sub-entries (5A001.b
 * high-throughput inter-sat-link bandwidth, 5A001.b.3 spread-spectrum /
 * anti-jam, 5A002.a crypto modules, 5A002.c QKD) live in
 * `src/lib/comply-v2/trade/classification/control-list-cross-walk.ts`
 * and carry the `// Z34-Cat5` marker.
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
    "EU Annex I Cat. 5 Part 1 (Telecommunications: 5A001/5B001/5D001/5E001) + Part 2 (Information Security: 5A002/5A003/5A004/5B002/5D002/5E002). Aerospace-relevant sub-entries enumerated; structural sub-entries included so the matcher can walk the tree. (5D003 is NOT a control entry — the Cryptography Note is a decontrol note under 5D002.)",
  excluded: [
    "Sub-entries with no plausible space-systems relevance (consumer cellular handsets, fixed POTS switching gear).",
    "Free-text technical-note carve-outs (Decontrol notes, Cryptography Note) — those are evaluated in license-determination, not in classification.",
    "Mass-market crypto under the Cryptography Note (Note 3 to Cat. 5 Part 2) — handled at the license-determination stage.",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 300,
  caelexCoverageCount: 43,
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
    title:
      "Telecom equipment with nuclear/EMP hardening or extreme-temperature operation",
    description:
      "Any type of telecommunications equipment designed to withstand transitory electronic effects or electromagnetic pulse (EMP) arising from a nuclear explosion, OR designed/rated to operate outside the −45 °C to +85 °C temperature range (radiation-hardened / extreme-temperature).",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "5A001.a = nuclear/EMP-hardened or extreme-temperature telecom — relevant for rad-hard satellite payload comms and hardened ground links.",
  },
  {
    code: "5A001.b",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Telecommunication systems/equipment and specially designed components (5A001.b parent)",
    description:
      "Parent entry for telecommunication systems, equipment and specially designed components/accessories with advanced functions, controlled via sub-items 5A001.b.1 (underwater untethered comms) through 5A001.b.6 (low-bit-rate voice coding) — incl. spread-spectrum radio (5A001.b.3) and digitally-controlled radio receivers (5A001.b.5).",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Parent — operators classify against the most-specific 5A001.b.N sub-item. Phased-array antennas above 31.8 GHz are 5A001.d, NOT 5A001.b.",
  },
  {
    code: "5A001.b.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Underwater untethered communications equipment",
    description:
      "Equipment employing underwater untethered communications using acoustic, electromagnetic (in-water), or optical (laser/LED) carriers, incl. beam-steering above defined thresholds. Predominantly naval — included for Cat-5 structural completeness.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Official 5A001.b.1 = underwater untethered comms (not inter-satellite link). High-throughput ISL bandwidth capture lives on the 5A001.b parent / EU-autonomous AM-005 in the cross-walk.",
  },
  {
    code: "5A001.b.5",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Digitally controlled radio receivers (>1000 channels, <1 ms switching)",
    description:
      "Digitally controlled radio receivers having all of: more than 1,000 channels; frequency-switching time less than 1 ms; automatic searching/scanning of part of the electromagnetic spectrum; and identification of received signals or transmitter type. Does not control civil cellular radio-communications equipment.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Official 5A001.b.5 = digitally-controlled scanning receivers — NOT mobile-telecom interception (that is 5A001.f). No HR/cyber-surveillance flag.",
  },
  {
    code: "5A001.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical fibres designed to withstand high tensile stress",
    description:
      "Optical fibres more than 500 m in length specified to withstand a proof-test tensile stress of 2×10⁹ N/m² or more.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Electronically steerable phased-array antennas above 31.8 GHz",
    description:
      "Electronically steerable phased-array antennae operating above 31.8 GHz (with stated effective-radiated-power thresholds). The structural enabler for Ka/Q/V-band HTS comm-sats and beam-steering ground terminals.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.e",
    jurisdiction: "EU_ANNEX_I",
    title: "Radio direction-finding equipment above 30 MHz",
    description:
      "Radio direction-finding equipment operating at frequencies above 30 MHz having all of: instantaneous bandwidth of 10 MHz or more; and capability to find the line of bearing to non-cooperating transmitters with a signal duration of less than 1 ms.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.f",
    jurisdiction: "EU_ANNEX_I",
    title: "Mobile telecommunications interception / jamming equipment",
    description:
      "Mobile telecommunications interception or jamming equipment, and monitoring equipment therefor, and specially designed components. Parent of 5A001.f.1 (air-interface voice/data intercept) and 5A001.f.2 (subscriber-identity / signalling intercept).",
    controlReasons: ["NS", "HR"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Cyber-surveillance item under EU 2021/821 Art. 5 — HR-flagged. Spread-spectrum / anti-jam radio is NOT here; it is 5A001.b.3.",
  },
  {
    code: "5A001.f.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Interception of air-interface voice or data (mobile telecom)",
    description:
      "Interception equipment designed for the extraction of voice or data transmitted over the air interface of mobile telecommunications networks.",
    controlReasons: ["NS", "HR"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Cyber-surveillance item (EU 2021/821 Art. 5) — HR-flagged. The spread-spectrum / anti-jam predicate (isAntiJam) is tracked on EU:5A001.b.3 in the cross-walk, not here.",
  },
  {
    code: "5A001.f.2",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Interception of subscriber identifiers / signalling (mobile telecom)",
    description:
      "Interception equipment designed for the extraction of client-device or subscriber identifiers (e.g. IMSI, TIMSI or IMEI), signalling, or other metadata transmitted over the air interface of mobile telecommunications networks.",
    controlReasons: ["NS", "HR"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Cyber-surveillance item (EU 2021/821 Art. 5) — HR-flagged. IMSI-catcher-class equipment.",
  },
  {
    code: "5A001.g",
    jurisdiction: "EU_ANNEX_I",
    title: "Passive Coherent Location (PCL) systems",
    description:
      "Passive Coherent Location (PCL) systems or equipment specially designed for detecting and tracking moving objects by measuring reflections of ambient radio-frequency emissions supplied by non-radar transmitters (e.g. broadcast / mobile-network signals).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "5A001.h",
    jurisdiction: "EU_ANNEX_I",
    title: "Counter-IED radio-frequency transmitting equipment",
    description:
      "Radio-frequency transmitting equipment designed or modified to prematurely activate or prevent the initiation of improvised explosive devices (IEDs), and related equipment for coordinating co-channel friendly communications.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Official 5A001.h = counter-IED RF equipment — NOT optical free-space comms. Optical inter-satellite-link terminals (Mynaric Condor, Tesat SCOT80, CACI) are the EU-autonomous AM-005 entry in eu-annex-i.ts.",
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
    title: "Cryptographic activation tokens",
    description:
      "Items designed or modified to enable, by means of 'cryptographic activation' (e.g. a licence key), an item to achieve or exceed the controlled performance levels for functionality specified by 5A002.a that are not otherwise enabled.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Official 5A002.b = cryptographic-activation tokens (not cryptanalytic — cryptanalytic functions are 5A004).",
  },
  {
    code: "5A002.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Quantum cryptography (QKD) items",
    description:
      "Non-cryptographic 'information security' systems and equipment designed or modified to use 'quantum cryptography' (also known as quantum key distribution, QKD).",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Official 5A002.c = quantum cryptography (QKD). Eagle-1 (ESA/SES) and follow-on EU IRIS² QKD payloads fall here. Relocated from the phantom 5A002.f.",
  },
  {
    code: "5A002.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Cryptography for ultra-wideband channelising / scrambling codes",
    description:
      "Items designed or modified to use 'cryptography' to generate the channelising codes, scrambling codes or network identification codes, for systems using ultra-wideband modulation techniques.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Official 5A002.d = UWB channelising/scrambling-code cryptography (a cryptographic item → EI). Cable-intrusion detection is NOT here — it is 5A003.a.",
  },
  {
    code: "5A002.e",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Cryptography for spread-spectrum spreading / frequency-hopping codes",
    description:
      "Items designed or modified to use 'cryptography' to generate the spreading code for 'spread spectrum' systems, or the hopping code for 'frequency agility' systems.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Official 5A002.e = cryptographic generation of spreading/hopping codes (a cryptographic item → EI); 5A002 ends here (no .f/.g). TEMPEST emanation reduction is NOT here — it is 5A003.b.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.A.3 — Non-cryptographic information security (cable + TEMPEST)
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5A003",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Non-cryptographic information security — cable intrusion detection (.a) + TEMPEST (.b)",
    description:
      "Non-cryptographic 'information security' systems: (a) communications cable systems designed or modified using mechanical, electrical or electronic means to detect surreptitious intrusion; and (b) equipment specially designed or modified to reduce the compromising emanations of information-bearing signals beyond what is necessary for health, safety or electromagnetic-interference standards (TEMPEST).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Non-cryptographic → no EI reason. The cable-intrusion (.a) and TEMPEST (.b) content was previously mislabelled onto 5A002.d/.e.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5.A.4 — Cryptanalytic items
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "5A004",
    jurisdiction: "EU_ANNEX_I",
    title: "Items designed/modified to perform cryptanalytic functions",
    description:
      "Items designed or modified to perform 'cryptanalytic functions' — defeating cryptographic mechanisms in order to derive confidential variables or sensitive data, including clear text, passwords or cryptographic keys.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Official 5A004 = cryptanalytic functions. Highly sensitive — strong-presumption-of-denial gate in license-determination for non-EU destinations.",
  },
  {
    code: "5A004.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Cryptanalytic-function hardware",
    description:
      "Hardware items designed or modified to perform 'cryptanalytic functions' — e.g. key-recovery engines and side-channel / fault-injection attack rigs targeting cryptographic mechanisms.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Official 5A004.a = cryptanalytic-function hardware (Encryption Items → EI), NOT IT-system intrusion / IP-network surveillance hardware.",
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
      "Most-controversial sub-entry — open-source crypto can be exempt under the Cryptography Note (Note 3 to Cat. 5 Part 2) / Note 4 (publicly-available source). Operators must walk that Note evaluation before claiming exemption. (There is no separate 5D003 control entry — the exemption lives in the Notes under 5D002.)",
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
