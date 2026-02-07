/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * NIS2 Directive scoping assessment questions for the space sector.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Question } from "./questions";
import { NIS2AssessmentAnswers } from "./nis2-types";

// ─── NIS2 Scoping Questions ───
// These determine whether a space operator falls under NIS2 and what classification applies.

export const NIS2_QUESTIONS: Question[] = [
  // Q1: Sector
  {
    id: "sector",
    step: 1,
    title: "Which sector best describes your primary activity?",
    subtitle:
      "NIS2 applies to entities in sectors of high criticality (Annex I) and other critical sectors (Annex II)",
    options: [
      {
        id: "space",
        label: "Space",
        description:
          "Satellite operations, ground infrastructure, launch services, or space data provision",
        icon: "Satellite",
        value: "space",
      },
      {
        id: "digital_infrastructure",
        label: "Digital Infrastructure",
        description:
          "Internet exchange points, DNS, TLD registries, cloud computing, data centres",
        icon: "Server",
        value: "digital_infrastructure",
      },
      {
        id: "transport",
        label: "Transport",
        description: "Air, rail, water, or road transport services",
        icon: "Plane",
        value: "transport",
      },
      {
        id: "other",
        label: "Other Sector",
        description:
          "Energy, health, banking, water, manufacturing, postal, chemicals, food, digital providers",
        icon: "Building2",
        value: "other",
      },
    ],
  },

  // Q2: Space Sub-Sector (conditional on Q1 = "space")
  {
    id: "spaceSubSector",
    step: 2,
    title: "What is your primary space activity?",
    subtitle:
      "Space is listed as a sector of high criticality in NIS2 Annex I, Sector 11",
    showWhen: {
      questionId: "sector",
      value: "space",
    },
    options: [
      {
        id: "ground_infrastructure",
        label: "Ground Infrastructure",
        description:
          "Ground stations, TT&C facilities, mission control centres",
        icon: "Radio",
        value: "ground_infrastructure",
      },
      {
        id: "satellite_communications",
        label: "Satellite Communications",
        description: "SATCOM services, broadband, broadcasting, relay services",
        icon: "Wifi",
        value: "satellite_communications",
      },
      {
        id: "spacecraft_manufacturing",
        label: "Spacecraft Manufacturing",
        description:
          "Satellite design, manufacturing, integration, and testing",
        icon: "Wrench",
        value: "spacecraft_manufacturing",
      },
      {
        id: "earth_observation",
        label: "Earth Observation",
        description: "Remote sensing data acquisition and processing",
        icon: "Eye",
        value: "earth_observation",
      },
    ],
  },

  // Q3: EU Establishment
  {
    id: "isEUEstablished",
    step: 3,
    title: "Is your organization established in the EU?",
    subtitle:
      "NIS2 primarily applies to entities established in EU member states. Non-EU entities may also be in scope if they provide services within the EU.",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, EU-established",
        description:
          "Headquartered or with a significant establishment in an EU member state",
        value: true,
      },
      {
        id: "no",
        label: "No, outside the EU",
        description: "Not established in any EU member state",
        value: false,
      },
    ],
    outOfScopeValue: false,
    outOfScopeMessage: "NIS2 primarily applies to EU-established entities",
    outOfScopeDetail:
      "The NIS2 Directive primarily applies to entities established in the EU. However, if you provide services within the EU, you may need to designate an EU representative under Art. 26. Additionally, the forthcoming EU Space Act will apply to third-country operators serving the EU market. Consider re-assessing your NIS2 obligations if you expand into the EU.",
  },

  // Q4: Entity Size
  {
    id: "entitySize",
    step: 4,
    title: "What best describes your organization's size?",
    subtitle:
      "NIS2 generally applies to medium and large entities, but some space sector operators are captured regardless of size",
    options: [
      {
        id: "micro",
        label: "Micro Enterprise",
        description: "< 10 employees and < €2M annual turnover",
        icon: "User",
        value: "micro",
      },
      {
        id: "small",
        label: "Small Enterprise",
        description: "< 50 employees and < €10M annual turnover",
        icon: "Users",
        value: "small",
      },
      {
        id: "medium",
        label: "Medium Enterprise",
        description: "50-250 employees or €10-50M turnover",
        icon: "Building",
        value: "medium",
      },
      {
        id: "large",
        label: "Large Enterprise",
        description: "> 250 employees or > €50M turnover",
        icon: "Landmark",
        value: "large",
      },
    ],
  },

  // Q5: Cross-border operations
  {
    id: "memberStateCount",
    step: 5,
    title: "In how many EU member states does your organization operate?",
    subtitle:
      "Cross-border operators may be subject to supervision by multiple authorities",
    options: [
      {
        id: "one",
        label: "1 member state",
        description: "Operations in a single EU country",
        icon: "MapPin",
        value: 1,
      },
      {
        id: "few",
        label: "2-5 member states",
        description: "Ground stations or offices in multiple EU countries",
        icon: "Map",
        value: 3,
      },
      {
        id: "many",
        label: "6+ member states",
        description: "Extensive pan-European operations or infrastructure",
        icon: "Globe",
        value: 8,
      },
    ],
  },

  // Q6: Space-specific activity booleans (presented as multi-select)
  {
    id: "operatesGroundInfra",
    step: 6,
    title: "Do you operate ground-based space infrastructure?",
    subtitle:
      "Ground stations, TT&C facilities, data centres for space data processing, or mission control centres",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes",
        description:
          "We operate ground stations, mission control, or related infrastructure",
        value: true,
      },
      {
        id: "no",
        label: "No",
        description: "We do not operate ground-based space infrastructure",
        value: false,
      },
    ],
  },

  // Q7: Existing ISO 27001
  {
    id: "hasISO27001",
    step: 7,
    title: "Does your organization hold ISO 27001 certification?",
    subtitle:
      "Existing certifications can significantly reduce your NIS2 compliance effort",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, ISO 27001 certified",
        description:
          "We hold a current ISO 27001 certificate covering our space operations",
        value: true,
      },
      {
        id: "no",
        label: "No certification",
        description:
          "We do not currently hold ISO 27001 or equivalent certification",
        value: false,
      },
    ],
  },

  // Q8: Existing incident response capability
  {
    id: "hasExistingCSIRT",
    step: 8,
    title:
      "Does your organization have an established incident response capability?",
    subtitle:
      "NIS2 Art. 23 requires reporting significant incidents within strict timelines",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, we have incident response",
        description:
          "Established CSIRT, SOC, or incident response team covering space operations",
        value: true,
      },
      {
        id: "no",
        label: "No formal capability",
        description:
          "No dedicated incident response team or documented procedures",
        value: false,
      },
    ],
  },
];

