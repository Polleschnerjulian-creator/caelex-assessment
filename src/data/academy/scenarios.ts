/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Academy simulation scenario definitions for the compliance training platform.
 * Each scenario presents operators with realistic decision-making situations
 * mapped to EU Space Act (COM(2025) 335), NIS2 (EU 2022/2555), and national
 * space law requirements.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ───

export interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  category: string;
  estimatedMinutes: number;
  icon: string;
  tags: string[];
  operatorProfile: {
    activityType:
      | "spacecraft"
      | "launch_vehicle"
      | "launch_site"
      | "isos"
      | "data_provider";
    entitySize: "small" | "research" | "medium" | "large";
    establishment: "eu" | "third_country_eu_services" | "third_country_no_eu";
    primaryOrbit?: "LEO" | "MEO" | "GEO" | "beyond";
    operatesConstellation?: boolean;
    constellationSize?: number;
    isDefenseOnly?: boolean;
    hasPostLaunchAssets?: boolean;
    offersEUServices?: boolean;
  };
  decisions: {
    id: string;
    title: string;
    description: string;
    options: {
      id: string;
      label: string;
      description: string;
      impact: Record<string, number>;
      feedback: string;
    }[];
  }[];
  passingScore: number;
  perfectScore: number;
}

// ─── Simulation Scenarios ───

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // 1. LEO Satellite Authorization — BEGINNER
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-leo-sat-auth",
    title: "LEO Satellite Authorization",
    description:
      "You are the compliance lead for a medium-sized EU satellite operator preparing to launch a 500 kg Earth observation satellite into a 550 km sun-synchronous orbit. Navigate the EU Space Act authorization process from initial filing through ongoing obligations under Art. 11-15.",
    difficulty: "BEGINNER",
    category: "EU_SPACE_ACT",
    estimatedMinutes: 15,
    icon: "Satellite",
    tags: ["authorization", "leo", "earth-observation", "eu-space-act"],
    operatorProfile: {
      activityType: "spacecraft",
      entitySize: "medium",
      establishment: "eu",
      primaryOrbit: "LEO",
    },
    decisions: [
      {
        id: "d1-nca-filing",
        title: "National Competent Authority Filing",
        description:
          "Your company is established in Germany. Under Art. 11, you must file an authorization application with the national competent authority. How do you proceed?",
        options: [
          {
            id: "d1-a",
            label: "File directly with EUSPA",
            description:
              "Submit the authorization application directly to the EU Agency for the Space Programme.",
            impact: { authorization: -15, registration: -5 },
            feedback:
              "Incorrect. Under Art. 11, applications must be submitted to the NCA of the Member State where the operator is established, not directly to EUSPA. In Germany this is the designated federal authority. EUSPA plays a coordination role but does not process individual authorizations.",
          },
          {
            id: "d1-b",
            label: "File with the German NCA",
            description:
              "Submit the application to the designated German national competent authority per Art. 11.",
            impact: { authorization: 20, registration: 10 },
            feedback:
              "Correct. Art. 11 requires operators to apply to the NCA of the Member State where they are established. This ensures your application is processed under the harmonized EU framework while respecting the national supervision principle.",
          },
          {
            id: "d1-c",
            label: "File with both the German NCA and EUSPA simultaneously",
            description: "Submit parallel applications to cover all bases.",
            impact: { authorization: -5, supervision: -5 },
            feedback:
              "Not recommended. The EU Space Act establishes a single-window principle through the NCA. Filing parallel applications creates administrative confusion and may delay processing. The NCA coordinates with EUSPA as part of the standard process under Art. 12.",
          },
        ],
      },
      {
        id: "d2-documentation",
        title: "Pre-Authorization Documentation",
        description:
          "Art. 12 specifies the information accompanying your application. Which documentation package do you prepare?",
        options: [
          {
            id: "d2-a",
            label: "Technical dossier only",
            description:
              "Submit satellite technical specifications, orbital parameters, and mission design documents.",
            impact: { authorization: -10, insurance: -10, debris: -5 },
            feedback:
              "Insufficient. Art. 12 requires a comprehensive package including proof of insurance (Art. 44), a debris mitigation plan (Art. 58-62), cybersecurity measures (Art. 74), and evidence of financial responsibility. A technical-only filing will be returned as incomplete.",
          },
          {
            id: "d2-b",
            label: "Complete Art. 12 compliance package",
            description:
              "Submit technical dossier, insurance certificates, debris mitigation plan, cybersecurity assessment, environmental footprint declaration, and operator financial standing evidence.",
            impact: {
              authorization: 25,
              insurance: 15,
              debris: 15,
              cybersecurity: 10,
              environmental: 10,
            },
            feedback:
              "Excellent. This comprehensive package addresses all Art. 12 requirements covering safety (Art. 58-62), security (Art. 74), financial responsibility (Art. 44-51), and environmental obligations (Art. 96-100). This approach minimizes back-and-forth and accelerates approval.",
          },
          {
            id: "d2-c",
            label: "Technical dossier plus insurance only",
            description:
              "Submit satellite specifications alongside third-party liability insurance certificates.",
            impact: { authorization: 0, insurance: 10, debris: -10 },
            feedback:
              "Partially correct but missing the debris mitigation plan (Art. 58-62), cybersecurity assessment (Art. 74), and environmental footprint declaration (Art. 96-100). The NCA will request supplementary information, delaying authorization.",
          },
        ],
      },
      {
        id: "d3-registration",
        title: "Union Register of Space Objects",
        description:
          "Art. 24 requires registration with the Union Register of Space Objects (URSO). When do you initiate registration?",
        options: [
          {
            id: "d3-a",
            label: "Register after successful launch",
            description:
              "Wait until the satellite is deployed in orbit before registering.",
            impact: { registration: -15, authorization: -5 },
            feedback:
              "Too late. Art. 24 requires pre-launch registration. Waiting until after deployment violates the registration timeline and may trigger supervisory action.",
          },
          {
            id: "d3-b",
            label: "Register during the authorization process",
            description:
              "Submit registration data to URSO as part of the pre-authorization workflow.",
            impact: { registration: 20, authorization: 10, supervision: 5 },
            feedback:
              "Correct. Art. 24 establishes that registration must occur pre-launch. Integrating registration into the authorization workflow ensures compliance with both Art. 11-15 and Art. 24 simultaneously.",
          },
          {
            id: "d3-c",
            label: "Let the NCA handle registration automatically",
            description:
              "Assume the NCA will register the object as part of authorization.",
            impact: { registration: -5, supervision: -5 },
            feedback:
              "Risky assumption. While the NCA coordinates with URSO, the operator bears primary responsibility for providing accurate registration data under Art. 24.",
          },
        ],
      },
      {
        id: "d4-ongoing",
        title: "Post-Authorization Obligations",
        description:
          "Your satellite is authorized and launched. Art. 15 establishes ongoing obligations. Which post-launch compliance programme do you implement?",
        options: [
          {
            id: "d4-a",
            label: "Annual compliance report only",
            description:
              "Submit an annual report to the NCA summarizing operational status.",
            impact: { supervision: -5, debris: -10, cybersecurity: -10 },
            feedback:
              "Insufficient. Art. 15 obligations go well beyond annual reporting. You must maintain continuous compliance with debris mitigation, cybersecurity, insurance, and notify the NCA of material operational changes.",
          },
          {
            id: "d4-b",
            label: "Comprehensive ongoing compliance programme",
            description:
              "Implement continuous monitoring of debris mitigation, cybersecurity posture, insurance validity, conjunction assessment participation, and incident reporting per Art. 15, 52-57, and 74.",
            impact: {
              supervision: 20,
              debris: 15,
              cybersecurity: 15,
              insurance: 10,
            },
            feedback:
              "Excellent. This satisfies the full scope of Art. 15 obligations including maintaining authorization conditions, participating in space situational awareness (Art. 52-57), continuous cybersecurity compliance (Art. 74), valid insurance coverage (Art. 44), and proactive supervisory engagement.",
          },
          {
            id: "d4-c",
            label: "Incident-driven compliance",
            description:
              "Respond to NCA inquiries and report incidents as they occur without maintaining a proactive programme.",
            impact: { supervision: -10, debris: -5, cybersecurity: -5 },
            feedback:
              "Non-compliant. Art. 15 mandates ongoing, proactive obligations. An incident-driven approach exposes you to supervisory sanctions under Art. 26-31 and potentially to authorization suspension or revocation.",
          },
        ],
      },
    ],
    passingScore: 60,
    perfectScore: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Launch Provider Compliance — INTERMEDIATE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-launch-provider",
    title: "Launch Provider Compliance",
    description:
      "You are the regulatory affairs director for a large EU launch service provider operating from a European spaceport. Navigate dual LO/LSO authorization, range safety requirements under Art. 32-39, and launch-specific insurance and debris obligations.",
    difficulty: "INTERMEDIATE",
    category: "EU_SPACE_ACT",
    estimatedMinutes: 20,
    icon: "Rocket",
    tags: ["launch", "authorization", "safety", "range-safety"],
    operatorProfile: {
      activityType: "launch_vehicle",
      entitySize: "large",
      establishment: "eu",
    },
    decisions: [
      {
        id: "d1-dual-auth",
        title: "Dual Authorization Strategy",
        description:
          "Your company operates both the launch vehicle and facility. Under Art. 2, LO and LSO are distinct categories. How do you structure your authorization?",
        options: [
          {
            id: "d1-a",
            label: "Single combined authorization",
            description:
              "Apply for one authorization covering both activities.",
            impact: { authorization: -10, supervision: -5 },
            feedback:
              "Incorrect. The EU Space Act treats LO and LSO as distinct operator types, each with specific requirements. A combined application would not satisfy the separate frameworks.",
          },
          {
            id: "d1-b",
            label: "Separate parallel applications",
            description:
              "File separate applications for LO and LSO simultaneously with cross-references.",
            impact: { authorization: 25, supervision: 15, registration: 10 },
            feedback:
              "Correct. Separate but coordinated applications respect the distinct operator categories while demonstrating operational synergies. Cross-referencing helps the NCA understand the integrated safety case.",
          },
          {
            id: "d1-c",
            label: "Sequential applications starting with LSO",
            description:
              "Apply for launch site authorization first, then launch vehicle after.",
            impact: { authorization: 5, supervision: 0 },
            feedback:
              "Suboptimal. Sequential filing significantly delays operational readiness. The EU Space Act does not mandate sequential processing.",
          },
        ],
      },
      {
        id: "d2-range-safety",
        title: "Range Safety Framework",
        description:
          "Art. 32-39 establishes launch safety requirements. Your trajectory overflies populated areas. What safety framework do you implement?",
        options: [
          {
            id: "d2-a",
            label: "Flight termination system only",
            description:
              "Install an FTS and rely on automated abort for deviations.",
            impact: { authorization: 5, insurance: -5, debris: 0 },
            feedback:
              "Partially compliant. An FTS is necessary but Art. 32-39 requires a comprehensive range safety framework including quantitative risk assessment, exclusion zones, real-time tracking, NOTAMs, and emergency response coordination.",
          },
          {
            id: "d2-b",
            label: "Comprehensive range safety programme",
            description:
              "Implement QRA, FTS, real-time tracking, exclusion zone management, NOTAM coordination, emergency response plan, and debris fall-zone analysis.",
            impact: {
              authorization: 20,
              insurance: 15,
              debris: 10,
              supervision: 10,
            },
            feedback:
              "Excellent. This programme addresses all Art. 32-39 requirements. The QRA demonstrates that risks to overflown populations remain within acceptable thresholds.",
          },
          {
            id: "d2-c",
            label: "Redesign trajectory to avoid populated areas",
            description: "Reroute to avoid all populated overflight.",
            impact: { authorization: 10, insurance: 5, debris: -5 },
            feedback:
              "While reducing overflight risk is desirable, complete avoidance is often impossible. Even without populated overflight, Art. 32-39 still requires range safety covering maritime exclusion zones and debris fall analysis.",
          },
        ],
      },
      {
        id: "d3-insurance-launch",
        title: "Launch Insurance Coverage",
        description:
          "Art. 44-51 requires third-party liability insurance. As a launch provider with multiple customers, how do you structure insurance?",
        options: [
          {
            id: "d3-a",
            label: "Mission-specific policy per launch",
            description:
              "Purchase a launch-specific policy covering the entire mission.",
            impact: { insurance: 20, authorization: 10 },
            feedback:
              "Good approach. A mission-specific policy ensures adequate coverage for each launch's risk profile. Ensure coverage spans pre-launch, launch, and early orbital phases.",
          },
          {
            id: "d3-b",
            label: "Require each payload customer to self-insure",
            description: "Pass insurance obligations to satellite operators.",
            impact: { insurance: -15, authorization: -10 },
            feedback:
              "Non-compliant. Art. 44-51 places primary launch insurance responsibility on the launch operator. You cannot contractually transfer statutory obligations.",
          },
          {
            id: "d3-c",
            label: "Annual umbrella policy",
            description: "Maintain a fleet-wide annual insurance programme.",
            impact: { insurance: 15, authorization: 5 },
            feedback:
              "Acceptable provided it covers each launch mission and per-occurrence limits meet NCA requirements. Some NCAs may require mission-specific endorsements.",
          },
        ],
      },
      {
        id: "d4-debris-launch",
        title: "Launch Debris Obligations",
        description:
          "Art. 58-62 addresses debris from launch activities including upper stages. What is your debris mitigation strategy?",
        options: [
          {
            id: "d4-a",
            label: "Controlled re-entry of upper stage",
            description:
              "Design the upper stage for controlled de-orbit within 24 hours of payload separation, with ocean impact targeting.",
            impact: { debris: 25, environmental: 15, authorization: 10 },
            feedback:
              "Best practice. Controlled re-entry exceeds minimum Art. 58-62 requirements. Ocean targeting minimizes ground casualty risk and strengthens your authorization case.",
          },
          {
            id: "d4-b",
            label: "Passivation and natural decay",
            description:
              "Passivate the upper stage and rely on natural orbital decay.",
            impact: { debris: 5, environmental: 0, authorization: 0 },
            feedback:
              "Minimally compliant. Passivation satisfies Art. 63-65 but natural decay may not meet disposal timelines for altitudes above ~600 km. A more proactive approach is recommended.",
          },
          {
            id: "d4-c",
            label: "No debris plan for upper stage",
            description:
              "Treat the upper stage as expendable with no disposal plan.",
            impact: { debris: -20, environmental: -10, authorization: -15 },
            feedback:
              "Non-compliant. Art. 58-62 explicitly requires launch operators to submit a debris mitigation plan. This will result in authorization denial.",
          },
        ],
      },
      {
        id: "d5-supervision",
        title: "Ongoing Launch Campaign Supervision",
        description:
          "Art. 26-31 governs supervision. How do you manage NCA relationships across a multi-launch campaign?",
        options: [
          {
            id: "d5-a",
            label: "Proactive transparency programme",
            description:
              "Establish regular reporting, invite NCA observers, share anomaly reports proactively, maintain open channels.",
            impact: { supervision: 25, authorization: 10 },
            feedback:
              "Outstanding. Proactive engagement builds regulatory trust and facilitates smoother authorization renewals. Art. 26-31 grants NCAs broad supervisory powers; transparency reduces intrusive inspections.",
          },
          {
            id: "d5-b",
            label: "Minimum required reporting",
            description:
              "Submit only mandated reports and respond to queries when received.",
            impact: { supervision: 5, authorization: 0 },
            feedback:
              "Technically compliant but suboptimal. NCAs may respond to limited engagement with more formal supervisory measures.",
          },
          {
            id: "d5-c",
            label: "Delegate to external compliance consultant",
            description: "Hire a consultancy to handle all NCA interactions.",
            impact: { supervision: 0, authorization: -5 },
            feedback:
              "Inadvisable as sole approach. Art. 26-31 establishes a direct supervisory relationship between the NCA and operator. Fully delegating may signal insufficient internal capability.",
          },
        ],
      },
    ],
    passingScore: 65,
    perfectScore: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Small Entity Light Regime — BEGINNER
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-light-regime",
    title: "Small Entity Light Regime",
    description:
      "You lead a 12-person university spin-off developing a 3U CubeSat for atmospheric research. Explore Art. 10 light regime eligibility and navigate simplified authorization for small entities.",
    difficulty: "BEGINNER",
    category: "EU_SPACE_ACT",
    estimatedMinutes: 12,
    icon: "Sparkles",
    tags: ["light-regime", "small-entity", "cubesat", "art-10"],
    operatorProfile: {
      activityType: "spacecraft",
      entitySize: "small",
      establishment: "eu",
      primaryOrbit: "LEO",
    },
    decisions: [
      {
        id: "d1-eligibility",
        title: "Light Regime Eligibility Assessment",
        description:
          "Art. 10 provides simplified authorization for small/micro enterprises. Your company has 12 employees and EUR 1.8M turnover. Do you qualify?",
        options: [
          {
            id: "d1-a",
            label: "Yes, apply under the light regime",
            description:
              "You meet micro/small enterprise thresholds and operate a low-risk mission.",
            impact: { authorization: 20, registration: 10 },
            feedback:
              "Correct. With 12 employees and EUR 1.8M turnover, you qualify as a small enterprise under EU Recommendation 2003/361/EC (< 50 employees, < EUR 10M turnover). A single 3U CubeSat in LEO is a low-risk profile.",
          },
          {
            id: "d1-b",
            label: "No, apply under the standard regime",
            description: "Apply under the full Art. 11-15 process to be safe.",
            impact: { authorization: 5, registration: 5 },
            feedback:
              "Unnecessarily burdensome. Art. 10 was specifically created to avoid disproportionate burden on small entities. The standard regime wastes resources.",
          },
          {
            id: "d1-c",
            label: "Uncertain, request NCA guidance first",
            description:
              "Contact the NCA to confirm eligibility before filing.",
            impact: { authorization: 10, registration: 5 },
            feedback:
              "Reasonable but unnecessary delay. The eligibility criteria in Art. 10 are objective (enterprise size + risk profile) and can be self-assessed.",
          },
        ],
      },
      {
        id: "d2-simplified-docs",
        title: "Simplified Documentation Requirements",
        description:
          "Under Art. 10, which documentation requirements are simplified or waived?",
        options: [
          {
            id: "d2-a",
            label: "All requirements are waived",
            description:
              "The light regime exempts small entities from all documentation.",
            impact: { authorization: -20, insurance: -15, debris: -15 },
            feedback:
              "Incorrect. The light regime simplifies but does not eliminate requirements. Core safety obligations (debris mitigation, basic insurance, registration) still apply.",
          },
          {
            id: "d2-b",
            label: "Reduced documentation depth with core safety maintained",
            description:
              "Submit simplified technical documentation, basic insurance, and a proportionate debris mitigation plan.",
            impact: {
              authorization: 25,
              insurance: 10,
              debris: 10,
              cybersecurity: 5,
              environmental: 5,
            },
            feedback:
              "Correct. Art. 10 applies the proportionality principle: documentation is scaled to risk and entity size. You still need basic insurance, a debris plan, and registration, but scope and depth are proportionate.",
          },
          {
            id: "d2-c",
            label: "Same documentation, just lower fees",
            description:
              "Submit the same documents as standard regime but pay reduced fees.",
            impact: { authorization: 0, insurance: 0, debris: 0 },
            feedback:
              "Incorrect. Art. 10 is a substantive simplification including reduced documentation, streamlined assessment procedures, and shorter processing times, not merely a fee discount.",
          },
        ],
      },
      {
        id: "d3-cubesat-debris",
        title: "CubeSat Debris Mitigation",
        description:
          "Art. 58-62 debris requirements apply proportionately. What approach is appropriate for a 3U CubeSat at 400 km?",
        options: [
          {
            id: "d3-a",
            label: "Rely on natural atmospheric drag",
            description:
              "At 400 km, drag will cause re-entry within 2-3 years. Document the natural decay timeline.",
            impact: { debris: 20, environmental: 10, authorization: 10 },
            feedback:
              "Appropriate. At 400 km, a 3U CubeSat re-enters within about 2-3 years, well within the 5-year guideline. Documenting natural decay with orbital lifetime analysis satisfies the proportionate requirements.",
          },
          {
            id: "d3-b",
            label: "Install a dedicated propulsion system",
            description: "Add a cold-gas thruster for controlled deorbiting.",
            impact: { debris: 15, environmental: 5, authorization: 5 },
            feedback:
              "Disproportionate. Adding propulsion to a 3U CubeSat at 400 km is not required. The mass and cost penalty is significant relative to the minimal debris risk. Natural decay is sufficient.",
          },
          {
            id: "d3-c",
            label: "No debris plan, CubeSats are too small",
            description:
              "Skip the debris plan since satellite mass is negligible.",
            impact: { debris: -20, environmental: -10, authorization: -15 },
            feedback:
              "Non-compliant. The EU Space Act applies to all space objects regardless of size. Art. 58-62 requires all operators to submit a debris plan. For a CubeSat it can be simple but must exist.",
          },
        ],
      },
      {
        id: "d4-light-insurance",
        title: "Insurance for Small Operators",
        description:
          "Art. 44-51 requires insurance. How does this apply under the light regime for your CubeSat?",
        options: [
          {
            id: "d4-a",
            label: "Full commercial space insurance",
            description:
              "Purchase a policy identical to what large operators carry.",
            impact: { insurance: 5, authorization: 0 },
            feedback:
              "Disproportionate. Full commercial policies are designed for large missions. Art. 10 implies proportionate financial requirements.",
          },
          {
            id: "d4-b",
            label: "Proportionate coverage based on mission risk",
            description:
              "Obtain coverage with limits proportionate to the ground casualty risk of a 3U CubeSat (very low mass, high burn-up probability).",
            impact: { insurance: 20, authorization: 10 },
            feedback:
              "Correct. The proportionality principle applies. A 3U CubeSat with high burn-up probability presents minimal third-party risk. The NCA may accept reduced coverage limits.",
          },
          {
            id: "d4-c",
            label: "Self-insure through company reserves",
            description:
              "Set aside funds as a financial guarantee instead of purchasing insurance.",
            impact: { insurance: -10, authorization: -5 },
            feedback:
              "Unlikely to be accepted. With EUR 1.8M turnover, self-insurance reserves would be insufficient. Art. 44-51 specifically references insurance. Third-party insurance is the practical path.",
          },
        ],
      },
    ],
    passingScore: 55,
    perfectScore: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Third-Country Operator in EU — ADVANCED
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-third-country",
    title: "Third-Country Operator in EU",
    description:
      "You are EU regulatory counsel for a large non-EU satellite operator headquartered in Singapore providing direct-to-consumer broadband across the EU via GEO satellites. Navigate the TCO provisions under Art. 8-9.",
    difficulty: "ADVANCED",
    category: "EU_SPACE_ACT",
    estimatedMinutes: 25,
    icon: "Globe",
    tags: ["third-country", "tco", "extraterritorial", "geo"],
    operatorProfile: {
      activityType: "spacecraft",
      entitySize: "large",
      establishment: "third_country_eu_services",
      primaryOrbit: "GEO",
      offersEUServices: true,
    },
    decisions: [
      {
        id: "d1-scope",
        title: "Scope Determination",
        description:
          "Your company is in Singapore with no EU establishment but provides broadband to EU customers. Does the EU Space Act apply?",
        options: [
          {
            id: "d1-a",
            label: "No, headquartered outside the EU",
            description:
              "The EU Space Act only applies to EU-established operators.",
            impact: { authorization: -20, supervision: -15, nis2: -10 },
            feedback:
              "Incorrect. Art. 2 establishes extraterritorial scope for operators providing space-based services to persons in the Union, regardless of establishment. You are a TCO under Art. 8.",
          },
          {
            id: "d1-b",
            label: "Yes, providing services in the EU market",
            description: "TCO provisions under Art. 8-9 are triggered.",
            impact: { authorization: 25, supervision: 15, nis2: 10 },
            feedback:
              "Correct. Art. 2 extends scope to third-country operators offering services in the EU market. Art. 8 establishes the TCO framework.",
          },
          {
            id: "d1-c",
            label: "Partially, only for EU-specific services",
            description: "Only the EU-dedicated capacity is in scope.",
            impact: { authorization: 5, supervision: 0 },
            feedback:
              "Oversimplified. The scope determination under Art. 2 is based on the activity of providing services to EU persons, which covers your entire operation insofar as it serves the EU market.",
          },
          {
            id: "d1-d",
            label: "Ignore EU requirements and continue operating",
            description:
              "Continue without authorization, accepting regulatory risk.",
            impact: {
              authorization: -20,
              supervision: -20,
              nis2: -15,
              insurance: -10,
            },
            feedback:
              "Non-compliant and high-risk. Enforcement under Art. 105-108 can include market access restrictions, financial penalties, and service disruption orders.",
          },
        ],
      },
      {
        id: "d2-tco-pathway",
        title: "TCO Authorization Pathway",
        description:
          "Art. 8-9 establishes pathways for third-country operators. Which do you pursue?",
        options: [
          {
            id: "d2-a",
            label: "Seek EU authorization directly",
            description:
              "Apply through a designated Member State NCA as if EU-established.",
            impact: { authorization: 15, supervision: 10, registration: 10 },
            feedback:
              "Valid option. Direct authorization provides the clearest compliance pathway and eliminates equivalence uncertainty. Requires designating an EU representative.",
          },
          {
            id: "d2-b",
            label: "Apply for equivalence recognition",
            description:
              "Demonstrate that Singapore's framework provides equivalent protection under Art. 9.",
            impact: { authorization: 10, supervision: 5, registration: 5 },
            feedback:
              "Possible but uncertain. Art. 9 requires a Commission adequacy decision for Singapore's framework. If none exists, you cannot rely on equivalence.",
          },
          {
            id: "d2-c",
            label: "Establish an EU subsidiary",
            description:
              "Create an EU subsidiary to hold authorization and manage compliance.",
            impact: { authorization: 20, supervision: 15, nis2: 15 },
            feedback:
              "Strong strategic approach. This converts you from TCO to EU-established operator under Art. 2, simplifying the pathway and clarifying NIS2 obligations.",
          },
        ],
      },
      {
        id: "d3-eu-representative",
        title: "EU Legal Representative",
        description:
          "Art. 8 requires TCOs to designate an EU legal representative. How do you structure this?",
        options: [
          {
            id: "d3-a",
            label: "Appoint a specialist law firm",
            description: "Designate an EU-based space regulation law firm.",
            impact: { authorization: 15, supervision: 10 },
            feedback:
              "Acceptable. Ensure the firm has genuine authority to receive NCA communications and facilitate supervisory access.",
          },
          {
            id: "d3-b",
            label: "Use a commercial registered agent",
            description:
              "Engage a registered agent service for minimal-cost presence.",
            impact: { authorization: -5, supervision: -10 },
            feedback:
              "Risky. Art. 8 requires a representative with genuine capacity to engage with NCA supervision. A generic agent likely lacks the expertise needed.",
          },
          {
            id: "d3-c",
            label: "Open a small EU office with dedicated staff",
            description:
              "Establish a modest EU office with regulatory and technical staff.",
            impact: { authorization: 20, supervision: 20, nis2: 10 },
            feedback:
              "Best approach. A dedicated office demonstrates commitment to compliance and provides the NCA with knowledgeable counterparts.",
          },
        ],
      },
      {
        id: "d4-nis2-tco",
        title: "NIS2 Implications for TCO",
        description:
          "As a broadband SATCOM operator serving the EU, NIS2 (EU 2022/2555) Annex I Sector 11 also applies. How do you address it?",
        options: [
          {
            id: "d4-a",
            label: "Address NIS2 separately",
            description: "Treat NIS2 as an independent workstream.",
            impact: { nis2: 5, cybersecurity: 0, supervision: -5 },
            feedback:
              "Suboptimal. Art. 74 of the EU Space Act cross-references NIS2. Disconnected programmes create duplication and inconsistency.",
          },
          {
            id: "d4-b",
            label: "Integrated cybersecurity compliance programme",
            description:
              "Build a unified programme satisfying both Art. 74 and NIS2 Art. 21, with coordinated incident response.",
            impact: { nis2: 20, cybersecurity: 20, supervision: 10 },
            feedback:
              "Excellent. An integrated programme leverages the cross-references between Art. 74 and NIS2 Art. 21. Incident reporting timelines (24h/72h/1 month) satisfy both frameworks simultaneously.",
          },
          {
            id: "d4-c",
            label: "Claim NIS2 does not apply to non-EU entities",
            description: "Argue NIS2 only applies to EU-established entities.",
            impact: { nis2: -20, cybersecurity: -15, supervision: -10 },
            feedback:
              "Incorrect. NIS2 Art. 2 applies to entities providing services within the EU regardless of establishment. Penalties reach EUR 10M or 2% of global turnover for essential entities.",
          },
        ],
      },
    ],
    passingScore: 65,
    perfectScore: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Constellation Operator — ADVANCED
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-constellation",
    title: "Constellation Operator",
    description:
      "You are VP of Regulatory Affairs for a large EU operator deploying a 100-satellite LEO broadband constellation. Navigate constellation-specific provisions including enhanced debris mitigation, type-based authorization under Art. 13, and environmental footprint obligations.",
    difficulty: "ADVANCED",
    category: "EU_SPACE_ACT",
    estimatedMinutes: 25,
    icon: "Stars",
    tags: ["constellation", "leo", "broadband", "debris"],
    operatorProfile: {
      activityType: "spacecraft",
      entitySize: "large",
      establishment: "eu",
      primaryOrbit: "LEO",
      operatesConstellation: true,
      constellationSize: 100,
    },
    decisions: [
      {
        id: "d1-auth-approach",
        title: "Constellation Authorization Strategy",
        description:
          "With 100 satellites, do you seek individual or type-based authorization under Art. 13?",
        options: [
          {
            id: "d1-a",
            label: "Individual authorization per satellite",
            description: "Apply for 100 separate authorizations.",
            impact: { authorization: -15, supervision: -10 },
            feedback:
              "Impractical. Art. 13 specifically addresses constellation operations, allowing type-based authorization for homogeneous fleets.",
          },
          {
            id: "d1-b",
            label: "Type-based constellation authorization",
            description:
              "Apply for a single type-based authorization covering the entire constellation under Art. 13.",
            impact: { authorization: 25, registration: 15, supervision: 10 },
            feedback:
              "Correct. Art. 13 enables type-based authorization where satellites share common design. Individual satellites are registered under the umbrella authorization.",
          },
          {
            id: "d1-c",
            label: "Phased batch authorization",
            description: "Authorize in deployment batches of 20.",
            impact: { authorization: 10, registration: 5, supervision: 5 },
            feedback:
              "Partially effective but creates unnecessary overhead. Type-based authorization is more efficient for homogeneous constellations. Batching may be appropriate if designs evolve between tranches.",
          },
        ],
      },
      {
        id: "d2-debris-constellation",
        title: "Constellation Debris Mitigation",
        description:
          "Art. 58-62 debris requirements are amplified for constellations. What approach do you take for 100 LEO satellites?",
        options: [
          {
            id: "d2-a",
            label: "Individual satellite deorbit plans",
            description:
              "Create deorbit plans for each satellite independently.",
            impact: { debris: 0, environmental: -5, authorization: -5 },
            feedback:
              "Insufficient. Art. 58-62 requires constellation operators to address aggregate impact: inter-satellite collision risk, coordinated disposal scheduling, and overall orbital environment effect.",
          },
          {
            id: "d2-b",
            label: "Fleet-level debris management with active disposal",
            description:
              "Implement active deorbit capability on every satellite (< 5 years), collision avoidance, coordinated disposal scheduling, spare management, and aggregate impact assessment.",
            impact: {
              debris: 25,
              environmental: 20,
              authorization: 15,
              supervision: 10,
            },
            feedback:
              "Excellent. IADC guidelines referenced by the EU Space Act recommend constellation-specific debris mitigation addressing inter-satellite collision risk and orbital capacity sustainability.",
          },
          {
            id: "d2-c",
            label: "Rely on low-altitude natural decay",
            description:
              "Deploy all satellites below 500 km for natural re-entry.",
            impact: { debris: 10, environmental: 5, authorization: 5 },
            feedback:
              "Partially addresses disposal but a 100-satellite constellation still requires collision avoidance, failure mode analysis, and aggregate environmental assessment.",
          },
        ],
      },
      {
        id: "d3-coordination",
        title: "Spectrum and Orbital Coordination",
        description:
          "Your constellation requires ITU frequency coordination. How do you manage coordination?",
        options: [
          {
            id: "d3-a",
            label: "Comprehensive coordination programme",
            description:
              "Engage ITU coordination, establish bilateral agreements with co-orbital operators, participate in SST data sharing, implement automated collision avoidance.",
            impact: { supervision: 20, authorization: 15, debris: 15 },
            feedback:
              "Outstanding. ITU coordination is legally required. Bilateral agreements reduce collision risk. SST data sharing supports Art. 52-57. Automated collision avoidance is essential for a 100-satellite fleet.",
          },
          {
            id: "d3-b",
            label: "ITU filing only",
            description:
              "Complete ITU filings but limit engagement with other operators.",
            impact: { supervision: 5, authorization: 5, debris: 0 },
            feedback:
              "Minimum legal requirement for spectrum but insufficient. Art. 52-57 expects broader coordination for constellation operators including conjunction assessment participation.",
          },
          {
            id: "d3-c",
            label: "Defer coordination to post-deployment",
            description:
              "Focus on deployment first, address coordination later.",
            impact: { supervision: -15, authorization: -10, debris: -10 },
            feedback:
              "Non-compliant. ITU coordination must precede spectrum use. The EU Space Act requires pre-authorization demonstration of coordination capability.",
          },
        ],
      },
      {
        id: "d4-cybersec-constellation",
        title: "Constellation Cybersecurity",
        description:
          "100 satellites with inter-satellite links represent a significant attack surface. Art. 74 and NIS2 apply.",
        options: [
          {
            id: "d4-a",
            label: "Defence-in-depth fleet security",
            description:
              "End-to-end encryption on all links, secure boot, ground SOC with 24/7 monitoring, fleet-wide anomaly detection, secure key management, NIS2 Art. 23 incident response.",
            impact: {
              cybersecurity: 25,
              nis2: 20,
              authorization: 10,
              supervision: 10,
            },
            feedback:
              "Comprehensive. Defence-in-depth is essential where compromise of one satellite could cascade through ISLs. The 24/7 SOC ensures NIS2 Art. 23 timelines can be met.",
          },
          {
            id: "d4-b",
            label: "Standard satellite cybersecurity",
            description: "Encrypted TT&C, access control, basic monitoring.",
            impact: { cybersecurity: 5, nis2: -5, authorization: 0 },
            feedback:
              "Insufficient. Standard measures do not address ISL security or fleet-wide attack propagation. NIS2 Art. 21(2) requires risk analysis proportionate to system criticality.",
          },
          {
            id: "d4-c",
            label: "Outsource to managed security provider",
            description: "Contract an MSSP for all cybersecurity operations.",
            impact: { cybersecurity: 10, nis2: 5, supervision: 0 },
            feedback:
              "Partially acceptable. NIS2 Art. 21(2)(d) addresses supply chain security. You remain responsible regardless of outsourcing. Ensure NIS2-aligned SLAs.",
          },
        ],
      },
      {
        id: "d5-environmental-constellation",
        title: "Environmental Footprint Declaration",
        description:
          "Art. 96-100 requires an environmental footprint declaration. For 100 satellites and multiple launches, how do you address this?",
        options: [
          {
            id: "d5-a",
            label: "Comprehensive lifecycle environmental assessment",
            description:
              "Cover manufacturing, launch emissions, orbital operations (spectrum, light pollution), and disposal. Publish per Art. 96-100.",
            impact: { environmental: 25, authorization: 10, supervision: 5 },
            feedback:
              "Best practice. A constellation lifecycle assessment addresses the full environmental footprint including launch emissions, orbital light pollution impact on astronomy, and re-entry debris.",
          },
          {
            id: "d5-b",
            label: "Per-satellite environmental declaration",
            description:
              "Submit individual declarations for each satellite design.",
            impact: { environmental: 5, authorization: 0 },
            feedback:
              "Insufficient. Art. 96-100 requires operators to address total environmental impact. Aggregate impact from 100 satellites significantly exceeds individual declarations.",
          },
          {
            id: "d5-c",
            label: "Minimal environmental compliance",
            description:
              "Submit minimum required data without detailed analysis.",
            impact: { environmental: -5, authorization: -5, supervision: -5 },
            feedback:
              "Risky. Large constellations attract public scrutiny. Inadequate assessment may trigger additional NCA conditions or public objections.",
          },
        ],
      },
    ],
    passingScore: 65,
    perfectScore: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 6. NIS2 Incident Response — INTERMEDIATE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-nis2-incident",
    title: "NIS2 Incident Response",
    description:
      "Your ground segment detects unauthorized TT&C access. Navigate NIS2 (EU 2022/2555) incident response: 24-hour early warning, 72-hour notification, and 1-month final report under Art. 23.",
    difficulty: "INTERMEDIATE",
    category: "NIS2",
    estimatedMinutes: 20,
    icon: "ShieldAlert",
    tags: ["nis2", "incident-response", "cybersecurity", "reporting"],
    operatorProfile: {
      activityType: "spacecraft",
      entitySize: "large",
      establishment: "eu",
    },
    decisions: [
      {
        id: "d1-initial-response",
        title: "Immediate Incident Response",
        description:
          "At 14:30 UTC you detect unauthorized TT&C commands. The satellite has executed an unexpected attitude manoeuvre. Your SOC confirms this is not operator error. What is your immediate response?",
        options: [
          {
            id: "d1-a",
            label: "Isolate, contain, and activate incident response",
            description:
              "Isolate the affected TT&C channel, switch to backup commanding, activate IRT, preserve forensic evidence.",
            impact: { cybersecurity: 25, nis2: 15, supervision: 10 },
            feedback:
              "Correct. Containment is priority one. Isolating the compromised channel prevents further unauthorized commands. Evidence preservation is critical for forensic analysis and the NIS2 final report.",
          },
          {
            id: "d1-b",
            label: "Investigate first",
            description:
              "Analyze what happened before taking containment actions.",
            impact: { cybersecurity: -10, nis2: -5, supervision: -5 },
            feedback:
              "Dangerous delay. An attacker with active satellite commanding access could cause catastrophic consequences. NIS2 Art. 21(2)(b) requires procedures prioritizing containment.",
          },
          {
            id: "d1-c",
            label: "Report to management and await instructions",
            description:
              "Escalate to CISO and CEO before taking technical actions.",
            impact: { cybersecurity: -15, nis2: -10, supervision: 0 },
            feedback:
              "Unacceptable delay. Your incident response plan should pre-authorize SOC operators to take immediate containment actions for active compromises.",
          },
        ],
      },
      {
        id: "d2-early-warning",
        title: "24-Hour Early Warning (Art. 23(4)(a))",
        description:
          "NIS2 Art. 23(4)(a) requires an early warning to the CSIRT within 24 hours. It is now 16:00 UTC. What do you report?",
        options: [
          {
            id: "d2-a",
            label: "Submit early warning with known facts",
            description:
              "File with CSIRT: unauthorized TT&C access detected, one satellite affected, containment enacted, suspected cyber-attack, assessment ongoing, potential cross-border impact flagged.",
            impact: { nis2: 25, supervision: 20, cybersecurity: 10 },
            feedback:
              "Correct. Art. 23(4)(a) requires indication of whether the incident is suspected unlawful/malicious and whether it could have cross-border impact. Complete analysis is not needed at this stage.",
          },
          {
            id: "d2-b",
            label: "Wait for complete analysis",
            description: "Delay until forensic analysis is complete.",
            impact: { nis2: -20, supervision: -15, cybersecurity: 0 },
            feedback:
              "Violation of Art. 23(4)(a). The 24-hour early warning is mandatory and explicitly designed as an early alert. Complete analysis belongs in the 72-hour and 1-month reports.",
          },
          {
            id: "d2-c",
            label: "Report only to the NCA, not the CSIRT",
            description:
              "Notify the space sector NCA through your regular supervisory channel.",
            impact: { nis2: -10, supervision: 5, cybersecurity: 0 },
            feedback:
              "Incomplete. NIS2 Art. 23 requires notification to the CSIRT. While informing the NCA is prudent, the CSIRT early warning is a separate mandatory requirement.",
          },
        ],
      },
      {
        id: "d3-72h-notification",
        title: "72-Hour Notification (Art. 23(4)(b))",
        description:
          "What do you include in the 72-hour incident notification?",
        options: [
          {
            id: "d3-a",
            label: "Comprehensive 72-hour notification",
            description:
              "Include severity and impact assessment, affected systems, number of users impacted, containment measures, preliminary root cause, IoCs, and cross-border degradation.",
            impact: { nis2: 25, supervision: 15, cybersecurity: 15 },
            feedback:
              "Correct. Art. 23(4)(b) requires an update with severity/impact assessment, indicators of compromise, and measures taken.",
          },
          {
            id: "d3-b",
            label: "Brief status update",
            description:
              "Short update: investigation ongoing, containment maintained.",
            impact: { nis2: -5, supervision: 0, cybersecurity: 0 },
            feedback:
              "Insufficient. The 72-hour notification must substantially update the early warning with initial assessment, IoCs, and measures taken.",
          },
          {
            id: "d3-c",
            label: "Detailed technical report only",
            description:
              "Deep forensic report on attack vectors and vulnerabilities.",
            impact: { nis2: 10, supervision: 5, cybersecurity: 10 },
            feedback:
              "Too narrow. The notification should also cover impact assessment, business continuity measures, and cross-border implications alongside technical details.",
          },
        ],
      },
      {
        id: "d4-remediation",
        title: "Remediation",
        description:
          "Forensics reveals the attacker exploited a known vulnerability with an available patch. How do you proceed?",
        options: [
          {
            id: "d4-a",
            label: "Comprehensive remediation programme",
            description:
              "Patch all ground stations, fleet-wide security audit, additional monitoring, updated patch management procedures, board briefing per NIS2 Art. 20.",
            impact: {
              cybersecurity: 25,
              nis2: 15,
              supervision: 10,
              authorization: 5,
            },
            feedback:
              "Correct. Addresses immediate vulnerability and systemic weakness (inadequate patch management). Board briefing satisfies NIS2 Art. 20 management accountability.",
          },
          {
            id: "d4-b",
            label: "Patch the specific vulnerability only",
            description:
              "Apply the patch to the affected ground station and resume operations.",
            impact: { cybersecurity: 0, nis2: -5, supervision: -5 },
            feedback:
              "Insufficient. NIS2 Art. 21(2)(e) requires vulnerability handling procedures. If one station was unpatched, others likely are too.",
          },
          {
            id: "d4-c",
            label: "Replace the vulnerable software entirely",
            description:
              "Migrate to a different ground station software platform.",
            impact: { cybersecurity: 10, nis2: 5, supervision: -5 },
            feedback:
              "Disproportionate short-term response. Priority is patching, securing all systems, and restoring operations. Platform migration should be planned carefully, not executed reactively.",
          },
        ],
      },
      {
        id: "d5-final-report",
        title: "1-Month Final Report (Art. 23(4)(d))",
        description: "What does your final report include?",
        options: [
          {
            id: "d5-a",
            label: "Comprehensive final incident report",
            description:
              "Root cause analysis, complete timeline, attack vectors, impact assessment, remediation actions, lessons learned, preventive measures, and IoCs for community sharing.",
            impact: { nis2: 25, supervision: 20, cybersecurity: 15 },
            feedback:
              "Excellent. Art. 23(4)(d) requires detailed description, root cause, mitigation measures, and cross-border impact. Sharing IoCs supports the broader cybersecurity community.",
          },
          {
            id: "d5-b",
            label: "Summary report with key findings",
            description:
              "Brief executive summary of outcome and remediation status.",
            impact: { nis2: -5, supervision: -5, cybersecurity: 0 },
            feedback:
              "Insufficient. Art. 23(4)(d) requires a detailed final report including comprehensive root cause analysis, impact assessment, and prevention measures.",
          },
          {
            id: "d5-c",
            label: "Request deadline extension",
            description: "Request additional time beyond one month.",
            impact: { nis2: 5, supervision: 5, cybersecurity: 5 },
            feedback:
              "Permissible under Art. 23(4)(d) if investigation is genuinely ongoing. An intermediate status report can be submitted at the deadline. Most satellite incidents should be analyzable within one month.",
          },
        ],
      },
    ],
    passingScore: 60,
    perfectScore: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 7. Multi-Jurisdiction Filing — EXPERT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-multi-jurisdiction",
    title: "Multi-Jurisdiction Filing",
    description:
      "You head regulatory affairs for a large EU launch operator with launches from French Guiana (Kourou), manufacturing in Germany, and subsidiaries in Luxembourg and the Netherlands. Navigate multi-jurisdiction compliance across the EU Space Act, French LOS, and national space laws.",
    difficulty: "EXPERT",
    category: "NATIONAL_SPACE_LAW",
    estimatedMinutes: 30,
    icon: "Scale",
    tags: [
      "multi-jurisdiction",
      "national-law",
      "france",
      "germany",
      "luxembourg",
    ],
    operatorProfile: {
      activityType: "launch_vehicle",
      entitySize: "large",
      establishment: "eu",
    },
    decisions: [
      {
        id: "d1-primary-nca",
        title: "Primary NCA Determination",
        description:
          "Operations span four jurisdictions. Which NCA is your primary authority under Art. 11?",
        options: [
          {
            id: "d1-a",
            label: "France (CNES) based on launch location",
            description: "Apply to CNES because Kourou is the launch site.",
            impact: { authorization: 10, supervision: 5 },
            feedback:
              "Partially correct only if your parent is established in France. Art. 11 bases jurisdiction on operator establishment, not location of activities.",
          },
          {
            id: "d1-b",
            label: "Determined by corporate headquarters location",
            description:
              "Identify the Member State of your registered office and apply to that NCA.",
            impact: { authorization: 25, supervision: 15, registration: 10 },
            feedback:
              "Correct. Art. 11 bases NCA jurisdiction on establishment. The primary authorization flows through the headquarters NCA, which coordinates with other Member States.",
          },
          {
            id: "d1-c",
            label: "Apply to all four NCAs simultaneously",
            description:
              "Submit applications to France, Germany, Luxembourg, and the Netherlands.",
            impact: { authorization: -10, supervision: -10 },
            feedback:
              "Incorrect. The EU Space Act's single-window principle means one NCA is primary. Multiple applications create jurisdictional confusion.",
          },
        ],
      },
      {
        id: "d2-national-overlay",
        title: "National Space Law Compliance",
        description:
          "National space laws continue to apply during transition and for non-harmonized matters. How do you manage compliance with the French LOS, German law, and Luxembourg/Dutch space laws?",
        options: [
          {
            id: "d2-a",
            label: "EU Space Act compliance only",
            description:
              "Focus exclusively on EU compliance, assuming it supersedes national laws.",
            impact: { authorization: -15, supervision: -10, insurance: -5 },
            feedback:
              "Incorrect. The EU Space Act harmonizes but does not immediately eliminate national requirements. France's LOS has specific CNES technical regulations, Germany has satellite data security rules, Luxembourg has the Space Resources Act.",
          },
          {
            id: "d2-b",
            label: "Integrated multi-jurisdiction compliance matrix",
            description:
              "Map requirements across all applicable laws. Identify where EU harmonization replaces national requirements and where national obligations persist.",
            impact: {
              authorization: 25,
              supervision: 20,
              insurance: 10,
              registration: 10,
            },
            feedback:
              "Excellent. Key national specificities: French CNES technical regulation and financial guarantee requirements, German BfV data security conditions, Luxembourg space resources provisions, and Dutch insurance thresholds.",
          },
          {
            id: "d2-c",
            label: "Comply with the strictest jurisdiction",
            description:
              "Apply the strictest requirements across all jurisdictions universally.",
            impact: { authorization: 10, supervision: 5, insurance: 5 },
            feedback:
              "Conservative but potentially over-burdensome. A nuanced approach meeting each jurisdiction's specific requirements is more efficient, but this at least ensures compliance.",
          },
        ],
      },
      {
        id: "d3-liability-multi",
        title: "Cross-Border Liability and Insurance",
        description:
          "Launch from Kourou serving customers from multiple EU states creates complex liability chains. How do you structure coverage?",
        options: [
          {
            id: "d3-a",
            label: "Unified EU liability and insurance programme",
            description:
              "Comprehensive programme satisfying Art. 44-51, French LOS Art. 6 financial guarantees, and applicable national thresholds with cross-border endorsements.",
            impact: { insurance: 25, authorization: 15, supervision: 10 },
            feedback:
              "Optimal. A unified programme avoids coverage gaps. French LOS Art. 6 requires specific guarantees for launch from French territory. Meeting the highest threshold with cross-border endorsements satisfies all jurisdictions.",
          },
          {
            id: "d3-b",
            label: "Separate insurance per jurisdiction",
            description: "Purchase separate policies for each jurisdiction.",
            impact: { insurance: 5, authorization: 0 },
            feedback:
              "Unnecessarily complex with potential coverage gaps or overlaps. Separate policies may have conflicting terms.",
          },
          {
            id: "d3-c",
            label: "State guarantee arrangement",
            description:
              "Negotiate a state guarantee with France to cap operator liability.",
            impact: { insurance: 15, authorization: 10 },
            feedback:
              "Partially relevant. French LOS provides a state guarantee mechanism above EUR 60M for launch. But you still need primary insurance up to the cap.",
          },
        ],
      },
      {
        id: "d4-data-sovereignty",
        title: "Data and Export Controls",
        description:
          "You generate EO data and use encryption. German SatDSiG and EU dual-use controls apply. How do you manage data compliance?",
        options: [
          {
            id: "d4-a",
            label: "Comprehensive data governance programme",
            description:
              "Data classification, German SatDSiG compliance for satellite imagery, EU dual-use regulation (2021/821) for encryption, and GDPR for personal data.",
            impact: { authorization: 20, cybersecurity: 15, supervision: 10 },
            feedback:
              "Correct. Multi-jurisdiction operators face overlapping data governance: SatDSiG security checks for high-res EO data, dual-use controls for encryption exports, and GDPR.",
          },
          {
            id: "d4-b",
            label: "EU Space Act data requirements only",
            description: "Address only data requirements in the EU Space Act.",
            impact: { authorization: -5, cybersecurity: -10, supervision: -5 },
            feedback:
              "Insufficient. The EU Space Act does not fully harmonize data governance. National laws like SatDSiG and export controls under Regulation 2021/821 apply independently.",
          },
          {
            id: "d4-c",
            label: "Restrict data distribution",
            description: "Limit distribution to avoid triggering regulations.",
            impact: { authorization: 0, cybersecurity: 5, supervision: 0 },
            feedback:
              "Impractical and commercially damaging. Obligations often apply at collection/processing, not just distribution. Build compliant data handling by design.",
          },
        ],
      },
    ],
    passingScore: 70,
    perfectScore: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 8. ISOS Provider Authorization — INTERMEDIATE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-isos-provider",
    title: "ISOS Provider Authorization",
    description:
      "You are CEO of a medium-sized EU company providing In-Space Operations and Services (ISOS): active debris removal (ADR) and satellite servicing. Navigate unique authorization requirements for proximity operations under Art. 2.",
    difficulty: "INTERMEDIATE",
    category: "EU_SPACE_ACT",
    estimatedMinutes: 20,
    icon: "Wrench",
    tags: ["isos", "adr", "servicing", "proximity-operations"],
    operatorProfile: {
      activityType: "isos",
      entitySize: "medium",
      establishment: "eu",
    },
    decisions: [
      {
        id: "d1-isos-classification",
        title: "ISOS Operator Classification",
        description:
          "Your company performs ADR and satellite servicing. Under Art. 2, ISOS is one of seven operator categories. How do you classify?",
        options: [
          {
            id: "d1-a",
            label: "Classify as Spacecraft Operator (SCO)",
            description: "Apply as standard SCO since you operate satellites.",
            impact: { authorization: -10, supervision: -5, debris: -5 },
            feedback:
              "Incorrect. The EU Space Act distinguishes ISOS from SCO because proximity operations involve unique risks not covered by standard SCO requirements.",
          },
          {
            id: "d1-b",
            label: "Classify as ISOS with activity-specific authorizations",
            description:
              "Apply under ISOS per Art. 2 with specific requests for ADR and servicing including proximity operations safety cases.",
            impact: {
              authorization: 25,
              supervision: 15,
              debris: 20,
              insurance: 10,
            },
            feedback:
              "Correct. ISOS classification triggers requirements for proximity operations safety, consent frameworks for cooperative servicing, liability allocation, and enhanced debris plans.",
          },
          {
            id: "d1-c",
            label: "Classify as both SCO and ISOS",
            description: "Apply under dual classification.",
            impact: { authorization: 5, supervision: 0 },
            feedback:
              "Unnecessary. ISOS encompasses spacecraft operation for in-space services. The NCA assesses under the ISOS framework which includes relevant SCO requirements.",
          },
        ],
      },
      {
        id: "d2-proximity-safety",
        title: "Proximity Operations Safety Case",
        description:
          "ADR requires non-cooperative rendezvous with uncontrolled debris. What do you include in the safety case?",
        options: [
          {
            id: "d2-a",
            label: "Comprehensive proximity operations safety case",
            description:
              "Approach trajectory design and abort capability, collision risk quantification per phase, sensor/GNC performance margins, capture mechanism failure modes, post-capture deorbit plan, and contingency procedures.",
            impact: {
              authorization: 25,
              debris: 20,
              insurance: 10,
              supervision: 10,
            },
            feedback:
              "Excellent. Non-cooperative rendezvous with tumbling debris is the highest-risk phase. The NCA needs collision probability, abort capability, and failure mode consequences quantified at each mission phase.",
          },
          {
            id: "d2-b",
            label: "Standard satellite mission safety analysis",
            description:
              "Conventional analysis covering launch, orbit insertion, and decommissioning.",
            impact: { authorization: -15, debris: -10, insurance: -5 },
            feedback:
              "Fundamentally inadequate. Standard analysis does not cover proximity operations risks. The NCA will reject this.",
          },
          {
            id: "d2-c",
            label: "Reference heritage missions",
            description:
              "Reference successful demonstrations by other ADR companies.",
            impact: { authorization: 0, debris: 0 },
            feedback:
              "Insufficient as standalone evidence. The NCA requires a mission-specific safety case for your spacecraft, target objects, and operational concept.",
          },
        ],
      },
      {
        id: "d3-isos-liability",
        title: "ISOS Liability Allocation",
        description:
          "For cooperative servicing, you interact with client satellites. Art. 44-51 applies but creates unique liability questions. How do you address this?",
        options: [
          {
            id: "d3-a",
            label: "Clear contractual liability framework",
            description:
              "Detailed service contracts specifying liability per mission phase, cross-waivers, insurance requirements for both parties, and damage assessment procedures aligned with Art. 44-51.",
            impact: { insurance: 25, authorization: 15, supervision: 10 },
            feedback:
              "Best practice. Clear contractual allocation provides certainty for both parties and their insurers. Cross-waivers are standard for cooperative missions.",
          },
          {
            id: "d3-b",
            label: "Assume full liability",
            description:
              "Accept complete liability for all servicing outcomes.",
            impact: { insurance: 5, authorization: 5, supervision: 0 },
            feedback:
              "Commercially and legally risky. Excessive exposure for damage you did not cause. Balanced allocation is more appropriate and insurable.",
          },
          {
            id: "d3-c",
            label: "Rely on statutory defaults",
            description: "Do not address liability contractually.",
            impact: { insurance: -10, authorization: -5, supervision: -5 },
            feedback:
              "Dangerous. The statutory framework was designed for independent activities, not multi-party proximity operations. Insurance underwriters will require contractual clarity.",
          },
        ],
      },
      {
        id: "d4-isos-debris",
        title: "ISOS-Specific Debris Mitigation",
        description:
          "Your ADR missions intentionally interact with debris. How do you frame your debris mitigation plan?",
        options: [
          {
            id: "d4-a",
            label: "ADR-specific debris mitigation plan",
            description:
              "Cover servicer disposal, target debris removal, fragmentation risk during capture, secondary debris prevention, and net environmental benefit calculation.",
            impact: { debris: 25, environmental: 15, authorization: 15 },
            feedback:
              "Excellent. Your mission improves the orbital environment. Demonstrating net positive impact while addressing mission risks strengthens your authorization case significantly.",
          },
          {
            id: "d4-b",
            label: "Standard plan for servicer only",
            description: "Cover only your servicer satellite's disposal.",
            impact: { debris: 5, environmental: 0, authorization: -5 },
            feedback:
              "Incomplete. For ADR, the plan must cover both servicer and target object. The NCA needs to assess the entire mission's debris impact.",
          },
          {
            id: "d4-c",
            label: "Argue ADR is inherently debris mitigation",
            description:
              "Claim ADR missions should be exempt from debris requirements.",
            impact: { debris: -10, environmental: -5, authorization: -10 },
            feedback:
              "Incorrect. The EU Space Act does not exempt ISOS operators. Your mission introduces new objects and creates fragmentation risk. No exemption exists.",
          },
        ],
      },
    ],
    passingScore: 65,
    perfectScore: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 9. Debris Compliance Crisis — ADVANCED
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-debris-crisis",
    title: "Debris Compliance Crisis",
    description:
      "Your satellite at 750 km has suffered a propulsion failure. Without propulsion, active deorbit per your Art. 58-62 plan is impossible. Natural decay at 750 km takes 100+ years. Navigate this debris compliance crisis including NCA disclosure, remediation options, and passivation under Art. 63-65.",
    difficulty: "ADVANCED",
    category: "EU_SPACE_ACT",
    estimatedMinutes: 20,
    icon: "AlertTriangle",
    tags: ["debris", "failure", "end-of-life", "compliance-crisis"],
    operatorProfile: {
      activityType: "spacecraft",
      entitySize: "medium",
      establishment: "eu",
      primaryOrbit: "LEO",
      hasPostLaunchAssets: true,
    },
    decisions: [
      {
        id: "d1-disclosure",
        title: "Incident Disclosure",
        description:
          "Your propulsion system has failed. Under Art. 26-31, when do you inform the NCA?",
        options: [
          {
            id: "d1-a",
            label: "Immediate proactive disclosure",
            description:
              "Notify the NCA immediately about the failure, implications for end-of-life compliance, and timeline for a remediation plan.",
            impact: { supervision: 25, debris: 10, authorization: 10 },
            feedback:
              "Correct. Art. 26-31 requires operators to inform the NCA of material changes. A propulsion failure preventing authorized debris mitigation is clearly material. Early disclosure may prevent enforcement action.",
          },
          {
            id: "d1-b",
            label: "Attempt repair first, then disclose if unsuccessful",
            description:
              "Spend weeks trying to recover propulsion before notifying the NCA.",
            impact: { supervision: -15, debris: -5, authorization: -10 },
            feedback:
              "Non-compliant delay. You can troubleshoot while simultaneously notifying. If the NCA discovers the failure through SST data, delayed disclosure severely damages your relationship.",
          },
          {
            id: "d1-c",
            label: "Report during the next regular supervisory submission",
            description: "Include it in your next scheduled compliance report.",
            impact: { supervision: -10, debris: -5, authorization: -5 },
            feedback:
              "Inadequate timing. A propulsion failure preventing debris compliance is exceptional and requires immediate notification.",
          },
        ],
      },
      {
        id: "d2-remediation-options",
        title: "Debris Remediation Assessment",
        description:
          "Your satellite cannot actively deorbit. What remediation options do you present to the NCA?",
        options: [
          {
            id: "d2-a",
            label: "Comprehensive remediation assessment",
            description:
              "Evaluate: (1) continued propulsion troubleshooting, (2) non-propulsive options (drag augmentation), (3) contract an ADR provider for assisted removal, (4) passivation as interim measure. Present ranked analysis with cost, timeline, and success probability.",
            impact: {
              debris: 25,
              supervision: 20,
              authorization: 10,
              environmental: 10,
            },
            feedback:
              "Excellent. Comprehensive options analysis demonstrates proactive responsibility. ADR contracting is increasingly viable. Passivation is the minimum interim measure. Presenting all options with honest assessment builds regulatory trust.",
          },
          {
            id: "d2-b",
            label: "Accept the satellite as long-lived debris",
            description:
              "Inform the NCA that deorbit is impossible and the satellite will persist.",
            impact: {
              debris: -15,
              supervision: -10,
              authorization: -10,
              environmental: -10,
            },
            feedback:
              "Unacceptable. The NCA will require you to demonstrate that all reasonable removal options are exhausted before accepting 100+ year orbital persistence. May trigger enforcement under Art. 105-108.",
          },
          {
            id: "d2-c",
            label: "Focus solely on ADR contracting",
            description: "Contract an ADR provider to remove the satellite.",
            impact: { debris: 15, supervision: 10, authorization: 5 },
            feedback:
              "Good but narrow. ADR services have lead times of years. Interim measures (passivation, drag augmentation) should proceed in parallel.",
          },
        ],
      },
      {
        id: "d3-passivation",
        title: "Interim Passivation (Art. 63-65)",
        description:
          "While pursuing removal, Art. 63-65 requires passivation. What measures do you take?",
        options: [
          {
            id: "d3-a",
            label: "Full passivation protocol",
            description:
              "Vent all propellant, discharge batteries, de-spin wheels, disable high-voltage systems, orient solar arrays edge-on. Document everything for the NCA.",
            impact: { debris: 25, environmental: 15, supervision: 10 },
            feedback:
              "Correct. Full passivation per Art. 63-65 and IADC guidelines minimizes accidental fragmentation from stored energy. Propulsion system explosions are a major debris source.",
          },
          {
            id: "d3-b",
            label: "Partial passivation, keep some systems active",
            description:
              "Passivate propulsion but maintain power and attitude control for recovery.",
            impact: { debris: 5, environmental: 0, supervision: 0 },
            feedback:
              "Risky trade-off. Maintaining active systems preserves recovery optionality but also preserves stored energy creating fragmentation risk. Must be time-limited and agreed with NCA.",
          },
          {
            id: "d3-c",
            label: "No passivation, maintain full operations",
            description:
              "Keep the satellite operational to extract remaining mission value.",
            impact: {
              debris: -20,
              environmental: -10,
              supervision: -15,
              authorization: -10,
            },
            feedback:
              "Non-compliant. Continuing full operations with stored energy represents ongoing fragmentation risk. The NCA may issue a directive requiring passivation.",
          },
        ],
      },
      {
        id: "d4-lessons-learned",
        title: "Lessons Learned and Fleet Impact",
        description:
          "This incident has broader implications. How do you address systemic issues?",
        options: [
          {
            id: "d4-a",
            label: "Comprehensive fleet review and design improvements",
            description:
              "Fleet-wide propulsion reliability review, redundant deorbit capability on future satellites, updated debris plans for single-point failures, and share lessons with NCA and industry.",
            impact: {
              debris: 20,
              authorization: 15,
              supervision: 15,
              environmental: 10,
            },
            feedback:
              "Best practice. Redundant deorbit capability (e.g., backup propulsion, drag sail) addresses the single-point failure. Sharing lessons builds trust and contributes to industry practice.",
          },
          {
            id: "d4-b",
            label: "Address the specific satellite only",
            description:
              "Focus remediation on the failed satellite without fleet implications.",
            impact: { debris: 0, authorization: -5, supervision: -5 },
            feedback:
              "Short-sighted. If the failure is due to a design flaw, other satellites may be at risk. The NCA will ask about fleet implications. Art. 15 obligations include maintaining compliance across all operations.",
          },
          {
            id: "d4-c",
            label: "File insurance claim and move on",
            description: "Claim total loss and proceed to the next mission.",
            impact: {
              debris: -10,
              insurance: 5,
              authorization: -10,
              supervision: -10,
            },
            feedback:
              "Insurance does not satisfy debris obligations. The satellite remains in orbit regardless of insurance status. The NCA requires a remediation plan, not just financial recovery.",
          },
        ],
      },
    ],
    passingScore: 65,
    perfectScore: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 10. Full Lifecycle Compliance — EXPERT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "sim-full-lifecycle",
    title: "Full Lifecycle Compliance",
    description:
      "As Chief Compliance Officer, guide a new satellite programme from concept through end-of-life: pre-authorization (Art. 11-12), authorization (Art. 13-14), ongoing obligations (Art. 15), supervision (Art. 26-31), debris (Art. 58-62), cybersecurity (Art. 74), insurance (Art. 44-51), and registration (Art. 24).",
    difficulty: "EXPERT",
    category: "EU_SPACE_ACT",
    estimatedMinutes: 30,
    icon: "Route",
    tags: [
      "lifecycle",
      "comprehensive",
      "authorization",
      "debris",
      "cybersecurity",
    ],
    operatorProfile: {
      activityType: "spacecraft",
      entitySize: "large",
      establishment: "eu",
      primaryOrbit: "LEO",
    },
    decisions: [
      {
        id: "d1-concept-phase",
        title: "Mission Concept Phase",
        description:
          "You are defining a new LEO communications satellite programme. When do you engage with EU Space Act compliance?",
        options: [
          {
            id: "d1-a",
            label: "Compliance integration from Phase 0/A",
            description:
              "Embed compliance in mission concept. Identify requirements, consult with NCA, ensure design incorporates debris mitigation, cybersecurity, and passivation from earliest decisions.",
            impact: {
              authorization: 25,
              debris: 20,
              cybersecurity: 15,
              environmental: 10,
              insurance: 10,
            },
            feedback:
              "Optimal. Compliance-by-design ensures requirements are embedded from the outset. Key decisions (propulsion for deorbit, cybersecurity architecture, passivation) must be made in Phase 0/A.",
          },
          {
            id: "d1-b",
            label: "Begin after preliminary design review",
            description: "Start regulatory engagement after PDR.",
            impact: { authorization: -5, debris: -10, cybersecurity: -10 },
            feedback:
              "Too late. By PDR, fundamental design decisions are locked. Retrofitting debris mitigation or cybersecurity architecture is expensive and sometimes impossible.",
          },
          {
            id: "d1-c",
            label: "Compliance as a pre-launch activity",
            description:
              "Treat compliance as documentation completed before launch.",
            impact: {
              authorization: -20,
              debris: -15,
              cybersecurity: -15,
              insurance: -10,
            },
            feedback:
              "Fundamentally wrong. The EU Space Act requires substantive design and operational measures, not paperwork. A satellite designed without considering Art. 58-62 or Art. 74 may have unfixable deficiencies.",
          },
        ],
      },
      {
        id: "d2-authorization-phase",
        title: "Authorization Application",
        description:
          "Your satellite passed CDR. What does the complete Art. 11-12 package include?",
        options: [
          {
            id: "d2-a",
            label: "Comprehensive Art. 11-12 authorization package",
            description:
              "Operator identification, technical dossier, debris plan (Art. 58-62), cybersecurity assessment (Art. 74), insurance certificates (Art. 44-51), environmental declaration (Art. 96-100), registration data (Art. 24), and financial standing evidence.",
            impact: {
              authorization: 25,
              registration: 15,
              debris: 15,
              cybersecurity: 15,
              insurance: 15,
              environmental: 10,
            },
            feedback:
              "Complete. Each element maps to specific obligations. Submitting a complete package minimizes processing time.",
          },
          {
            id: "d2-b",
            label: "Phased submission starting with technical dossier",
            description:
              "Submit technical dossier first, add supporting documents on request.",
            impact: {
              authorization: 0,
              registration: -5,
              debris: -5,
              cybersecurity: -5,
            },
            feedback:
              "Inefficient. Each supplementary request restarts assessment clocks. Most NCAs prefer complete packages.",
          },
          {
            id: "d2-c",
            label: "Minimum viable application",
            description:
              "Submit only mandatory documentation and negotiate during assessment.",
            impact: { authorization: -10, supervision: -5, registration: -5 },
            feedback:
              "Counterproductive. A minimal application invites scrutiny. For a large operator, regulatory maturity is expected.",
          },
        ],
      },
      {
        id: "d3-operational-phase",
        title: "Operational Phase Compliance",
        description:
          "Your satellite is operational. What compliance programme do you maintain per Art. 15?",
        options: [
          {
            id: "d3-a",
            label: "Integrated operational compliance programme",
            description:
              "Continuous conjunction assessment, cybersecurity monitoring and NIS2 readiness, insurance renewal tracking, NCA reporting, anomaly notification procedures, SST data sharing (Art. 52-57), and periodic self-assessment.",
            impact: {
              supervision: 25,
              debris: 20,
              cybersecurity: 20,
              insurance: 15,
              nis2: 15,
            },
            feedback:
              "Comprehensive. Covers all Art. 15 dimensions: conjunction assessment for safety, cybersecurity for Art. 74/NIS2, insurance continuity, NCA reporting, and SST participation.",
          },
          {
            id: "d3-b",
            label: "Focus on mission operations only",
            description:
              "Focus resources on operations and revenue, address compliance reactively.",
            impact: {
              supervision: -15,
              debris: -10,
              cybersecurity: -10,
              insurance: -5,
            },
            feedback:
              "Non-compliant. Ongoing compliance is an explicit Art. 15 obligation. Compliance is part of operations, not separate from it.",
          },
          {
            id: "d3-c",
            label: "Annual compliance audit cycle",
            description: "Conduct annual audits to verify adherence.",
            impact: { supervision: 10, debris: 5, cybersecurity: 5 },
            feedback:
              "Necessary but not sufficient. Many obligations are continuous: conjunction assessment is daily, cybersecurity is 24/7, insurance must be valid at all times.",
          },
        ],
      },
      {
        id: "d4-modification",
        title: "Mid-Mission Orbit Change",
        description:
          "A customer requests orbit change from 600 km to 1200 km, altering debris and insurance profiles. How do you handle this?",
        options: [
          {
            id: "d4-a",
            label: "Authorization amendment before execution",
            description:
              "File amendment with NCA including updated debris plan (1200 km has millennia of natural decay), revised insurance, updated registration, and cybersecurity reassessment.",
            impact: {
              authorization: 25,
              debris: 20,
              insurance: 15,
              registration: 10,
              supervision: 10,
            },
            feedback:
              "Correct. At 1200 km, natural decay takes thousands of years, requiring active deorbit capability. The EU Space Act requires NCA approval for material changes to authorized operations.",
          },
          {
            id: "d4-b",
            label: "Execute orbit change, notify NCA afterwards",
            description:
              "Perform the raise and inform the NCA in the next report.",
            impact: {
              authorization: -20,
              debris: -15,
              insurance: -10,
              supervision: -15,
            },
            feedback:
              "Serious violation. Unauthorized operational changes may result in authorization suspension and penalties under Art. 105-108.",
          },
          {
            id: "d4-c",
            label: "Refuse the customer request",
            description: "Decline to avoid regulatory complications.",
            impact: { authorization: 10, debris: 5, supervision: 5 },
            feedback:
              "Unnecessarily restrictive. The EU Space Act does not prohibit orbit changes; it requires proper authorization amendment. Compliance and commercial flexibility can coexist.",
          },
        ],
      },
      {
        id: "d5-end-of-life",
        title: "End-of-Life Phase",
        description:
          "Your satellite has reached design life. Art. 58-62 and 63-65 govern end-of-life. What is your decommissioning plan?",
        options: [
          {
            id: "d5-a",
            label: "Comprehensive end-of-life compliance execution",
            description:
              "Active deorbit manoeuvre, passivation, final telemetry archiving, URSO registration update, NCA notification, and compliance closeout report.",
            impact: {
              debris: 25,
              environmental: 20,
              registration: 15,
              supervision: 15,
              authorization: 10,
            },
            feedback:
              "Complete. Active deorbit meets Art. 58-62, passivation complies with Art. 63-65, registration update fulfils Art. 24, and NCA notification meets Art. 15/26-31.",
          },
          {
            id: "d5-b",
            label: "Deorbit and passivation only",
            description:
              "Execute physical deorbit and passivation but skip administrative closure.",
            impact: {
              debris: 15,
              environmental: 10,
              registration: -5,
              supervision: -5,
            },
            feedback:
              "Technically effective but administratively incomplete. Registration update, NCA notification, and closeout documentation are required for clean regulatory closure.",
          },
          {
            id: "d5-c",
            label: "Extend mission life beyond design life",
            description:
              "Continue operating to maximize revenue, deferring end-of-life.",
            impact: {
              debris: -15,
              insurance: -10,
              supervision: -10,
              authorization: -5,
            },
            feedback:
              "Risky. Extended operations require NCA notification, updated debris assessment, insurance confirmation, and increased conjunction vigilance. Simply continuing without regulatory engagement violates Art. 15.",
          },
        ],
      },
      {
        id: "d6-closeout",
        title: "Regulatory Closeout",
        description:
          "Your satellite has successfully re-entered. What final steps complete the lifecycle?",
        options: [
          {
            id: "d6-a",
            label: "Full regulatory closeout",
            description:
              "Confirm re-entry with tracking data, update URSO to 'decayed', submit final compliance report, close insurance policies, archive records, request formal NCA closeout.",
            impact: {
              supervision: 20,
              registration: 20,
              insurance: 10,
              authorization: 15,
            },
            feedback:
              "Complete lifecycle closure. Re-entry confirmation, URSO update, final reporting, insurance closure, record archiving, and formal NCA closeout provide clean regulatory closure.",
          },
          {
            id: "d6-b",
            label: "Confirm re-entry only",
            description: "Verify re-entry and consider the mission complete.",
            impact: { supervision: 0, registration: -5, insurance: -5 },
            feedback:
              "Incomplete. URSO update, NCA reporting, insurance management, and record archiving remain outstanding.",
          },
          {
            id: "d6-c",
            label: "Let records age out naturally",
            description: "Allow records to expire through natural attrition.",
            impact: { supervision: -10, registration: -10, authorization: -10 },
            feedback:
              "Non-compliant. Regulatory records persist indefinitely. Failure to close out properly demonstrates poor practice and may complicate future authorization applications.",
          },
        ],
      },
    ],
    passingScore: 70,
    perfectScore: 100,
  },
];
