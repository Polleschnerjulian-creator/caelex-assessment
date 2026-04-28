/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SERVER-ONLY CRA Rule-Based Classification Engine
 *
 * Classifies products with digital elements into CRA product classes
 * based on Annex III (Class I) and Annex IV (Class II) criteria.
 * Used for products not in the curated taxonomy and as validation
 * for taxonomy selections.
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import "server-only";

import type {
  CRAAssessmentAnswers,
  CRAProductClass,
  CRAConformityRoute,
  ClassificationStep,
  ClassificationConflict,
} from "./cra-types";

// ─── Rule Definition ───

interface ClassificationRule {
  id: string;
  annexRef: "Annex III" | "Annex IV";
  annexCategory: string;
  criterion: string;
  legalBasis: string;
  test: (answers: CRAAssessmentAnswers) => boolean;
  reasoning: string;
}

// ─── Annex IV Rules (Class II) — Evaluated First ───

const ANNEX_IV_RULES: ClassificationRule[] = [
  {
    id: "annex_iv_kat_1_industrial_control",
    annexRef: "Annex IV",
    annexCategory: "1",
    criterion:
      "Product controlling physical systems in critical infrastructure",
    legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
    test: (a) =>
      a.controlsPhysicalSystem === true && a.usedInCriticalInfra === true,
    reasoning:
      "Product controls physical systems (actuators, thrusters, mechanisms) and is deployed in critical infrastructure (NIS2 Annex I Sector 11 Space). CRA Annex IV Category 1 applies to industrial automation and control systems in critical infrastructure.",
  },
  {
    id: "annex_iv_kat_2_auth_critical",
    annexRef: "Annex IV",
    annexCategory: "2",
    criterion:
      "Product processing authentication data in critical infrastructure",
    legalBasis: "Annex IV Kategorie 2",
    test: (a) => a.processesAuthData === true && a.usedInCriticalInfra === true,
    reasoning:
      "Product processes authentication credentials, authorization tokens, or access control data within critical infrastructure. Compromise enables unauthorized access to space systems.",
  },
  {
    id: "annex_iv_kat_3_crypto_safety",
    annexRef: "Annex IV",
    annexCategory: "3",
    criterion: "Cryptographic device in safety-critical application",
    legalBasis: "Annex IV Kategorie 3",
    test: (a) => a.performsCryptoOps === true && a.isSafetyCritical === true,
    reasoning:
      "Product performs cryptographic operations (key management, encryption, digital signatures) in a safety-critical context. Cryptographic failure in space systems can compromise entire communication chains.",
  },
];

// ─── Annex III Rules (Class I) — Evaluated If No Annex IV Match ───

const ANNEX_III_RULES: ClassificationRule[] = [
  {
    id: "annex_iii_kat_2_1_network_critical",
    annexRef: "Annex III",
    annexCategory: "2.1",
    criterion: "Network-capable product in critical infrastructure",
    legalBasis: "Annex III Kategorie 2.1",
    test: (a) =>
      a.hasNetworkFunction === true && a.usedInCriticalInfra === true,
    reasoning:
      "Product has network connectivity (SpaceWire, CAN, Ethernet, RF) and operates within critical infrastructure. CRA Annex III Category 2.1 covers network-capable products with elevated risk.",
  },
  {
    id: "annex_iii_kat_2_3_network_crypto",
    annexRef: "Annex III",
    annexCategory: "2.3",
    criterion: "Network-capable product with cryptographic functions",
    legalBasis: "Annex III Kategorie 2.3",
    test: (a) => a.hasNetworkFunction === true && a.performsCryptoOps === true,
    reasoning:
      "Product combines network connectivity with cryptographic operations (link-layer encryption, authenticated communications). CRA Annex III Category 2.3 covers products implementing cryptographic protocols.",
  },
  {
    id: "annex_iii_kat_2_1_microcontroller_network",
    annexRef: "Annex III",
    annexCategory: "2.1",
    criterion: "Microcontroller-based product with network function",
    legalBasis: "Annex III Kategorie 2.1",
    test: (a) => a.hasMicrocontroller === true && a.hasNetworkFunction === true,
    reasoning:
      "Product contains a microcontroller with network interface to spacecraft bus or ground network. Embedded devices with network connectivity fall under CRA Annex III Category 2.1.",
  },
];

// ─── OSS Scope Check ───

