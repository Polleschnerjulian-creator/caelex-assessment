// Assessment State Types
export type ActivityType =
  | "spacecraft"
  | "launch_vehicle"
  | "launch_site"
  | "isos"
  | "data_provider"
  | null;
export type EntitySize = "small" | "research" | "medium" | "large" | null;
export type OrbitType = "LEO" | "MEO" | "GEO" | "beyond" | null;
export type EstablishmentType =
  | "eu"
  | "third_country_eu_services"
  | "third_country_no_eu"
  | null;

export interface AssessmentAnswers {
  activityType: ActivityType;
  isDefenseOnly: boolean | null;
  hasPostLaunchAssets: boolean | null;
  establishment: EstablishmentType;
  entitySize: EntitySize;
  operatesConstellation: boolean | null;
  constellationSize: number | null;
  primaryOrbit: OrbitType;
  offersEUServices: boolean | null;
}

export interface AssessmentState {
  currentStep: number;
  answers: AssessmentAnswers;
  isComplete: boolean;
  isOutOfScope: boolean;
  outOfScopeReason: string | null;
}

// Operator Type Keys
export type OperatorTypeKey =
  | "spacecraft_operator"
  | "launch_operator"
  | "launch_site_operator"
  | "isos_provider"
  | "collision_avoidance_provider"
  | "primary_data_provider"
  | "third_country_operator";

export type OperatorAbbreviation =
  | "SCO"
  | "LO"
  | "LSO"
  | "ISOS"
  | "CAP"
  | "PDP"
  | "TCO"
  | "ALL";

// JSON Data Types
export interface Article {
  number: number | string;
  title: string;
  summary: string;
  applies_to: OperatorAbbreviation[];
  compliance_type: string;
  operator_action?: string;
  excludes?: OperatorAbbreviation[];
  required_documents?: string[];
  estimated_cost?: string;
  timeline?: string;
  decision_logic?: {
    questions?: {
      id: string;
      question: string;
      if_yes?: string;
      if_no?: string;
      options?: string[];
      note?: string;
    }[];
    always_applicable?: boolean;
    follows_from?: string;
  };
  key_definitions?: Record<string, string>;
  key_dates?: Record<string, string>;
  note?: string;
  ongoing_cost?: boolean;
  plan_must_cover?: string[];
  lca_scope?: string[];
  deadlines?: string;
}

export interface Section {
  number: number;
  name: string;
  articles: string;
  articles_detail?: Article[];
}

export interface Chapter {
  number: string;
  name: string;
  articles: string;
  articles_detail?: Article[];
  sections?: Section[];
  caelex_module?: string;
}

export interface Title {
  number: string;
  name: string;
  articles: string;
  caelex_module?: string;
  summary: string;
  articles_detail?: Article[];
  chapters?: Chapter[];
}

export interface ChecklistItem {
  requirement: string;
  articles: string;
  module: string;
}

export interface OperatorChecklist {
  pre_authorization?: ChecklistItem[];
  pre_registration?: ChecklistItem[];
  ongoing: ChecklistItem[];
  end_of_life?: ChecklistItem[];
  operational?: ChecklistItem[];
}

export interface SpaceActData {
  metadata: {
    regulation: string;
    reference: string;
    proposal_date: string;
    expected_application_date: string;
    total_articles: number;
    total_annexes: number;
    total_recitals: number;
    legal_basis: string;
    version: string;
    last_updated: string;
    note: string;
    enforcement: {
      max_fine_percentage_turnover: number;
      alternative_fine_basis: string;
      enforcement_bodies: string[];
      powers: string[];
      appeal: string;
    };
  };
  operator_types: Record<
    string,
    {
      id: string;
      definition: string;
      examples: string[];
      eu_space_act_ref: string;
    }
  >;
  size_categories: Record<
    string,
    {
      definition: string;
      special_provisions: string[];
    }
  >;
  constellation_tiers: Record<
    string,
    {
      count: string;
      special_provisions: string[];
    }
  >;
  titles: Title[];
  decision_tree: Record<string, unknown>;
  compliance_checklist_by_operator_type: {
    spacecraft_operator_eu: OperatorChecklist;
    launch_operator_eu: OperatorChecklist;
    third_country_operator: OperatorChecklist;
  };
  annexes: {
    number: string;
    title: string;
    relevant_modules: string[];
  }[];
}

// Compliance Result Types
export type RegimeType = "standard" | "light" | "out_of_scope";

export type ModuleStatusType =
  | "required"
  | "simplified"
  | "not_applicable"
  | "recommended";

export interface ModuleStatus {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: ModuleStatusType;
  articleCount: number;
  summary: string;
}

export interface KeyDate {
  date: string;
  description: string;
}

export interface ComplianceResult {
  operatorType: OperatorTypeKey;
  operatorTypeLabel: string;
  operatorAbbreviation: OperatorAbbreviation;
  isEU: boolean;
  isThirdCountry: boolean;
  regime: RegimeType;
  regimeLabel: string;
  regimeReason: string;
  entitySize: string;
  entitySizeLabel: string;
  constellationTier: string | null;
  constellationTierLabel: string | null;
  orbit: string;
  orbitLabel: string;
  offersEUServices: boolean;
  applicableArticles: Article[];
  totalArticles: number;
  applicableCount: number;
  applicablePercentage: number;
  moduleStatuses: ModuleStatus[];
  checklist: ChecklistItem[];
  keyDates: KeyDate[];
  estimatedAuthorizationCost: string;
  authorizationPath: string;
}

// Display category for compliance types
export type ComplianceCategory =
  | "mandatory_pre_activity"
  | "mandatory_ongoing"
  | "design_technical"
  | "conditional_simplified"
  | "informational";

export interface ComplianceCategoryInfo {
  label: string;
  color: string;
  bgColor: string;
}
