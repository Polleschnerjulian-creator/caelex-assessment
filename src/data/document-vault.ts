// Document Vault Module - Data Definitions
// Reference: EU Space Act compliance document requirements

import type { DocumentCategory, ModuleType } from "@prisma/client";

// ============================================
// DOCUMENT CATEGORIES
// ============================================

export interface CategoryConfig {
  id: DocumentCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  subcategories: {
    id: string;
    name: string;
    requiredFor: string[];
  }[];
  expiryTracking: boolean;
  renewalAlertDays?: number;
}

export const documentCategories: Record<string, CategoryConfig> = {
  licenses: {
    id: "LICENSE",
    name: "Licenses & Permits",
    description: "Operating licenses and regulatory permits",
    icon: "FileCheck",
    color: "#8b5cf6",
    subcategories: [
      {
        id: "space-license",
        name: "Space License",
        requiredFor: ["AUTHORIZATION"],
      },
      {
        id: "frequency-license",
        name: "Frequency License",
        requiredFor: ["AUTHORIZATION"],
      },
      {
        id: "export-license",
        name: "Export License",
        requiredFor: ["AUTHORIZATION"],
      },
      {
        id: "launch-permit",
        name: "Launch Permit",
        requiredFor: ["AUTHORIZATION"],
      },
      {
        id: "operating-permit",
        name: "Operating Permit",
        requiredFor: ["AUTHORIZATION"],
      },
    ],
    expiryTracking: true,
    renewalAlertDays: 90,
  },

  certificates: {
    id: "CERTIFICATE",
    name: "Certificates",
    description: "Certifications and accreditations",
    icon: "Award",
    color: "#f59e0b",
    subcategories: [
      { id: "iso-27001", name: "ISO 27001", requiredFor: ["CYBERSECURITY"] },
      { id: "iso-9001", name: "ISO 9001", requiredFor: [] },
      { id: "iso-14001", name: "ISO 14001", requiredFor: ["ENVIRONMENTAL"] },
      { id: "soc2", name: "SOC 2 Type II", requiredFor: ["CYBERSECURITY"] },
      { id: "ecss", name: "ECSS Certification", requiredFor: ["DEBRIS"] },
    ],
    expiryTracking: true,
    renewalAlertDays: 120,
  },

  insurance: {
    id: "INSURANCE_POLICY",
    name: "Insurance",
    description: "Insurance policies and certificates",
    icon: "Shield",
    color: "#10b981",
    subcategories: [
      { id: "tpl", name: "Third Party Liability", requiredFor: ["INSURANCE"] },
      {
        id: "launch-insurance",
        name: "Launch Insurance",
        requiredFor: ["INSURANCE"],
      },
      {
        id: "in-orbit",
        name: "In-Orbit Insurance",
        requiredFor: ["INSURANCE"],
      },
      {
        id: "cyber-insurance",
        name: "Cyber Insurance",
        requiredFor: ["CYBERSECURITY"],
      },
      {
        id: "professional-indemnity",
        name: "Professional Indemnity",
        requiredFor: [],
      },
    ],
    expiryTracking: true,
    renewalAlertDays: 60,
  },

  reports: {
    id: "COMPLIANCE_REPORT",
    name: "Reports",
    description: "Compliance and audit reports",
    icon: "FileText",
    color: "#3b82f6",
    subcategories: [
      {
        id: "compliance-report",
        name: "Compliance Report",
        requiredFor: ["SUPERVISION"],
      },
      {
        id: "audit-report",
        name: "Audit Report",
        requiredFor: ["CYBERSECURITY"],
      },
      {
        id: "incident-report",
        name: "Incident Report",
        requiredFor: ["SUPERVISION"],
      },
      {
        id: "environmental-report",
        name: "Environmental Report",
        requiredFor: ["ENVIRONMENTAL"],
      },
      { id: "debris-report", name: "Debris Report", requiredFor: ["DEBRIS"] },
      {
        id: "annual-report",
        name: "Annual Report",
        requiredFor: ["SUPERVISION"],
      },
    ],
    expiryTracking: false,
  },

  technical: {
    id: "TECHNICAL_SPEC",
    name: "Technical Documents",
    description: "Technical specifications and analyses",
    icon: "Settings",
    color: "#06b6d4",
    subcategories: [
      {
        id: "mission-spec",
        name: "Mission Specification",
        requiredFor: ["AUTHORIZATION"],
      },
      {
        id: "debris-plan",
        name: "Debris Mitigation Plan",
        requiredFor: ["DEBRIS"],
      },
      { id: "deorbit-plan", name: "Deorbit Plan", requiredFor: ["DEBRIS"] },
      {
        id: "safety-analysis",
        name: "Safety Analysis",
        requiredFor: ["AUTHORIZATION"],
      },
      {
        id: "cybersec-assessment",
        name: "Cybersecurity Assessment",
        requiredFor: ["CYBERSECURITY"],
      },
      {
        id: "lca-assessment",
        name: "LCA Assessment",
        requiredFor: ["ENVIRONMENTAL"],
      },
    ],
    expiryTracking: false,
  },

  contracts: {
    id: "CONTRACT",
    name: "Contracts",
    description: "Contracts and agreements",
    icon: "FileSignature",
    color: "#ec4899",
    subcategories: [
      { id: "launch-contract", name: "Launch Contract", requiredFor: [] },
      {
        id: "ground-segment",
        name: "Ground Segment Contract",
        requiredFor: [],
      },
      {
        id: "data-agreement",
        name: "Data Processing Agreement",
        requiredFor: ["CYBERSECURITY"],
      },
      { id: "nda", name: "NDA", requiredFor: [] },
      { id: "sla", name: "Service Level Agreement", requiredFor: [] },
    ],
    expiryTracking: true,
    renewalAlertDays: 30,
  },

  regulatory: {
    id: "REGULATORY_FILING",
    name: "Regulatory Documents",
    description: "Regulatory filings and communications",
    icon: "Building2",
    color: "#ef4444",
    subcategories: [
      {
        id: "un-registration",
        name: "UN Registration",
        requiredFor: ["AUTHORIZATION"],
      },
      { id: "itu-filing", name: "ITU Filing", requiredFor: ["AUTHORIZATION"] },
      {
        id: "nca-notification",
        name: "NCA Notification",
        requiredFor: ["SUPERVISION"],
      },
      {
        id: "regulatory-response",
        name: "Regulatory Correspondence",
        requiredFor: [],
      },
      {
        id: "authorization-docs",
        name: "Authorization Documents",
        requiredFor: ["AUTHORIZATION"],
      },
    ],
    expiryTracking: false,
  },

  internal: {
    id: "POLICY",
    name: "Internal Documents",
    description: "Policies, procedures, and training materials",
    icon: "FileStack",
    color: "#6b7280",
    subcategories: [
      {
        id: "security-policy",
        name: "Security Policy",
        requiredFor: ["CYBERSECURITY"],
      },
      { id: "compliance-policy", name: "Compliance Policy", requiredFor: [] },
      { id: "procedure", name: "Operating Procedure", requiredFor: [] },
      { id: "training", name: "Training Materials", requiredFor: [] },
      { id: "manual", name: "Operations Manual", requiredFor: [] },
    ],
    expiryTracking: false,
  },
};

