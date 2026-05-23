import "server-only";
import type { VsdBuilderInput, VsdDocument, VsdSection } from "./vsd-shared";
import {
  humanViolationType,
  formatVsdAddress,
  formatVsdDate,
  todayIso,
  formatItemLine,
  formatCounterpartyLine,
} from "./vsd-shared";

/**
 * Caelex Trade — Z6d: DDTC Voluntary Disclosure template.
 *
 * Builds the document model for a voluntary disclosure to the U.S.
 * Directorate of Defense Trade Controls under 22 CFR § 127.12 of the
 * International Traffic in Arms Regulations (ITAR). Pure data-model —
 * rendering is in vsd-pdf-renderer.ts.
 *
 * Format references:
 *  - 22 CFR § 127.12 — Voluntary disclosures
 *  - 22 CFR § 127.12(b) — Required content (full disclosure of
 *    circumstances + remediation)
 *  - 22 CFR § 127.12(c)(2) — 60-day full disclosure deadline after
 *    initial notification
 *  - DDTC Compliance Program Guidelines (May 2022)
 *
 * Two-step filing per § 127.12(c):
 *   1. Initial Notification — immediately after discovery
 *   2. Full Disclosure — within 60 calendar days, extendable on request
 *
 * Filing address (per current DDTC guidance):
 *  Office of Defense Trade Controls Compliance
 *  Directorate of Defense Trade Controls
 *  U.S. Department of State, SA-1, 12th Floor
 *  2401 E Street, NW
 *  Washington, DC 20522
 */

const DDTC_DOCUMENT_CODE = "DDTC — Voluntary Disclosure (22 CFR § 127.12)";

export function buildVsdDdtcDocument(input: VsdBuilderInput): VsdDocument {
  const { vsd, counterparty, operation, item, filerOrgName } = input;
  const preparedOn = todayIso();

  return {
    title: "DDTC Voluntary Disclosure",
    documentCode: DDTC_DOCUMENT_CODE,
    jurisdiction: "ddtc",
    authority: vsd.authority,
    preparedOn,
    filerOrgName,
    sections: [
      buildHeaderSection(vsd.id, preparedOn, vsd.filingReference),
      buildAddresseeSection(),
      buildInitialNotificationSection(vsd),
      buildRegistrantSection(filerOrgName),
      buildItarPredicateSection(item),
      buildCircumstancesSection(vsd, counterparty, operation, item),
      buildClassificationLicenseSection(item, operation),
      buildPartiesSection(counterparty, operation),
      buildCorrectiveMeasuresSection(vsd),
      buildCertificationSection(filerOrgName),
    ],
  };
}

// ─── Section builders ───────────────────────────────────────────────

function buildHeaderSection(
  vsdId: string,
  preparedOn: string,
  filingReference: string | null,
): VsdSection {
  return {
    id: "header",
    ordinal: "",
    title: "Submission cover page",
    paragraph:
      "This Voluntary Disclosure is submitted to the U.S. Directorate " +
      "of Defense Trade Controls under 22 CFR § 127.12. The Registrant " +
      "submits this disclosure voluntarily, in good faith, and prior to " +
      "any inquiry by DDTC or another U.S. government agency, and " +
      "intends thereby to qualify for the mitigating treatment described " +
      "in 22 CFR § 127.12(b)(2).",
    fields: [
      {
        label: "Internal reference",
        value: vsdId,
        required: true,
      },
      {
        label: "DDTC case / filing reference",
        value: filingReference ?? "[To be assigned by DDTC upon receipt]",
        required: false,
      },
      {
        label: "Prepared on",
        value: preparedOn,
        required: true,
      },
      {
        label: "Filing type",
        value:
          "Initial Notification (§ 127.12(c)(1)) + Full Disclosure " +
          "(§ 127.12(c)(2), due within 60 days)",
        required: true,
      },
    ],
  };
}

