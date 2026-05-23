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
 * Caelex Trade — Z6b: OFAC Voluntary Self-Disclosure template.
 *
 * Builds the structured document model for a disclosure to the U.S.
 * Office of Foreign Assets Control under 31 CFR § 501.806 and the
 * OFAC Economic Sanctions Enforcement Guidelines (Appendix A to 31
 * CFR Part 501). Pure data-model — rendering is in vsd-pdf-renderer.ts.
 *
 * Format references:
 *  - 31 CFR § 501.806 — Procedures for unblocking funds / VSD format
 *  - 31 CFR Part 501 App. A § II.A — VSD definition & required content
 *  - 31 CFR Part 501 App. A § III.B.1 — VSD as a substantial mitigating factor
 *
 * Mailing address (per current OFAC guidance):
 *  Office of Foreign Assets Control
 *  U.S. Department of the Treasury
 *  1500 Pennsylvania Avenue, NW — Treasury Annex
 *  Washington, DC 20220
 */

const OFAC_DOCUMENT_CODE =
  "OFAC — Voluntary Self-Disclosure (31 CFR § 501.806)";

export function buildVsdOfacDocument(input: VsdBuilderInput): VsdDocument {
  const { vsd, counterparty, operation, item, filerOrgName } = input;
  const preparedOn = todayIso();

  return {
    title: "OFAC Voluntary Self-Disclosure",
    documentCode: OFAC_DOCUMENT_CODE,
    jurisdiction: "ofac",
    authority: vsd.authority,
    preparedOn,
    filerOrgName,
    sections: [
      buildHeaderSection(vsd.id, preparedOn, vsd.filingReference),
      buildAddresseeSection(),
      buildDiscloserSection(filerOrgName),
      buildSubjectMatterSection(vsd, item, counterparty),
      buildDescriptionSection(vsd),
      buildTransactionsSection(vsd, counterparty, operation, item),
      buildRemedialMeasuresSection(vsd),
      buildCertificationSection(filerOrgName),
      buildClosingSection(),
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
      "This document constitutes a voluntary self-disclosure submitted " +
      "to the U.S. Office of Foreign Assets Control under 31 CFR § " +
      "501.806 and the OFAC Economic Sanctions Enforcement Guidelines " +
      "(Appendix A to 31 CFR Part 501). It is provided in good faith and " +
      "with the intent to qualify for the substantial mitigation OFAC " +
      "extends to qualifying voluntary self-disclosures under Section " +
      "III.B.1 of the Enforcement Guidelines.",
    fields: [
      {
        label: "Internal reference",
        value: vsdId,
        required: true,
      },
      {
        label: "OFAC case / filing reference",
        value: filingReference ?? "[To be assigned by OFAC upon receipt]",
        required: false,
      },
      {
        label: "Prepared on",
        value: preparedOn,
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
      "Filed with the U.S. Department of the Treasury, Office of Foreign " +
      "Assets Control, pursuant to 31 CFR Part 501.",
    fields: [
      {
        label: "Authority",
        value: "U.S. Office of Foreign Assets Control (OFAC)",
        required: true,
      },
      {
        label: "Mailing address",
        value:
          "Office of Foreign Assets Control, U.S. Department of the " +
          "Treasury, 1500 Pennsylvania Avenue NW — Treasury Annex, " +
          "Washington, DC 20220",
        required: true,
      },
      {
        label: "Electronic submission",
        value:
          "OFAC_Disclosures@treasury.gov (per current OFAC guidance — " +
          "confirm against the published OFAC FAQs at the time of filing)",
        required: false,
      },
    ],
  };
}

function buildDiscloserSection(filerOrgName: string): VsdSection {
  return {
    id: "discloser",
    ordinal: "II.",
    title: "Discloser",
    paragraph:
      "Identification of the U.S. person or U.S.-jurisdictional entity " +
      "submitting this self-disclosure. The Discloser certifies that it " +
      "is a 'Subject Person' within the meaning of the OFAC Enforcement " +
      "Guidelines and that this submission is made on a voluntary basis " +
      "prior to, and independent of, any inquiry by OFAC or another " +
      "agency into the conduct described herein.",
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

function buildSubjectMatterSection(
  vsd: VsdBuilderInput["vsd"],
  item: VsdBuilderInput["item"],
  counterparty: VsdBuilderInput["counterparty"],
): VsdSection {
  return {
    id: "subject_matter",
    ordinal: "III.",
    title: "Subject matter",
    paragraph:
      "Summary of the apparent violation being disclosed, including the " +
      "specific OFAC sanctions program implicated and the factual pattern " +
      "in one or two sentences. The full narrative appears in section IV.",
    fields: [
      {
        label: "Short title",
        value: vsd.title,
        required: true,
      },
      {
        label: "Apparent violation type",
        value: humanViolationType(vsd.violationType),
        required: true,
      },
      {
        label: "OFAC sanctions program(s) implicated",
        value: null,
        required: true,
      },
      {
        label: "Date of apparent violation",
        value: formatVsdDate(vsd.occurredAt),
        required: true,
      },
      {
        label: "Date of discovery",
        value: formatVsdDate(vsd.discoveredAt),
        required: true,
      },
      {
        label: "Counterparty",
        value: formatCounterpartyLine(counterparty),
        required: true,
      },
      {
        label: "Item / goods involved",
        value: formatItemLine(item),
        required: false,
      },
    ],
  };
}

function buildDescriptionSection(vsd: VsdBuilderInput["vsd"]): VsdSection {
  const narrative = vsd.description.trim();
  return {
    id: "description",
    ordinal: "IV.",
    title: "Description of the apparent violation",
    paragraph:
      "Per OFAC Enforcement Guidelines § II.A, the Discloser provides a " +
      "self-initiated, full, and complete disclosure of the apparent " +
      "violation. The narrative below describes the conduct, the " +
      "sanctions program implicated, the parties involved, the dates, " +
      "and the goods, technology, services, or funds at issue.",
    fields: [
      {
        label: "Narrative",
        value:
          narrative.length > 0
            ? narrative
            : "[To be completed: full factual narrative of the apparent " +
              "violation — who, what, when, where, why, how — including " +
              "all relevant transactions and supporting documentation.]",
        required: true,
      },
    ],
  };
}

function buildTransactionsSection(
  vsd: VsdBuilderInput["vsd"],
  counterparty: VsdBuilderInput["counterparty"],
  operation: VsdBuilderInput["operation"],
  item: VsdBuilderInput["item"],
): VsdSection {
  const bullets: string[] = [];

  if (operation) {
    bullets.push(
      `Operation reference: ${operation.reference} — ship-to country ` +
        `${operation.shipToCountry}. ${operation.description}`,
    );
  }
  if (counterparty) {
    bullets.push(
      `Counterparty: ${counterparty.legalName} ` +
        `(${counterparty.countryCode}) — address: ` +
        `${formatVsdAddress(counterparty.addressLines)}.`,
    );
  }
  if (item) {
    bullets.push(`Item: ${formatItemLine(item)}.`);
  }
  bullets.push(
    "Estimated value of the transaction(s) in USD and any blocked / " +
      "rejected status: [to be completed].",
  );
  bullets.push(
    "Bank-wire routing, intermediary banks, or correspondent " +
      "relationships relevant to the transaction(s): [to be completed].",
  );

  return {
    id: "transactions",
    ordinal: "V.",
    title: "Transactions and parties",
    paragraph:
      "Enumeration of each transaction comprising the apparent violation, " +
      "including dates, parties, values, payment paths, and any blocked / " +
      "rejected status. Where multiple transactions form a pattern, list " +
      "them chronologically; attach a transaction schedule as an exhibit " +
      "if more than five.",
    fields: [
      {
        label: "Discovery date (anchor for the 'self-initiated' criterion)",
        value: formatVsdDate(vsd.discoveredAt),
        required: true,
      },
    ],
    bullets,
  };
}

function buildRemedialMeasuresSection(vsd: VsdBuilderInput["vsd"]): VsdSection {
  return {
    id: "remedial_measures",
    ordinal: "VI.",
    title: "Remedial measures and root-cause analysis",
    paragraph:
      "Per OFAC Enforcement Guidelines § III.B.4 (General Factor F — " +
      "Remedial Response), the Discloser describes the corrective " +
      "actions taken in response to the apparent violation, including " +
      "root-cause analysis, internal controls remediation, training, " +
      "audits, and any personnel actions.",
    fields: [
      {
        label: "Root-cause analysis",
        value: null,
        required: true,
      },
      {
        label: "Internal controls / process changes implemented",
        value: null,
        required: true,
      },
      {
        label: "Compliance training delivered (audience + date)",
        value: null,
        required: false,
      },
      {
        label: "Independent audit / monitor engagement (if applicable)",
        value: null,
        required: false,
      },
      {
        label: "Status of underlying compliance investigation",
        value: vsd.status,
        required: true,
      },
    ],
    bullets: [
      "Self-initiated discovery — no inquiry pending or anticipated " +
        "from OFAC or another U.S. agency at the time the disclosure " +
        "was initiated.",
      "Cooperation — the Discloser commits to substantial and ongoing " +
        "cooperation with OFAC during the review of this disclosure, " +
        "including the production of additional documents and the " +
        "presentation of witnesses as requested.",
      "Compliance commitment — the Discloser has implemented or " +
        "enhanced a risk-based sanctions compliance program consistent " +
        "with OFAC's Framework for Compliance Commitments (May 2019).",
    ],
  };
}

function buildCertificationSection(filerOrgName: string): VsdSection {
  return {
    id: "certification",
    ordinal: "VII.",
    title: "Certification",
    paragraph:
      "By signing below, the undersigned, on behalf of the Discloser, " +
      "certifies under penalty of perjury (18 U.S.C. § 1001) that the " +
      "foregoing disclosure is true, accurate, and complete to the best " +
      "of his or her knowledge, information, and belief, and that he or " +
      "she has the authority to make this disclosure on behalf of the " +
      "Discloser.",
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

function buildClosingSection(): VsdSection {
  return {
    id: "closing",
    ordinal: "VIII.",
    title: "Exhibits and next steps",
    paragraph:
      "The Discloser requests confidential treatment for this " +
      "submission and all attachments under 31 CFR § 501.806(b) and the " +
      "Freedom of Information Act exemptions cross-referenced therein. " +
      "The Discloser stands ready to provide additional information and " +
      "to meet with OFAC staff at the Office's convenience.",
    fields: [],
    bullets: [
      "Exhibit A — Transaction schedule (if more than five transactions).",
      "Exhibit B — Relevant contracts, invoices, bank-wire confirmations.",
      "Exhibit C — Internal investigation memorandum (privileged).",
      "Exhibit D — Updated compliance policy and training records.",
      "Exhibit E — Organisational chart and identification of involved " +
        "personnel.",
    ],
  };
}
