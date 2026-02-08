/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * National Space Law Database assessment questions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Question } from "./questions";
import { SpaceLawAssessmentAnswers } from "./space-law-types";

// ─── Space Law Assessment Questions ───

export const SPACE_LAW_QUESTIONS: Question[] = [
  // Q1: Jurisdiction Selection (MULTI-SELECT)
  {
    id: "selectedJurisdictions",
    step: 1,
    title:
      "Which jurisdiction(s) are you considering for your space operations?",
    subtitle:
      "Select 1 to 3 countries to compare licensing requirements side by side.",
    isMultiSelect: true,
    maxSelections: 3,
    options: [
      {
        id: "FR",
        label: "France",
        description: "Comprehensive space law since 2008 (LOS)",
        icon: "Flag",
        value: "FR",
      },
      {
        id: "UK",
        label: "United Kingdom",
        description: "Space Industry Act 2018 (post-Brexit regime)",
        icon: "Flag",
        value: "UK",
      },
      {
        id: "BE",
        label: "Belgium",
        description: "Space activities law since 2005",
        icon: "Flag",
        value: "BE",
      },
      {
        id: "NL",
        label: "Netherlands",
        description: "Space Activities Act 2007",
        icon: "Flag",
        value: "NL",
      },
      {
        id: "LU",
        label: "Luxembourg",
        description: "Progressive regime with space resources law",
        icon: "Flag",
        value: "LU",
      },
      {
        id: "AT",
        label: "Austria",
        description: "Outer Space Act 2011",
        icon: "Flag",
        value: "AT",
      },
      {
        id: "DK",
        label: "Denmark",
        description: "Act on Space Activities 2016",
        icon: "Flag",
        value: "DK",
      },
      {
        id: "DE",
        label: "Germany",
        description: "Remote sensing only — no comprehensive space law",
        icon: "Flag",
        value: "DE",
      },
      {
        id: "IT",
        label: "Italy",
        description: "Space Activities Law 2018",
        icon: "Flag",
        value: "IT",
      },
      {
        id: "NO",
        label: "Norway",
        description: "Space law since 1969 (non-EU, ESA member)",
        icon: "Flag",
        value: "NO",
      },
    ],
  },

  // Q2: Activity Type
  {
    id: "activityType",
    step: 2,
    title: "What type of space activity are you planning?",
    subtitle:
      "Different activities require different license types in each jurisdiction.",
    options: [
      {
        id: "spacecraft_operation",
        label: "Spacecraft Operation",
        description: "Satellite design, manufacture, launch, and operation",
        icon: "Satellite",
        value: "spacecraft_operation",
      },
      {
        id: "launch_vehicle",
        label: "Launch Vehicle Services",
        description: "Launch vehicle operations and deployment services",
        icon: "Rocket",
        value: "launch_vehicle",
      },
      {
        id: "launch_site",
        label: "Launch Site Operation",
        description: "Spaceport or launch facility management",
        icon: "Building2",
        value: "launch_site",
      },
      {
        id: "in_orbit_services",
        label: "In-Orbit Services",
        description: "Refueling, debris removal, repair, or inspection",
        icon: "Wrench",
        value: "in_orbit_services",
      },
      {
        id: "earth_observation",
        label: "Earth Observation",
        description: "Remote sensing and geospatial data acquisition",
        icon: "Eye",
        value: "earth_observation",
      },
      {
        id: "satellite_communications",
        label: "Satellite Communications",
        description: "SATCOM, broadband, broadcasting, relay services",
        icon: "Wifi",
        value: "satellite_communications",
      },
      {
        id: "space_resources",
        label: "Space Resource Utilization",
        description: "Asteroid mining, ISRU, or space manufacturing",
        icon: "Gem",
        value: "space_resources",
      },
    ],
  },

  // Q3: Entity Profile
  {
    id: "entityNationality",
    step: 3,
    title: "What best describes your organization?",
    subtitle:
      "Your entity profile determines which jurisdictions' rules apply and potential simplified procedures.",
    options: [
      {
        id: "domestic",
        label: "Domestic Entity",
        description: "Headquartered in one of your selected jurisdictions",
        icon: "Home",
        value: "domestic",
      },
      {
        id: "eu_other",
        label: "EU Entity (Other Member State)",
        description: "EU-based but in a different member state",
        icon: "Flag",
        value: "eu_other",
      },
      {
        id: "non_eu",
        label: "Non-EU Entity",
        description: "Headquartered outside the European Union",
        icon: "Globe",
        value: "non_eu",
      },
      {
        id: "esa_member",
        label: "ESA Member State Entity (non-EU)",
        description:
          "Based in an ESA member state that is not in the EU (e.g., UK, Norway, Switzerland)",
        icon: "Globe2",
        value: "esa_member",
      },
    ],
  },

  // Q3b: Entity Size
  {
    id: "entitySize",
    step: 4,
    title: "What is the size of your organization?",
    subtitle:
      "Some jurisdictions offer simplified procedures for smaller entities.",
    options: [
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
        description: "50–250 employees or €10–50M turnover",
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

  // Q4: Mission Profile — Orbit
  {
    id: "primaryOrbit",
    step: 5,
    title: "What is the primary orbit for your planned mission?",
    subtitle:
      "Orbital regime affects insurance requirements, debris obligations, and licensing complexity.",
    options: [
      {
        id: "leo",
        label: "LEO",
        description: "Low Earth Orbit (< 2,000 km)",
        icon: "Circle",
        value: "LEO",
      },
      {
        id: "meo",
        label: "MEO",
        description: "Medium Earth Orbit (2,000–35,786 km)",
        icon: "CircleDot",
        value: "MEO",
      },
      {
        id: "geo",
        label: "GEO",
        description: "Geostationary Orbit (~35,786 km)",
        icon: "Target",
        value: "GEO",
      },
      {
        id: "beyond",
        label: "Beyond Earth",
        description: "Cislunar, lunar, or deep space",
        icon: "Moon",
        value: "beyond",
      },
    ],
  },

  // Q4b: Constellation Size
  {
    id: "constellationSize",
    step: 6,
    title: "How many spacecraft are involved in your mission?",
    subtitle:
      "Constellation operations may require additional licensing considerations in some jurisdictions.",
    options: [
      {
        id: "single",
        label: "Single Spacecraft",
        description: "One satellite or space object",
        icon: "CircleDot",
        value: 1,
      },
      {
        id: "small",
        label: "Small Constellation (2–9)",
        description: "Standard licensing per spacecraft or batch authorization",
        icon: "Circle",
        value: 5,
      },
      {
        id: "medium",
        label: "Medium Constellation (10–99)",
        description: "May qualify for blanket licensing in some jurisdictions",
        icon: "Hexagon",
        value: 50,
      },
      {
        id: "large",
        label: "Large Constellation (100+)",
        description: "Enhanced requirements in most jurisdictions",
        icon: "Pentagon",
        value: 500,
      },
    ],
  },

  // Q5: Licensing Status
  {
    id: "licensingStatus",
    step: 7,
    title: "What is your current licensing status?",
    subtitle: "This helps us tailor recommendations to your stage.",
    options: [
      {
        id: "new_application",
        label: "New Application",
        description: "First time seeking authorization in these jurisdictions",
        icon: "FilePlus",
        value: "new_application",
      },
      {
        id: "existing_license",
        label: "Existing License",
        description:
          "Currently holding a valid license in at least one jurisdiction",
        icon: "FileCheck",
        value: "existing_license",
      },
      {
        id: "renewal",
        label: "License Renewal",
        description: "Current license expiring, seeking renewal or extension",
        icon: "RefreshCcw",
        value: "renewal",
      },
      {
        id: "pre_assessment",
        label: "Pre-Assessment",
        description: "Exploring options, no application filed yet",
        icon: "Search",
        value: "pre_assessment",
      },
    ],
  },
];

// ─── Helper Functions ───

export function getDefaultSpaceLawAnswers(): SpaceLawAssessmentAnswers {
  return {
    selectedJurisdictions: [],
    activityType: null,
    entityNationality: null,
    entitySize: null,
    primaryOrbit: null,
    constellationSize: null,
    licensingStatus: null,
  };
}

export function getCurrentSpaceLawQuestion(
  answers: SpaceLawAssessmentAnswers,
  currentStep: number,
): Question | null {
  const question = SPACE_LAW_QUESTIONS.find((q) => q.step === currentStep);
  if (!question) return null;

  // Check conditional display
  if (question.showWhen) {
    const conditionValue =
      answers[question.showWhen.questionId as keyof SpaceLawAssessmentAnswers];
    if (conditionValue !== question.showWhen.value) {
      return getCurrentSpaceLawQuestion(answers, currentStep + 1);
    }
  }

  return question;
}

export function getTotalSpaceLawQuestions(): number {
  return SPACE_LAW_QUESTIONS.length;
}
