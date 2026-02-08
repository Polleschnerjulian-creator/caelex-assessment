export interface QuestionOption {
  id: string;
  label: string;
  description: string;
  icon?: string;
  value: string | boolean | number;
}

export interface Question {
  id: string;
  step: number;
  title: string;
  subtitle?: string;
  options: QuestionOption[];
  isYesNo?: boolean;
  // For multi-select questions (e.g., jurisdiction picker)
  isMultiSelect?: boolean;
  maxSelections?: number;
  // For conditional follow-up questions
  showWhen?: {
    questionId: string;
    value: string | boolean;
  };
  // For out-of-scope handling
  outOfScopeValue?: string | boolean;
  outOfScopeMessage?: string;
  outOfScopeDetail?: string;
}

export const QUESTIONS: Question[] = [
  {
    id: "activityType",
    step: 1,
    title: "What is your primary space activity?",
    subtitle: "Select the category that best describes your main operations",
    options: [
      {
        id: "spacecraft",
        label: "Spacecraft Operation",
        description: "Design, manufacture, launch, or operate satellites",
        icon: "Satellite",
        value: "spacecraft",
      },
      {
        id: "launch_vehicle",
        label: "Launch Vehicle Services",
        description: "Operate launch vehicles to deploy space objects",
        icon: "Rocket",
        value: "launch_vehicle",
      },
      {
        id: "launch_site",
        label: "Launch Site Operation",
        description: "Operate or manage a launch facility",
        icon: "Building2",
        value: "launch_site",
      },
      {
        id: "isos",
        label: "In-Space Services",
        description: "Refueling, repair, debris removal, or inspection",
        icon: "Wrench",
        value: "isos",
      },
      {
        id: "data_provider",
        label: "Space Data Services",
        description: "Primary provider of space-based data",
        icon: "Radio",
        value: "data_provider",
      },
    ],
  },
  {
    id: "isDefenseOnly",
    step: 2,
    title:
      "Are your space assets used exclusively for defense or national security?",
    subtitle:
      "Dual-use assets (military and commercial) are still covered by the regulation",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, exclusively defense",
        description:
          "All assets are solely for military/national security purposes",
        value: true,
      },
      {
        id: "no",
        label: "No, not exclusively defense",
        description: "Assets are commercial, dual-use, or civilian",
        value: false,
      },
    ],
    outOfScopeValue: true,
    outOfScopeMessage: "Your assets are excluded under Art. 2(3)(a)",
    outOfScopeDetail:
      "Space objects used exclusively for defense or national security purposes are excluded from the EU Space Act scope. However, dual-use assets (serving both military and commercial purposes) may still be covered. Consider consulting a space law specialist if your situation involves dual-use applications.",
  },
  {
    id: "hasPostLaunchAssets",
    step: 3,
    title: "Will any of your space assets be launched after January 1, 2030?",
    subtitle:
      "The EU Space Act applies to assets launched from this date onwards",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, launching after 2030",
        description:
          "At least some assets will be launched after January 1, 2030",
        value: true,
      },
      {
        id: "no",
        label: "No, all launched before 2030",
        description: "All assets will be in orbit before the application date",
        value: false,
      },
    ],
    outOfScopeValue: false,
    outOfScopeMessage:
      "Pre-existing assets are grandfathered under Art. 2(3)(d)",
    outOfScopeDetail:
      "Space objects launched before January 1, 2030 are excluded from the EU Space Act scope. However, any new launches after this date will be fully in scope. If you plan future missions, those will require compliance with the new regulations.",
  },
  {
    id: "establishment",
    step: 4,
    title: "Where is your organization established?",
    subtitle: "This determines your regulatory pathway under the EU Space Act",
    options: [
      {
        id: "eu",
        label: "EU Member State",
        description: "Established in the EU or controlled by an EU entity",
        icon: "Flag",
        value: "eu",
      },
      {
        id: "third_country_eu_services",
        label: "Outside EU, serving EU market",
        description: "Non-EU entity providing services or data in the EU",
        icon: "Globe",
        value: "third_country_eu_services",
      },
      {
        id: "third_country_no_eu",
        label: "Outside EU, no EU activity",
        description: "No services or data provision within the EU market",
        icon: "Globe2",
        value: "third_country_no_eu",
      },
    ],
    outOfScopeValue: "third_country_no_eu",
    outOfScopeMessage:
      "Out of scope for non-EU operators without EU market activity",
    outOfScopeDetail:
      "The EU Space Act applies to third-country operators only if they provide space services or space-based data within the EU single market. If you have no current or planned EU market activity, the regulation does not apply to you. Note that this may change if you expand into the EU market in the future.",
  },
  {
    id: "entitySize",
    step: 5,
    title: "What best describes your organization?",
    subtitle:
      "Small enterprises and research institutions may qualify for simplified requirements",
    options: [
      {
        id: "small",
        label: "Small Enterprise",
        description: "< 50 employees and < €10M annual turnover",
        icon: "Users",
        value: "small",
      },
      {
        id: "research",
        label: "Research/Educational Institution",
        description: "University, research center, or educational body",
        icon: "GraduationCap",
        value: "research",
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
  {
    id: "operatesConstellation",
    step: 6,
    title: "Do you operate or plan to operate a satellite constellation?",
    subtitle: "Constellations have additional requirements based on size",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, constellation",
        description: "Operating multiple coordinated satellites",
        value: true,
      },
      {
        id: "no",
        label: "No, single satellite",
        description: "Single satellite or non-constellation missions",
        value: false,
      },
    ],
  },
  {
    id: "constellationSize",
    step: 7,
    title: "How many satellites are in your constellation?",
    subtitle:
      "Larger constellations face enhanced debris and pollution requirements",
    showWhen: {
      questionId: "operatesConstellation",
      value: true,
    },
    options: [
      {
        id: "small",
        label: "2-9 satellites",
        description: "Standard requirements, simplified if identical design",
        icon: "CircleDot",
        value: 5,
      },
      {
        id: "medium",
        label: "10-99 satellites",
        description: "Additional debris mitigation requirements",
        icon: "Circle",
        value: 50,
      },
      {
        id: "large",
        label: "100-999 satellites",
        description: "Enhanced debris + pollution mitigation mandatory",
        icon: "Hexagon",
        value: 500,
      },
      {
        id: "mega",
        label: "1,000+ satellites",
        description: "Full enhanced requirements apply",
        icon: "Pentagon",
        value: 1000,
      },
    ],
  },
  {
    id: "primaryOrbit",
    step: 8,
    title: "What is the primary orbit for your mission?",
    subtitle: "Some requirements vary by orbital regime",
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
        description: "Medium Earth Orbit (2,000-35,786 km)",
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
  {
    id: "offersEUServices",
    step: 9,
    title: "Do you provide space-based services or data within the EU market?",
    subtitle:
      "This includes data downlinked to EU ground stations or services for EU customers",
    isYesNo: true,
    options: [
      {
        id: "yes",
        label: "Yes, EU market activity",
        description: "Providing services or data to EU customers",
        value: true,
      },
      {
        id: "no",
        label: "No EU market activity",
        description: "No services or data provision in the EU",
        value: false,
      },
    ],
  },
];

import { AssessmentAnswers } from "./types";

// Helper to safely get answer value
function getAnswerValue(
  answers: AssessmentAnswers,
  questionId: string,
): string | boolean | number | null {
  return answers[questionId as keyof AssessmentAnswers] ?? null;
}

// Helper to get the current question based on answers
export function getCurrentQuestion(
  answers: AssessmentAnswers,
  currentStep: number,
): Question | null {
  const question = QUESTIONS.find((q) => q.step === currentStep);

  if (!question) return null;

  // Check if this question should be shown based on conditions
  if (question.showWhen) {
    const conditionValue = getAnswerValue(
      answers,
      question.showWhen.questionId,
    );
    if (conditionValue !== question.showWhen.value) {
      // Skip this question
      return getCurrentQuestion(answers, currentStep + 1);
    }
  }

  return question;
}

// Get total number of questions (accounting for conditional ones)
export function getTotalQuestions(answers: AssessmentAnswers): number {
  let count = 0;
  for (const question of QUESTIONS) {
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