// ─── Helper Functions ───

// Helper to safely get answer value
function getAnswerValue(
  answers: NIS2AssessmentAnswers,
  questionId: string,
): string | boolean | number | null {
  return answers[questionId as keyof NIS2AssessmentAnswers] ?? null;
}

// Get the current question based on answers and step
export function getCurrentNIS2Question(
  answers: NIS2AssessmentAnswers,
  currentStep: number,
): Question | null {
  const question = NIS2_QUESTIONS.find((q) => q.step === currentStep);

  if (!question) return null;

  // Check if this question should be shown based on conditions
  if (question.showWhen) {
    const conditionValue = getAnswerValue(
      answers,
      question.showWhen.questionId,
    );
    if (conditionValue !== question.showWhen.value) {
      // Skip this question
      return getCurrentNIS2Question(answers, currentStep + 1);
    }
  }

  return question;
}

// Get total number of questions (accounting for conditional ones)
export function getTotalNIS2Questions(answers: NIS2AssessmentAnswers): number {
  let count = 0;
  for (const question of NIS2_QUESTIONS) {
    if (question.showWhen) {
      const conditionValue = getAnswerValue(
        answers,
        question.showWhen.questionId,
      );
      if (conditionValue === question.showWhen.value) {
        count++;
      }
    } else {
      count++;
    }
  }
  return count;
}

// Get default empty answers
export function getDefaultNIS2Answers(): NIS2AssessmentAnswers {
  return {
    sector: null,
    spaceSubSector: null,
    operatesGroundInfra: null,
    operatesSatComms: null,
    manufacturesSpacecraft: null,
    providesLaunchServices: null,
    providesEOData: null,
    entitySize: null,
    employeeCount: null,
    annualRevenue: null,
    memberStateCount: null,
    isEUEstablished: null,
    hasISO27001: null,
    hasExistingCSIRT: null,
    hasRiskManagement: null,
  };
}