function buildAddresseeSection(): VsdSection {
  return {
    id: "addressee",
    ordinal: "I.",
    title: "Addressee",
    paragraph:
      "Filed with the Office of Defense Trade Controls Compliance at the " +
      "U.S. Department of State, Directorate of Defense Trade Controls.",
    fields: [
      {
        label: "Authority",
        value:
          "U.S. Directorate of Defense Trade Controls (DDTC), Office of " +
          "Defense Trade Controls Compliance",
        required: true,
      },
      {
        label: "Mailing address",
        value:
          "Office of Defense Trade Controls Compliance, Directorate of " +
          "Defense Trade Controls, U.S. Department of State, SA-1, 12th " +
          "Floor, 2401 E Street NW, Washington, DC 20522",
        required: true,
      },
      {
        label: "Electronic submission",
        value:
          "DTCC-Disclosures@state.gov (per current DDTC guidance — " +
          "confirm against pmddtc.state.gov at the time of filing)",
        required: false,
      },
    ],
  };
}

function buildInitialNotificationSection(
  vsd: VsdBuilderInput["vsd"],
): VsdSection {
  return {
    id: "initial_notification",
    ordinal: "II.",
    title: "Initial notification — § 127.12(c)(1)",
    paragraph:
      "Per 22 CFR § 127.12(c)(1), the Registrant hereby provides an " +
      "initial written notification of a potential violation of the " +
      "International Traffic in Arms Regulations immediately upon " +
      "discovery. The Registrant will follow this initial notification " +
      "with a Full Disclosure within 60 calendar days, or such longer " +
      "period as DDTC may permit on request.",
    fields: [
      {
        label: "Short title",
        value: vsd.title,
        required: true,
      },
      {
        label: "Suspected ITAR violation type",
        value: humanViolationType(vsd.violationType),
        required: true,
      },
      {
        label: "Date of discovery",
        value: formatVsdDate(vsd.discoveredAt),
        required: true,
      },
      {
        label: "Date(s) of underlying conduct",
        value: formatVsdDate(vsd.occurredAt),
        required: true,
      },
      {
        label: "Brief summary of the conduct",
        value: vsd.description.trim().slice(0, 600),
        required: true,
      },
    ],
  };
}

function buildRegistrantSection(filerOrgName: string): VsdSection {
  return {
    id: "registrant",
    ordinal: "III.",
    title: "Registrant",
    paragraph:
      "Identification of the DDTC Registrant submitting this voluntary " +
      "disclosure. The Registrant certifies that this disclosure is " +
      "submitted voluntarily prior to, and independent of, any inquiry " +
      "by DDTC or another U.S. government agency.",
    fields: [
      {
        label: "Registrant (legal entity)",
        value: filerOrgName,
        required: true,
      },
      {
        label: "DDTC Registration Code (M-code)",
        value: null,
        required: true,
      },
      {
        label: "Mailing address",
        value: null,
        required: true,
      },
      {
        label: "Empowered Official (name)",
        value: null,
        required: true,
      },
      {
        label: "Empowered Official (title)",
        value: null,
        required: true,
      },
      {
        label: "Empowered Official (telephone)",
        value: null,
        required: true,
      },
      {
        label: "Empowered Official (e-mail)",
        value: null,
        required: true,
      },
      {
        label: "Outside counsel (name + firm)",
        value: null,
        required: false,
      },
    ],
  };
}

function buildItarPredicateSection(item: VsdBuilderInput["item"]): VsdSection {
  return {
    id: "itar_predicate",
    ordinal: "IV.",
    title: "ITAR predicate — USML category",
    paragraph:
      "Identification of the U.S. Munitions List (USML) category that " +
      "controls the defense article, defense service, or technical data " +
      "implicated in the conduct, per 22 CFR § 121.1. Where the article " +
      "was incorrectly assumed to fall outside the USML, identify the " +
      "category that should have applied and the analytical basis for " +
      "that determination.",
    fields: [
      {
        label: "Defense article / service / technical data",
        value: item?.name ?? null,
        required: true,
      },
      {
        label: "USML category at issue",
        value: item?.usmlCategory ?? null,
        required: true,
      },
      {
        label: "Commodity Jurisdiction (CJ) determination on file?",
        value: null,
        required: false,
      },
      {
        label: "Item identifier (internal SKU / part number)",
        value: item?.internalSku ?? null,
        required: false,
      },
      {
        label: "EAR / USML dual-classification context (if any)",
        value:
          item?.eccnUS && item?.usmlCategory
            ? `Item dual-classified: USML ${item.usmlCategory} + EAR ${item.eccnUS}`
            : null,
        required: false,
      },
    ],
  };
}