// ============================================
// REQUIRED DOCUMENTS PER MODULE
// ============================================

export interface RequiredDocument {
  category: DocumentCategory;
  subcategory?: string;
  name: string;
  criticality: "MANDATORY" | "RECOMMENDED" | "CONDITIONAL";
  description?: string;
  regulatoryRef?: string;
}

export const requiredDocuments: Record<string, RequiredDocument[]> = {
  AUTHORIZATION: [
    {
      category: "LICENSE",
      subcategory: "space-license",
      name: "Space License",
      criticality: "MANDATORY",
      description: "National space activity authorization",
      regulatoryRef: "EU Space Act Art. 6-10",
    },
    {
      category: "LICENSE",
      subcategory: "frequency-license",
      name: "Frequency License",
      criticality: "MANDATORY",
      description: "ITU frequency coordination",
      regulatoryRef: "ITU Radio Regulations",
    },
    {
      category: "TECHNICAL_SPEC",
      subcategory: "mission-spec",
      name: "Mission Specification",
      criticality: "MANDATORY",
      description: "Complete mission technical specification",
    },
    {
      category: "SAFETY_ANALYSIS",
      name: "Safety Analysis",
      criticality: "MANDATORY",
      description: "Comprehensive safety assessment",
      regulatoryRef: "EU Space Act Art. 12",
    },
    {
      category: "INSURANCE_POLICY",
      name: "Insurance Policy",
      criticality: "MANDATORY",
      description: "Third-party liability insurance",
      regulatoryRef: "EU Space Act Art. 18",
    },
  ],

  DEBRIS: [
    {
      category: "TECHNICAL_SPEC",
      subcategory: "debris-plan",
      name: "Debris Mitigation Plan",
      criticality: "MANDATORY",
      description: "Plan according to ISO 24113",
      regulatoryRef: "EU Space Act Art. 25-27",
    },
    {
      category: "TECHNICAL_SPEC",
      subcategory: "deorbit-plan",
      name: "Deorbit Plan",
      criticality: "RECOMMENDED",
      description: "End-of-life disposal strategy",
      regulatoryRef: "EU Space Act Art. 28",
    },
    {
      category: "CERTIFICATE",
      subcategory: "ecss",
      name: "ECSS Certification",
      criticality: "RECOMMENDED",
      description: "European Cooperation for Space Standardization compliance",
    },
  ],

  CYBERSECURITY: [
    {
      category: "ISO_CERTIFICATE",
      subcategory: "iso-27001",
      name: "ISO 27001 Certificate",
      criticality: "RECOMMENDED",
      description: "Information security management certification",
      regulatoryRef: "NIS2 Directive",
    },
    {
      category: "SECURITY_CERT",
      subcategory: "soc2",
      name: "SOC 2 Type II Report",
      criticality: "RECOMMENDED",
      description: "Security controls audit report",
    },
    {
      category: "AUDIT_REPORT",
      subcategory: "cybersec-assessment",
      name: "Cybersecurity Assessment",
      criticality: "MANDATORY",
      description: "Comprehensive security assessment",
      regulatoryRef: "EU Space Act Art. 74-95",
    },
    {
      category: "INSURANCE_POLICY",
      subcategory: "cyber-insurance",
      name: "Cyber Insurance",
      criticality: "RECOMMENDED",
      description: "Cyber risk insurance coverage",
    },
  ],

  INSURANCE: [
    {
      category: "INSURANCE_POLICY",
      subcategory: "tpl",
      name: "Third Party Liability Insurance",
      criticality: "MANDATORY",
      description: "TPL coverage per EU Space Act requirements",
      regulatoryRef: "EU Space Act Art. 18",
    },
    {
      category: "INSURANCE_CERT",
      name: "Insurance Certificate",
      criticality: "MANDATORY",
      description: "Proof of insurance coverage",
    },
    {
      category: "INSURANCE_POLICY",
      subcategory: "launch-insurance",
      name: "Launch Insurance",
      criticality: "CONDITIONAL",
      description: "Required if conducting launch operations",
    },
  ],

  ENVIRONMENTAL: [
    {
      category: "COMPLIANCE_REPORT",
      subcategory: "environmental-report",
      name: "Environmental Report",
      criticality: "MANDATORY",
      description: "Annual environmental impact report",
      regulatoryRef: "EU Space Act Art. 96-100",
    },
    {
      category: "TECHNICAL_SPEC",
      subcategory: "lca-assessment",
      name: "Life Cycle Assessment",
      criticality: "RECOMMENDED",
      description: "Environmental footprint assessment",
    },
  ],

  SUPERVISION: [
    {
      category: "COMPLIANCE_REPORT",
      name: "Compliance Report",
      criticality: "MANDATORY",
      description: "Annual compliance status report",
      regulatoryRef: "EU Space Act Art. 45",
    },
    {
      category: "REGULATORY_FILING",
      subcategory: "nca-notification",
      name: "NCA Notification",
      criticality: "MANDATORY",
      description: "Registration with National Competent Authority",
    },
    {
      category: "REGULATORY_FILING",
      subcategory: "un-registration",
      name: "UN Registration",
      criticality: "MANDATORY",
      description: "UN space object registration",
      regulatoryRef: "Registration Convention Art. IV",
    },
  ],
};

