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
 * Caelex Trade — Z6c: BIS Voluntary Self-Disclosure template.
 *
 * Builds the document model for a voluntary self-disclosure to the
 * U.S. Bureau of Industry and Security under 15 CFR § 764.5 of the
 * Export Administration Regulations. Pure data-model — rendering is in
 * vsd-pdf-renderer.ts.
 *
 * Format references:
 *  - 15 CFR § 764.5 — Voluntary self-disclosure
 *  - 15 CFR § 764.5(c)(3) — Required content (full disclosure of "5 Ws")
 *  - 15 CFR § 766 Supp. No. 1 — Guidance on charging and penalty
 *    determinations (VSD as "great weight" mitigation, typically 50 %
 *    reduction of base penalty)
 *
 * Two-step filing per § 764.5(c)(1):
 *   1. Initial Notification of VSD (ASAP after discovery)
 *   2. Full Narrative Account (within 180 days of initial notification,
 *      extendable on request)
 *
 * Filing address (per current BIS Office of Export Enforcement guidance):
 *  Director, Office of Export Enforcement
 *  Bureau of Industry and Security
 *  U.S. Department of Commerce
 *  1401 Constitution Avenue, NW — Room H-4520
 *  Washington, DC 20230
 */

const BIS_DOCUMENT_CODE = "BIS — Voluntary Self-Disclosure (15 CFR § 764.5)";