function buildCircumstancesSection(
  vsd: VsdBuilderInput["vsd"],
  counterparty: VsdBuilderInput["counterparty"],
  operation: VsdBuilderInput["operation"],
  item: VsdBuilderInput["item"],
): VsdSection {
  const narrative = vsd.description.trim();

  return {
    id: "circumstances",
    ordinal: "V.",
    title: "Full disclosure of circumstances — § 127.12(b)",
    paragraph:
      "Per 22 CFR § 127.12(b), the Registrant provides a thorough " +
      "review and complete description of the circumstances surrounding " +
      "the apparent violation, including the means and methods by which " +
      "the apparent violation was discovered, a description of each " +
      "transaction, the licensing history (or absence thereof), the " +
      "estimated value, the parties involved, and the dates.",
    fields: [
      {
        label: "Narrative of circumstances",
        value:
          narrative.length > 0
            ? narrative
            : "[To be completed: thorough description of the apparent " +
              "violation — circumstances, means of discovery, " +
              "transactions involved, licensing history, parties, dates.]",
        required: true,
      },
      {
        label: "Counterparty",
        value: formatCounterpartyLine(counterparty),
        required: true,
      },
      {
        label: "Operation reference (if any)",
        value: operation?.reference ?? "—",
        required: false,
      },
      {
        label: "Foreign destination",
        value: operation?.shipToCountry ?? counterparty?.countryCode ?? null,
        required: true,
      },
      {
        label: "Defense article involved",
        value: formatItemLine(item),
        required: true,
      },
      {
        label: "Estimated value of the transaction(s) (USD)",
        value: null,
        required: true,
      },
    ],
  };
}

function buildClassificationLicenseSection(
  item: VsdBuilderInput["item"],
  operation: VsdBuilderInput["operation"],
): VsdSection {
  return {
    id: "classification_license",
    ordinal: "VI.",
    title: "Licensing history and required authorizations",
    paragraph:
      "Per § 127.12(b), the Registrant identifies the export " +
      "authorization that was, or should have been, in place at the " +
      "time of the conduct (DSP-5, DSP-61, DSP-73, DSP-85, agreement, " +
      "license exemption under 22 CFR Part 126, or other), the actual " +
      "authorization relied upon (if any), and the differential.",
    fields: [
      {
        label: "Required authorization",
        value: null,
        required: true,
      },
      {
        label: "Authorization actually used at the time of the conduct",
        value: null,
        required: true,
      },
      {
        label: "USML category",
        value: item?.usmlCategory ?? null,
        required: true,
      },
      {
        label: "Operation context (if any)",
        value: operation?.description ?? "—",
        required: false,
      },
      {
        label: "License-exemption relied upon (Part 126, if any)",
        value: null,
        required: false,
      },
    ],
    bullets: [
      "Identify whether the conduct involved technical data, defense " +
        "services (training, integration, maintenance), brokering, or " +
        "physical hardware.",
      "Identify whether the conduct involved a foreign person on U.S. " +
        "soil (deemed export under § 120.50).",
      "Identify any related prior authorizations, denied applications, " +
        "or pending commodity-jurisdiction requests.",
    ],
  };
}

