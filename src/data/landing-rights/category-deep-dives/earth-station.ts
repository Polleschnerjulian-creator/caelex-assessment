import type { CategoryDeepDive } from "../types";

export const EARTH_STATION_DEEP_DIVES: CategoryDeepDive[] = [
  {
    jurisdiction: "DE",
    category: "earth_station",
    title: "CEPT ECC Decisions + national gateway/ESIM licensing",
    summary:
      "Earth station licensing in Germany operates at two layers: CEPT harmonisation via ECC Decisions (13)01, (15)04 and (17)04 provides blanket authorisation for maritime and aeronautical ESIMs in Ku/Ka bands across CEPT states; beyond that, gateways and land ESIMs require individual BNetzA authorisation.",
    key_provisions: [
      {
        title: "CEPT ECC Decision (13)01 — Maritime ESIMs",
        body: "Provides harmonised conditions for maritime ESIMs in Ku/Ka bands across CEPT member states. Operators rely on this for cruise-ship, cargo and offshore platform connectivity without per-country authorisations.",
        citation: "CEPT ECC Decision (13)01",
      },
      {
        title: "CEPT ECC Decisions (15)04 and (17)04 — Aeronautical ESIMs",
        body: "Harmonise aeronautical ESIM operations in Ku and Ka bands respectively. Together with ITU Resolutions 156, 158 and 169 (Rev.WRC-23), they structure the global regulatory framework for in-flight connectivity.",
        citation: "ECC Decisions (15)04 and (17)04",
      },
      {
        title: "BNetzA gateway authorisation",
        body: "Gateways and land ESIMs fall outside CEPT harmonisation and require individual BNetzA apparatus licences. Typical processing 3–6 months; spectrum coordination per national plan.",
        citation: "TKG § 55",
      },
    ],
    practical_notes:
      "ITU Resolutions 156, 158, 169 and 25 (Rev.WRC-23) explicitly preserve 'the sovereign rights of all administrations to authorise earth stations operations in their countries' — a deliberate reservation that keeps national gatekeeping intact even where CEPT harmonisation applies.",
    last_verified: "2026-04-17",
  },
];