export function buildVsdBisDocument(input: VsdBuilderInput): VsdDocument {
  const { vsd, counterparty, operation, item, filerOrgName } = input;
  const preparedOn = todayIso();

  return {
    title: "BIS Voluntary Self-Disclosure",
    documentCode: BIS_DOCUMENT_CODE,
    jurisdiction: "bis",
    authority: vsd.authority,
    preparedOn,
    filerOrgName,
    sections: [
      buildHeaderSection(vsd.id, preparedOn, vsd.filingReference),
      buildAddresseeSection(),
      buildInitialNotificationSection(vsd),
      buildDiscloserSection(filerOrgName),
      buildNarrativeAccountSection(vsd, item, counterparty, operation),
      buildItemsClassificationSection(item),
      buildPartiesAndDestinationsSection(counterparty, operation),
      buildSupportingDocumentsSection(),
      buildRemediationSection(vsd),
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
      "This Voluntary Self-Disclosure is submitted to the U.S. Bureau " +
      "of Industry and Security pursuant to 15 CFR § 764.5. The " +
      "Discloser submits this VSD in good faith and with the intent to " +
      "qualify for the 'great weight' mitigating treatment described in " +
      "15 CFR Part 766 Supplement No. 1 (typically resulting in a 50 % " +
      "reduction of the base penalty).",
    fields: [
      {
        label: "Internal reference",
        value: vsdId,
        required: true,
      },
      {
        label: "BIS case / filing reference",
        value: filingReference ?? "[To be assigned by BIS OEE upon receipt]",
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
          "Initial Notification of VSD (§ 764.5(c)(1)) + Full Narrative " +
          "Account (§ 764.5(c)(3))",
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
      "Filed with the Director of the Office of Export Enforcement at " +
      "the U.S. Department of Commerce, Bureau of Industry and Security.",
    fields: [
      {
        label: "Authority",
        value:
          "U.S. Bureau of Industry and Security (BIS), Office of Export Enforcement",
        required: true,
      },
      {
        label: "Mailing address",
        value:
          "Director, Office of Export Enforcement, Bureau of Industry " +
          "and Security, U.S. Department of Commerce, 1401 Constitution " +
          "Avenue NW — Room H-4520, Washington, DC 20230",
        required: true,
      },
      {
        label: "Electronic submission",
        value:
          "OEEVSD@bis.doc.gov (per current BIS Office of Export Enforcement " +
          "guidance — confirm at the time of filing)",
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
    title: "Initial notification of VSD — § 764.5(c)(1)",
    paragraph:
      "Per 15 CFR § 764.5(c)(1), the Discloser hereby provides an " +
      "initial written notification of a voluntary self-disclosure as " +
      "soon as possible after discovery of the conduct giving rise to " +
      "the disclosure. The Discloser intends to follow this initial " +
      "notification with a Full Narrative Account within 180 days, or " +
      "such longer period as BIS may permit on request.",
    fields: [
      {
        label: "Short title",
        value: vsd.title,
        required: true,
      },
      {
        label: "Suspected violation type",
        value: humanViolationType(vsd.violationType),
        required: true,
      },
      {
        label: "Date of discovery",
        value: formatVsdDate(vsd.discoveredAt),
        required: true,
      },
      {
        label: "Date of underlying conduct",
        value: formatVsdDate(vsd.occurredAt),
        required: true,
      },
      {
        label: "Brief description of the conduct",
        value: vsd.description.trim().slice(0, 600),
        required: true,
      },
    ],
  };
}

function buildDiscloserSection(filerOrgName: string): VsdSection {
  return {
    id: "discloser",
    ordinal: "III.",
    title: "Discloser",
    paragraph:
      "Identification of the U.S. person, U.S.-based entity, or " +
      "U.S.-jurisdictional exporter submitting this self-disclosure. The " +
      "Discloser certifies that this submission is made voluntarily " +
      "prior to, and independent of, any investigation initiated by BIS " +
      "or another U.S. government agency into the conduct described " +
      "herein, as required by 15 CFR § 764.5(b)(1).",
    fields: [
      {
        label: "Discloser (legal entity)",
        value: filerOrgName,
        required: true,
      },
      {
        label: "Mailing address",
        value: null,
        required: true,
      },
      {
        label: "DUNS / CAGE / EIN (if applicable)",
        value: null,
        required: false,
      },
      {
        label: "Point of contact (name)",
        value: null,
        required: true,
      },
      {
        label: "Point of contact (title)",
        value: null,
        required: true,
      },
      {
        label: "Point of contact (telephone)",
        value: null,
        required: true,
      },
      {
        label: "Point of contact (e-mail)",
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

function buildNarrativeAccountSection(
  vsd: VsdBuilderInput["vsd"],
  item: VsdBuilderInput["item"],
  counterparty: VsdBuilderInput["counterparty"],
  operation: VsdBuilderInput["operation"],
): VsdSection {
  const narrative = vsd.description.trim();

  return {
    id: "narrative_account",
    ordinal: "IV.",
    title: "Full narrative account — § 764.5(c)(3)",
    paragraph:
      "Per 15 CFR § 764.5(c)(3), the Discloser provides a full narrative " +
      "account of the suspected violation, including the kind of " +
      "violation involved (for example, an export without the required " +
      "license, an act prohibited by § 736.2(b)), an explanation of when " +
      "and how the violation occurred, the complete identities and " +
      "addresses of all individuals and organisations, both foreign and " +
      "domestic, involved in the activities giving rise to the suspected " +
      "violation, and the foreign destination of any item involved.",
    fields: [
      {
        label: "Narrative",
        value:
          narrative.length > 0
            ? narrative
            : "[To be completed: full narrative covering the five Ws — " +
              "who, what, when, where, and why — for each suspected " +
              "violation.]",
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
        label: "Item / commodity / technology",
        value: formatItemLine(item),
        required: true,
      },
    ],
  };
}

function buildItemsClassificationSection(
  item: VsdBuilderInput["item"],
): VsdSection {
  return {
    id: "items_classification",
    ordinal: "V.",
    title: "Items, ECCN classification, and license requirement",
    paragraph:
      "Per 15 CFR § 764.5(c)(3)(ii), the Discloser identifies each item " +
      "involved, the correct Export Control Classification Number (ECCN) " +
      "or, where unclassified, the basis for the EAR99 designation, and " +
      "the license requirement (or absence thereof) that applies to each " +
      "item / destination / end-user combination.",
    fields: [
      {
        label: "Item name",
        value: item?.name ?? null,
        required: true,
      },
      {
        label: "Internal SKU / part number",
        value: item?.internalSku ?? null,
        required: false,
      },
      {
        label: "ECCN / EAR99",
        value: item?.eccnUS ?? null,
        required: true,
      },
      {
        label: "USML category (if dual-classified)",
        value: item?.usmlCategory ?? null,
        required: false,
      },
      {
        label: "EU Annex I dual-use entry (for context)",
        value: item?.eccnEU ?? null,
        required: false,
      },
      {
        label:
          "License requirement at the time of the conduct (license " +
          "exception relied upon, if any)",
        value: null,
        required: true,
      },
      {
        label: "Estimated dollar value of the item(s) exported",
        value: null,
        required: true,
      },
    ],
    bullets: [
      "Quantity of items exported and dates of each export.",
      "Manner in which the violation was discovered (internal audit, " +
        "voluntary disclosure by counterparty, third-party report, etc.).",
      "Any related licenses or license applications that were pending " +
        "or had been previously denied.",
    ],
  };
}

function buildPartiesAndDestinationsSection(
  counterparty: VsdBuilderInput["counterparty"],
  operation: VsdBuilderInput["operation"],
): VsdSection {
  const bullets: string[] = [];
  if (counterparty) {
    bullets.push(
      `Foreign consignee / end-user: ${counterparty.legalName} ` +
        `(${counterparty.countryCode}) — ` +
        `${formatVsdAddress(counterparty.addressLines)}.`,
    );
  } else {
    bullets.push(
      "Foreign consignee / end-user: [to be completed — legal name, " +
        "address, country].",
    );
  }
  if (operation) {
    bullets.push(
      `Operation / shipment context: ${operation.reference} — ` +
        `ship-to ${operation.shipToCountry}. ${operation.description}`,
    );
  }
  bullets.push(
    "Freight forwarder / carrier and Automated Export System (AES) " +
      "submission references for each shipment: [to be completed].",
  );
  bullets.push(
    "Identification of any U.S. or foreign intermediaries that may have " +
      "knowledge of the conduct: [to be completed].",
  );

  return {
    id: "parties_destinations",
    ordinal: "VI.",
    title: "Parties, intermediaries, and destinations",
    paragraph:
      "Per § 764.5(c)(3)(iv), the Discloser identifies the complete " +
      "names and addresses of all individuals and organisations, both " +
      "foreign and domestic, involved in the activities giving rise to " +
      "the suspected violation, and the foreign destination(s).",
    fields: [],
    bullets,
  };
}

function buildSupportingDocumentsSection(): VsdSection {
  return {
    id: "supporting_documents",
    ordinal: "VII.",
    title: "Supporting documents — § 764.5(c)(5)",
    paragraph:
      "Per 15 CFR § 764.5(c)(5), copies of all supporting documents " +
      "(including underlying contracts, shipping documents, end-use " +
      "statements, internal e-mails, and compliance correspondence) " +
      "should be attached or made available to the Office of Export " +
      "Enforcement upon request.",
    fields: [],
    bullets: [
      "Exhibit A — Purchase order(s) and underlying contracts.",
      "Exhibit B — Shipping documents (bills of lading, AES filings, " +
        "commercial invoices).",
      "Exhibit C — Pre-shipment classification records and license " +
        "determinations (or absence thereof).",
      "Exhibit D — End-user statements and end-use certificates received " +
        "from the foreign counterparty.",
      "Exhibit E — Internal investigation memorandum and root-cause " +
        "analysis (privileged).",
      "Exhibit F — Updated compliance policy, training records, and " +
        "remediation evidence.",
    ],
  };
}

function buildRemediationSection(vsd: VsdBuilderInput["vsd"]): VsdSection {
  return {
    id: "remediation",
    ordinal: "VIII.",
    title: "Remedial actions taken",
    paragraph:
      "Per 15 CFR Part 766 Supplement No. 1 Factor F (effective response " +
      "after the violation), the Discloser describes the remedial " +
      "actions undertaken: root-cause analysis, internal-control " +
      "enhancements, compliance training, personnel actions, and the " +
      "current status of the underlying internal investigation.",
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
        label: "Personnel actions taken (if applicable)",
        value: null,
        required: false,
      },
      {
        label: "Status of the underlying investigation",
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
      "Self-initiated discovery — no inquiry pending from BIS or " +
        "another U.S. government agency at the time the disclosure was " +
        "initiated, as required by 15 CFR § 764.5(b)(1).",
      "Full disclosure — the Discloser commits to provide the Full " +
        "Narrative Account within 180 days of this Initial Notification.",
      "Cooperation — the Discloser commits to fully cooperate with the " +
        "Office of Export Enforcement, including making documents and " +
        "personnel available.",
    ],
  };
}

function buildCertificationSection(filerOrgName: string): VsdSection {
  return {
    id: "certification",
    ordinal: "IX.",
    title: "Certification — § 764.5(c)(7)",
    paragraph:
      "Per 15 CFR § 764.5(c)(7), the Discloser, by signing below, " +
      "certifies that the foregoing disclosure is true, accurate, and " +
      "complete to the best of his or her knowledge, information, and " +
      "belief, and acknowledges that any false, fictitious, or " +
      "fraudulent statement is subject to criminal sanctions under 18 " +
      "U.S.C. § 1001.",
    fields: [
      {
        label: "Certified for (legal entity)",
        value: filerOrgName,
        required: true,
      },
      {
        label: "Name of certifying officer",
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
    ],
  };
}