function buildPartiesSection(
  counterparty: VsdBuilderInput["counterparty"],
  operation: VsdBuilderInput["operation"],
): VsdSection {
  const bullets: string[] = [];
  if (counterparty) {
    bullets.push(
      `Foreign end-user / consignee: ${counterparty.legalName} ` +
        `(${counterparty.countryCode}) — ` +
        `${formatVsdAddress(counterparty.addressLines)}.`,
    );
  } else {
    bullets.push(
      "Foreign end-user / consignee: [to be completed — legal name, " +
        "address, country].",
    );
  }
  if (operation) {
    bullets.push(
      `Shipment context: ${operation.reference} — ship-to ` +
        `${operation.shipToCountry}. ${operation.description}`,
    );
  }
  bullets.push(
    "Freight forwarder and Automated Export System (AES) submission " +
      "references: [to be completed].",
  );
  bullets.push(
    "Any U.S. or foreign intermediaries with knowledge of the conduct: " +
      "[to be completed].",
  );
  bullets.push(
    "Identification of any foreign-person employees involved in a " +
      "potential deemed export (name, citizenship, role): [to be " +
      "completed].",
  );

  return {
    id: "parties",
    ordinal: "VII.",
    title: "Parties and intermediaries",
    paragraph:
      "Per § 127.12(b)(1)(iv), the Registrant identifies all parties " +
      "involved in the conduct, including foreign end-users, consignees, " +
      "freight forwarders, intermediate consignees, and any U.S. or " +
      "foreign persons with material knowledge of the apparent " +
      "violation.",
    fields: [],
    bullets,
  };
}

function buildCorrectiveMeasuresSection(
  vsd: VsdBuilderInput["vsd"],
): VsdSection {
  return {
    id: "corrective_measures",
    ordinal: "VIII.",
    title: "Corrective measures and compliance program",
    paragraph:
      "Per 22 CFR § 127.12(b)(2), the Registrant describes the " +
      "corrective measures undertaken, including the remediation of the " +
      "deficiencies that gave rise to the violation, enhancements to " +
      "the internal compliance program consistent with the DDTC " +
      "Compliance Program Guidelines (May 2022), training, audits, and " +
      "any personnel actions.",
    fields: [
      {
        label: "Root-cause analysis",
        value: null,
        required: true,
      },
      {
        label: "Compliance-program enhancements implemented",
        value: null,
        required: true,
      },
      {
        label: "Training delivered (audience + date)",
        value: null,
        required: false,
      },
      {
        label: "Personnel actions taken (if applicable)",
        value: null,
        required: false,
      },
      {
        label: "Status of the internal investigation",
        value: vsd.status,
        required: true,
      },
      {
        label: "Operator privileged notes (internal — DO NOT FILE)",
        value: vsd.notes ?? "—",
        required: false,
      },
    ],
    bullets: [
      "Voluntary nature — no inquiry pending from DDTC or another U.S. " +
        "agency at the time the disclosure was initiated, per " +
        "§ 127.12(b)(2).",
      "60-day commitment — the Registrant will provide the Full " +
        "Disclosure within 60 calendar days of this Initial Notification.",
      "Cooperation — the Registrant commits to fully cooperate with the " +
        "Office of Defense Trade Controls Compliance, including making " +
        "documents and personnel available.",
      "Reporting — the Registrant will additionally notify, where " +
        "applicable, any other U.S. government agencies with " +
        "concurrent jurisdiction (e.g. BIS, OFAC) per their own " +
        "voluntary-disclosure procedures.",
    ],
  };
}

function buildCertificationSection(filerOrgName: string): VsdSection {
  return {
    id: "certification",
    ordinal: "IX.",
    title: "Certification by Empowered Official",
    paragraph:
      "By signing below, the Empowered Official of the Registrant, " +
      "designated under 22 CFR § 120.67, certifies under the laws of " +
      "the United States that the foregoing voluntary disclosure is " +
      "true, accurate, and complete to the best of his or her " +
      "knowledge, information, and belief, and acknowledges that any " +
      "false, fictitious, or fraudulent statement is subject to " +
      "criminal sanctions under 18 U.S.C. § 1001.",
    fields: [
      {
        label: "Certified for (Registrant)",
        value: filerOrgName,
        required: true,
      },
      {
        label: "Empowered Official (name)",
        value: null,
        required: true,
      },
      {
        label: "Empowered Official (title)",
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
    ],
  };
}
