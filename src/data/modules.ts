/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * Unauthorized reproduction, distribution, reverse-engineering, or use
 * of this data to build competing products or services is strictly prohibited
 * and may result in legal action.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { ComplianceModule } from "./articles";

export interface ModuleDefinition {
  id: ComplianceModule;
  number: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  articleRange: string;
  color: string;
}

export const modules: ModuleDefinition[] = [
  {
    id: "authorization",
    number: "01",
    name: "Authorization & Licensing",
    shortName: "Authorization",
    icon: "FileCheck",
    description:
      "Multi-jurisdictional authorization workflow and licensing requirements",
    articleRange: "Art. 6–16, 32–39, 105–108",
    color: "rgba(139,159,255,0.5)",
  },
  {
    id: "registration",
    number: "02",
    name: "Registration & Registry",
    shortName: "Registration",
    icon: "Database",
    description: "URSO registration and Union Register of Space Objects",
    articleRange: "Art. 24",
    color: "rgba(139,200,255,0.5)",
  },
  {
    id: "environmental",
    number: "03",
    name: "Environmental Footprint",
    shortName: "Environmental",
    icon: "Leaf",
    description: "Environmental Footprint Declaration and lifecycle assessment",
    articleRange: "Art. 96–100",
    color: "rgba(139,255,200,0.5)",
  },
  {
    id: "cybersecurity",
    number: "04",
    name: "Cybersecurity",
    shortName: "Cybersecurity",
    icon: "Shield",
    description: "NIS2-aligned cybersecurity compliance requirements",
    articleRange: "Art. 74–95",
    color: "rgba(255,200,139,0.5)",
  },
  {
    id: "debris",
    number: "05",
    name: "Debris Mitigation & Safety",
    shortName: "Debris",
    icon: "Orbit",
    description:
      "Space debris mitigation, launch safety, and end-of-life compliance",
    articleRange: "Art. 58–72, 101–103",
    color: "rgba(255,139,139,0.5)",
  },
  {
    id: "insurance",
    number: "06",
    name: "Insurance & Liability",
    shortName: "Insurance",
    icon: "Shield",
    description: "Third-party liability insurance and financial guarantees",
    articleRange: "Art. 44–51",
    color: "rgba(200,139,255,0.5)",
  },
  {
    id: "supervision",
    number: "07",
    name: "Supervision & Reporting",
    shortName: "Supervision",
    icon: "Eye",
    description: "Ongoing supervisory obligations and incident reporting",
    articleRange: "Art. 26–31, 40–57, 73",
    color: "rgba(255,255,139,0.5)",
  },
  {
    id: "regulatory",
    number: "08",
    name: "Regulatory Intelligence",
    shortName: "Reg Intel",
    icon: "Bell",
    description:
      "Monitoring delegated acts, implementing acts, and regulatory changes",
    articleRange: "Art. 104, 114–119",
    color: "rgba(200,200,200,0.5)",
  },
  {
    id: "nis2",
    number: "09",
    name: "NIS2 Directive",
    shortName: "NIS2",
    icon: "ShieldCheck",
    description:
      "NIS2 Directive (EU) 2022/2555 — cybersecurity for space sector entities",
    articleRange: "Art. 20–21, 23, 27",
    color: "rgba(139,255,255,0.5)",
  },
];

// Legacy export for backwards compatibility
export const MODULES = modules;

// Compliance type normalization mapping
export const COMPLIANCE_TYPE_MAP: Record<string, string> = {
  // Mandatory (Pre-Activity)
  mandatory_pre_activity: "mandatory_pre_activity",
  mandatory: "mandatory_pre_activity",
  scope_determination: "mandatory_pre_activity",

  // Mandatory (Ongoing)
  mandatory_ongoing: "mandatory_ongoing",
  ongoing: "mandatory_ongoing",
  mandatory_operational: "mandatory_ongoing",
  ongoing_monitoring: "mandatory_ongoing",
  ongoing_commercial: "mandatory_ongoing",
  operational: "mandatory_ongoing",

  // Design & Technical
  design_requirement: "design_technical",
  design_and_operational: "design_technical",
  supply_chain: "design_technical",
  methodology_reference: "design_technical",

  // Conditional / Simplified
  conditional_exemption: "conditional_simplified",
  conditional_simplification: "conditional_simplified",
  optional_simplification: "conditional_simplified",
  conditional_mandatory: "conditional_simplified",

  // Informational / Framework
  informational: "informational",
  enforcement: "informational",
  support_available: "informational",
  reference: "informational",
  framework: "informational",
  participation: "informational",
  voluntary: "informational",
  milestone: "informational",
  timeline: "informational",
  optional: "informational",
  automatic_post_authorization: "informational",
};

export const COMPLIANCE_CATEGORY_DISPLAY: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  mandatory_pre_activity: {
    label: "Mandatory (Pre-Activity)",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  mandatory_ongoing: {
    label: "Mandatory (Ongoing)",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  design_technical: {
    label: "Design & Technical",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  conditional_simplified: {
    label: "Conditional / Simplified",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  informational: {
    label: "Informational / Framework",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
  },
};