// ============================================
// DOCUMENT STATUS COLORS
// ============================================

export const documentColors = {
  status: {
    DRAFT: "#6b7280",
    PENDING_REVIEW: "#f59e0b",
    UNDER_REVIEW: "#f59e0b",
    PENDING_APPROVAL: "#f59e0b",
    APPROVED: "#22c55e",
    ACTIVE: "#22c55e",
    EXPIRED: "#ef4444",
    SUPERSEDED: "#9ca3af",
    ARCHIVED: "#9ca3af",
    REJECTED: "#ef4444",
  },
  expiry: {
    valid: "#22c55e",
    expiringSoon: "#f59e0b",
    expired: "#ef4444",
    noExpiry: "#6b7280",
  },
  accessLevel: {
    PUBLIC: "#22c55e",
    INTERNAL: "#3b82f6",
    CONFIDENTIAL: "#f59e0b",
    RESTRICTED: "#ef4444",
    TOP_SECRET: "#7c3aed",
  },
};

// ============================================
// CATEGORY DISPLAY INFO
// ============================================

export interface CategoryDisplayInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const categoryDisplayInfo: CategoryDisplayInfo[] = [
  { id: "LICENSE", label: "Licenses", icon: "FileCheck", color: "#8b5cf6" },
  { id: "PERMIT", label: "Permits", icon: "FileCheck", color: "#8b5cf6" },
  {
    id: "AUTHORIZATION",
    label: "Authorizations",
    icon: "FileCheck",
    color: "#8b5cf6",
  },
  { id: "CERTIFICATE", label: "Certificates", icon: "Award", color: "#f59e0b" },
  {
    id: "ISO_CERTIFICATE",
    label: "ISO Certificates",
    icon: "Award",
    color: "#f59e0b",
  },
  {
    id: "SECURITY_CERT",
    label: "Security Certificates",
    icon: "Shield",
    color: "#f59e0b",
  },
  {
    id: "INSURANCE_POLICY",
    label: "Insurance Policies",
    icon: "Shield",
    color: "#10b981",
  },
  {
    id: "INSURANCE_CERT",
    label: "Insurance Certificates",
    icon: "Shield",
    color: "#10b981",
  },
  {
    id: "COMPLIANCE_REPORT",
    label: "Compliance Reports",
    icon: "FileText",
    color: "#3b82f6",
  },
  {
    id: "AUDIT_REPORT",
    label: "Audit Reports",
    icon: "FileText",
    color: "#3b82f6",
  },
  {
    id: "INCIDENT_REPORT",
    label: "Incident Reports",
    icon: "AlertTriangle",
    color: "#ef4444",
  },
  {
    id: "ANNUAL_REPORT",
    label: "Annual Reports",
    icon: "FileText",
    color: "#3b82f6",
  },
  {
    id: "TECHNICAL_SPEC",
    label: "Technical Specs",
    icon: "Settings",
    color: "#06b6d4",
  },
  {
    id: "DESIGN_DOC",
    label: "Design Documents",
    icon: "Pen",
    color: "#06b6d4",
  },
  {
    id: "TEST_REPORT",
    label: "Test Reports",
    icon: "FlaskConical",
    color: "#06b6d4",
  },
  {
    id: "SAFETY_ANALYSIS",
    label: "Safety Analysis",
    icon: "ShieldAlert",
    color: "#ef4444",
  },
  {
    id: "CONTRACT",
    label: "Contracts",
    icon: "FileSignature",
    color: "#ec4899",
  },
  { id: "NDA", label: "NDAs", icon: "Lock", color: "#ec4899" },
  { id: "SLA", label: "SLAs", icon: "FileSignature", color: "#ec4899" },
  {
    id: "REGULATORY_FILING",
    label: "Regulatory Filings",
    icon: "Building2",
    color: "#ef4444",
  },
  {
    id: "CORRESPONDENCE",
    label: "Correspondence",
    icon: "Mail",
    color: "#6b7280",
  },
  {
    id: "NOTIFICATION",
    label: "Notifications",
    icon: "Bell",
    color: "#6b7280",
  },
  { id: "POLICY", label: "Policies", icon: "FileStack", color: "#6b7280" },
  {
    id: "PROCEDURE",
    label: "Procedures",
    icon: "ListChecks",
    color: "#6b7280",
  },
  {
    id: "TRAINING",
    label: "Training",
    icon: "GraduationCap",
    color: "#6b7280",
  },
  { id: "OTHER", label: "Other", icon: "File", color: "#6b7280" },
];

