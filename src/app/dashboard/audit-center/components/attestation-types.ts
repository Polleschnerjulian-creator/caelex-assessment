// ─── Predefined Attestation Types ───
// Each maps to a regulation ref with pre-configured metadata

export interface AttestationType {
  id: string;
  label: string;
  regulationRef: string;
  regulationName: string;
  claimStatement: string;
  category: string;
}

export const ATTESTATION_TYPES: AttestationType[] = [
  // NIS2 Art. 21
  {
    id: "nis2_pentest",
    label: "Penetration Test Completed",
    regulationRef: "nis2_art_21",
    regulationName: "NIS2 Directive Art. 21",
    claimStatement:
      "Penetration testing has been completed for all critical systems",
    category: "NIS2",
  },
  {
    id: "nis2_vuln_scan",
    label: "Vulnerability Scan",
    regulationRef: "nis2_art_21",
    regulationName: "NIS2 Directive Art. 21",
    claimStatement:
      "Vulnerability scanning has been conducted with no critical findings",
    category: "NIS2",
  },
  {
    id: "nis2_access_review",
    label: "Access Review",
    regulationRef: "nis2_art_21",
    regulationName: "NIS2 Directive Art. 21",
    claimStatement:
      "Privileged access review has been completed for the review period",
    category: "NIS2",
  },
  {
    id: "nis2_security_training",
    label: "Security Training",
    regulationRef: "nis2_art_21",
    regulationName: "NIS2 Directive Art. 21",
    claimStatement:
      "Mandatory cybersecurity awareness training has been completed by all personnel",
    category: "NIS2",
  },

  // EU Space Act Art. 8
  {
    id: "eu_insurance",
    label: "Insurance Policy Active",
    regulationRef: "eu_space_act_art_8",
    regulationName: "EU Space Act Art. 8",
    claimStatement:
      "Third-party liability insurance coverage is active and meets minimum requirements",
    category: "EU Space Act",
  },

  // EU Space Act Art. 70/72
  {
    id: "eu_deorbit_plan",
    label: "Deorbit Plan",
    regulationRef: "eu_space_act_art_70",
    regulationName: "EU Space Act Art. 70/72",
    claimStatement: "End-of-life deorbit plan has been filed and approved",
    category: "EU Space Act",
  },
  {
    id: "eu_passivation_plan",
    label: "Passivation Plan",
    regulationRef: "eu_space_act_art_72",
    regulationName: "EU Space Act Art. 72",
    claimStatement:
      "Satellite passivation procedures are documented and validated",
    category: "EU Space Act",
  },

  // EU Space Act Art. 66
  {
    id: "eu_environmental_impact",
    label: "Environmental Impact Assessment",
    regulationRef: "eu_space_act_art_66",
    regulationName: "EU Space Act Art. 66",
    claimStatement:
      "Environmental impact assessment has been completed for mission operations",
    category: "EU Space Act",
  },

  // EU Space Act Art. 62
  {
    id: "eu_flight_safety",
    label: "Flight Safety Plan",
    regulationRef: "eu_space_act_art_62",
    regulationName: "EU Space Act Art. 62",
    claimStatement:
      "Flight safety plan has been submitted and approved by the competent authority",
    category: "EU Space Act",
  },
  {
    id: "eu_fts_certification",
    label: "FTS Certification",
    regulationRef: "eu_space_act_art_62",
    regulationName: "EU Space Act Art. 62",
    claimStatement:
      "Flight termination system certification has been completed",
    category: "EU Space Act",
  },

  // EU Space Act Art. 24
  {
    id: "eu_registration",
    label: "Registration Submitted",
    regulationRef: "eu_space_act_art_24",
    regulationName: "EU Space Act Art. 24",
    claimStatement:
      "Space object registration has been submitted to the national registry",
    category: "EU Space Act",
  },

  // GDPR
  {
    id: "gdpr_dpia",
    label: "DPIA Completed",
    regulationRef: "gdpr_art_35",
    regulationName: "GDPR Art. 35",
    claimStatement:
      "Data Protection Impact Assessment has been completed for all processing activities",
    category: "GDPR",
  },

  // Export Control
  {
    id: "dual_use_export",
    label: "Export Control Review",
    regulationRef: "eu_dual_use_reg",
    regulationName: "EU Dual-Use Regulation",
    claimStatement:
      "Export control classification review has been completed for all controlled items",
    category: "Export Control",
  },

  // Custom
  {
    id: "custom",
    label: "Custom Attestation",
    regulationRef: "",
    regulationName: "",
    claimStatement: "",
    category: "Custom",
  },
];

export const ATTESTATION_CATEGORIES = [
  "NIS2",
  "EU Space Act",
  "GDPR",
  "Export Control",
  "Custom",
] as const;
