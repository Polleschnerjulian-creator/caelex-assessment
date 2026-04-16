import type { LegalSourceType } from "@/data/legal-sources";

type TFn = (key: string) => string;

export function getTypeLabels(t: TFn): Record<LegalSourceType, string> {
  return {
    international_treaty: t("atlas.type_treaty"),
    federal_law: t("atlas.type_law"),
    federal_regulation: t("atlas.type_regulation"),
    technical_standard: t("atlas.type_standard"),
    eu_regulation: t("atlas.type_eu_regulation"),
    eu_directive: t("atlas.type_eu_directive"),
    policy_document: t("atlas.type_policy"),
    draft_legislation: t("atlas.type_draft"),
  };
}

export function getStatusLabels(t: TFn): Record<string, string> {
  return {
    in_force: t("atlas.status_in_force"),
    draft: t("atlas.status_draft"),
    proposed: t("atlas.status_proposed"),
    superseded: t("atlas.status_superseded"),
    planned: t("atlas.status_planned"),
    not_ratified: t("atlas.status_not_ratified"),
    expired: t("atlas.status_expired"),
  };
}

export function getAreaLabels(t: TFn): Record<string, string> {
  return {
    licensing: t("atlas.area_licensing"),
    registration: t("atlas.area_registration"),
    liability: t("atlas.area_liability"),
    insurance: t("atlas.area_insurance"),
    cybersecurity: t("atlas.area_cybersecurity"),
    export_control: t("atlas.area_export_control"),
    data_security: t("atlas.area_data_security"),
    frequency_spectrum: t("atlas.area_frequency_spectrum"),
    environmental: t("atlas.area_environmental"),
    debris_mitigation: t("atlas.area_debris"),
    space_traffic_management: t("atlas.area_space_traffic_management"),
    human_spaceflight: t("atlas.area_human_spaceflight"),
    military_dual_use: t("atlas.area_military_dual_use"),
    debris: t("atlas.area_debris"),
    spectrum: t("atlas.area_spectrum"),
    supervision: t("atlas.area_supervision"),
  };
}

export function getLegislationStatusLabels(t: TFn): Record<string, string> {
  return {
    enacted: t("atlas.status_enacted"),
    draft: t("atlas.status_draft"),
    pending: t("atlas.status_pending"),
    none: t("atlas.status_none"),
  };
}

export function getSourceGroupTitles(t: TFn): Record<string, string> {
  return {
    treaties: t("atlas.group_international_treaties"),
    national: t("atlas.group_national_laws"),
    standards: t("atlas.group_technical_standards"),
    eu: t("atlas.group_eu_law"),
    policy: t("atlas.group_policy_documents"),
  };
}

export function getJurisdictionNames(t: TFn): Record<string, string> {
  return {
    DE: t("atlas.jurisdiction_de"),
    FR: t("atlas.jurisdiction_fr"),
    UK: t("atlas.jurisdiction_uk"),
    IT: t("atlas.jurisdiction_it"),
    INT: t("atlas.jurisdiction_int"),
    EU: t("atlas.jurisdiction_eu"),
    LU: t("atlas.jurisdiction_lu"),
    NL: t("atlas.jurisdiction_nl"),
    BE: t("atlas.jurisdiction_be"),
    ES: t("atlas.jurisdiction_es"),
    NO: t("atlas.jurisdiction_no"),
    SE: t("atlas.jurisdiction_se"),
    FI: t("atlas.jurisdiction_fi"),
    DK: t("atlas.jurisdiction_dk"),
    AT: t("atlas.jurisdiction_at"),
    CH: t("atlas.jurisdiction_ch"),
    PT: t("atlas.jurisdiction_pt"),
    IE: t("atlas.jurisdiction_ie"),
    GR: t("atlas.jurisdiction_gr"),
    CZ: t("atlas.jurisdiction_cz"),
    PL: t("atlas.jurisdiction_pl"),
  };
}