// ============================================
// DOCUMENT TEMPLATES
// ============================================

export interface DocumentTemplateInfo {
  id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  regulatoryRef?: string;
  placeholders: {
    key: string;
    label: string;
    type: "string" | "number" | "date" | "text" | "array" | "object";
    required: boolean;
  }[];
}

export const documentTemplates: DocumentTemplateInfo[] = [
  {
    id: "compliance-report-annual",
    name: "Annual Compliance Report",
    description: "Standard template for EU Space Act annual compliance report",
    category: "COMPLIANCE_REPORT",
    regulatoryRef: "EU Space Act Art. 45",
    placeholders: [
      {
        key: "ORGANIZATION_NAME",
        label: "Organization Name",
        type: "string",
        required: true,
      },
      {
        key: "REPORT_YEAR",
        label: "Report Year",
        type: "number",
        required: true,
      },
      {
        key: "LICENSE_NUMBER",
        label: "License Number",
        type: "string",
        required: true,
      },
      {
        key: "MISSION_COUNT",
        label: "Number of Missions",
        type: "number",
        required: true,
      },
      {
        key: "COMPLIANCE_STATUS",
        label: "Compliance Status",
        type: "string",
        required: true,
      },
      { key: "INCIDENTS", label: "Incidents", type: "array", required: false },
    ],
  },
  {
    id: "incident-report",
    name: "Incident Report",
    description: "Standard template for incident notifications to NCAs",
    category: "INCIDENT_REPORT",
    regulatoryRef: "EU Space Act Art. 47",
    placeholders: [
      {
        key: "INCIDENT_TYPE",
        label: "Incident Type",
        type: "string",
        required: true,
      },
      {
        key: "INCIDENT_DATE",
        label: "Incident Date",
        type: "date",
        required: true,
      },
      {
        key: "DESCRIPTION",
        label: "Description",
        type: "text",
        required: true,
      },
      {
        key: "IMMEDIATE_ACTIONS",
        label: "Immediate Actions Taken",
        type: "text",
        required: true,
      },
      {
        key: "ROOT_CAUSE",
        label: "Root Cause Analysis",
        type: "text",
        required: false,
      },
      {
        key: "AFFECTED_ASSETS",
        label: "Affected Assets",
        type: "array",
        required: true,
      },
    ],
  },
  {
    id: "debris-mitigation-plan",
    name: "Debris Mitigation Plan",
    description: "Template according to ISO 24113 / ECSS-U-AS-10C",
    category: "TECHNICAL_SPEC",
    regulatoryRef: "EU Space Act Art. 25-27",
    placeholders: [
      {
        key: "MISSION_NAME",
        label: "Mission Name",
        type: "string",
        required: true,
      },
      {
        key: "SATELLITE_MASS",
        label: "Satellite Mass (kg)",
        type: "number",
        required: true,
      },
      {
        key: "ORBIT_PARAMETERS",
        label: "Orbit Parameters",
        type: "object",
        required: true,
      },
      {
        key: "DESIGN_LIFETIME",
        label: "Design Lifetime (years)",
        type: "number",
        required: true,
      },
      {
        key: "DEORBIT_STRATEGY",
        label: "Deorbit Strategy",
        type: "string",
        required: true,
      },
      {
        key: "PASSIVATION_MEASURES",
        label: "Passivation Measures",
        type: "array",
        required: true,
      },
      {
        key: "COLLISION_AVOIDANCE",
        label: "Collision Avoidance Capability",
        type: "text",
        required: true,
      },
    ],
  },
  {
    id: "insurance-certificate",
    name: "Insurance Certificate Request",
    description: "Template for requesting insurance certificates",
    category: "INSURANCE_CERT",
    regulatoryRef: "EU Space Act Art. 18",
    placeholders: [
      {
        key: "POLICY_NUMBER",
        label: "Policy Number",
        type: "string",
        required: true,
      },
      {
        key: "INSURED_ENTITY",
        label: "Insured Entity",
        type: "string",
        required: true,
      },
      {
        key: "COVERAGE_AMOUNT",
        label: "Coverage Amount",
        type: "string",
        required: true,
      },
      {
        key: "COVERAGE_PERIOD",
        label: "Coverage Period",
        type: "object",
        required: true,
      },
      {
        key: "INSURED_ASSETS",
        label: "Insured Assets",
        type: "array",
        required: true,
      },
    ],
  },
  {
    id: "cybersecurity-assessment",
    name: "Cybersecurity Assessment Report",
    description: "Template for NIS2-compliant cybersecurity assessments",
    category: "AUDIT_REPORT",
    regulatoryRef: "NIS2 Directive, EU Space Act Art. 74-95",
    placeholders: [
      {
        key: "ASSESSMENT_DATE",
        label: "Assessment Date",
        type: "date",
        required: true,
      },
      { key: "SCOPE", label: "Assessment Scope", type: "text", required: true },
      {
        key: "METHODOLOGY",
        label: "Methodology",
        type: "string",
        required: true,
      },
      { key: "FINDINGS", label: "Findings", type: "array", required: true },
      {
        key: "RISK_LEVEL",
        label: "Overall Risk Level",
        type: "string",
        required: true,
      },
      {
        key: "RECOMMENDATIONS",
        label: "Recommendations",
        type: "array",
        required: true,
      },
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getStatusColor(status: string): string {
  return (
    documentColors.status[status as keyof typeof documentColors.status] ||
    "#6b7280"
  );
}

export function getExpiryStatus(
  expiryDate: Date | null,
): "valid" | "expiringSoon" | "expired" | "noExpiry" {
  if (!expiryDate) return "noExpiry";

  const now = new Date();
  const diffDays = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiringSoon";
  return "valid";
}

export function getExpiryColor(expiryDate: Date | null): string {
  const status = getExpiryStatus(expiryDate);
  return documentColors.expiry[status];
}

export function getDaysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getCategoryInfo(
  category: string,
): CategoryDisplayInfo | undefined {
  return categoryDisplayInfo.find((c) => c.id === category);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============================================
// ALLOWED FILE TYPES
// ============================================

export const allowedFileTypes = {
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ],
  images: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  archives: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
  ],
};

export const maxFileSize = 50 * 1024 * 1024; // 50 MB

export function isAllowedFileType(mimeType: string): boolean {
  return [
    ...allowedFileTypes.documents,
    ...allowedFileTypes.images,
    ...allowedFileTypes.archives,
  ].includes(mimeType);
}