function checkOSSScope(
  answers: CRAAssessmentAnswers,
): ClassificationStep | null {
  if (answers.isOSSComponent !== true) return null;

  if (answers.isCommerciallySupplied === true) {
    return {
      criterion: "Open source but commercially supplied",
      legalBasis: "Art. 3 Nr. 12-14, Recital 18-20 CRA (EU) 2024/2847",
      annexRef: "N/A",
      satisfied: false,
      reasoning:
        "Product is open-source software but is commercially supplied (e.g., as part of a commercial product or service). Commercially supplied OSS is NOT excluded from CRA scope per Art. 3 Nr. 12.",
    };
  }

  return {
    criterion: "Non-commercially supplied open-source software",
    legalBasis: "Art. 3 Nr. 12-14, Recital 18-20 CRA (EU) 2024/2847",
    annexRef: "N/A",
    satisfied: true,
    reasoning:
      "Product is open-source software that is not commercially supplied. Non-commercial OSS is excluded from CRA scope per Art. 3 Nr. 12-14 and Recitals 18-20.",
  };
}

// ─── Main Classification Function ───

export function classifyByRules(answers: CRAAssessmentAnswers): {
  classification: CRAProductClass;
  conformityRoute: CRAConformityRoute;
  steps: ClassificationStep[];
  isOutOfScope: boolean;
  outOfScopeReason?: string;
} {
  const steps: ClassificationStep[] = [];

  // Step 0: Product with digital elements (always true if we're here)
  steps.push({
    criterion: "Product with digital elements",
    legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
    annexRef: "N/A",
    satisfied: true,
    reasoning:
      "Product contains or consists of software and/or hardware with a data connection — meets the CRA definition of a product with digital elements.",
  });

  // Step 1: OSS scope check
  const ossStep = checkOSSScope(answers);
  if (ossStep) {
    steps.push(ossStep);
    if (ossStep.satisfied) {
      return {
        classification: "default",
        conformityRoute: "self_assessment",
        steps,
        isOutOfScope: true,
        outOfScopeReason:
          "Non-commercially supplied open-source software is excluded from CRA scope (Art. 3 Nr. 12-14, Recital 18-20).",
      };
    }
  }

  // Step 2: Check Annex IV rules (Class II)
  let matchedClassII = false;
  for (const rule of ANNEX_IV_RULES) {
    const satisfied = rule.test(answers);
    steps.push({
      criterion: rule.criterion,
      legalBasis: rule.legalBasis,
      annexRef: rule.annexRef,
      annexCategory: rule.annexCategory,
      satisfied,
      reasoning: satisfied
        ? rule.reasoning
        : `Criterion not met: ${rule.criterion.toLowerCase()}.`,
    });
    if (satisfied) matchedClassII = true;
  }

  if (matchedClassII) {
    return {
      classification: "class_II",
      conformityRoute: "third_party_type_exam",
      steps,
      isOutOfScope: false,
    };
  }

  // Step 3: Check Annex III rules (Class I)
  let matchedClassI = false;
  for (const rule of ANNEX_III_RULES) {
    const satisfied = rule.test(answers);
    steps.push({
      criterion: rule.criterion,
      legalBasis: rule.legalBasis,
      annexRef: rule.annexRef,
      annexCategory: rule.annexCategory,
      satisfied,
      reasoning: satisfied
        ? rule.reasoning
        : `Criterion not met: ${rule.criterion.toLowerCase()}.`,
    });
    if (satisfied) matchedClassI = true;
  }

  if (matchedClassI) {
    return {
      classification: "class_I",
      conformityRoute: "harmonised_standard",
      steps,
      isOutOfScope: false,
    };
  }

  // Step 4: Default
  return {
    classification: "default",
    conformityRoute: "self_assessment",
    steps,
    isOutOfScope: false,
  };
}

// ─── Conflict Detection ───

export function detectClassificationConflict(
  taxonomyClass: CRAProductClass,
  ruleResult: { classification: CRAProductClass; steps: ClassificationStep[] },
): ClassificationConflict | undefined {
  if (taxonomyClass === ruleResult.classification) return undefined;

  const conflictingSteps = ruleResult.steps.filter((s) => s.satisfied);

  return {
    taxonomyClass,
    ruleEngineClass: ruleResult.classification,
    conflictingSteps,
    recommendation:
      ruleResult.classification === "class_II"
        ? `Rule engine classified this product as Class II based on your answers. This is a higher classification than the taxonomy suggestion (${taxonomyClass}). We recommend using the Class II classification to ensure regulatory compliance.`
        : ruleResult.classification === "class_I" && taxonomyClass === "default"
          ? `Rule engine classified this product as Class I based on your answers. The taxonomy suggests Default classification. Review whether the product has network capabilities or operates in critical infrastructure.`
          : `Taxonomy and rule engine disagree. The taxonomy classifies as ${taxonomyClass}, the rule engine as ${ruleResult.classification}. Review the conflicting criteria below.`,
  };
}
