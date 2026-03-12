import type { FooterPageData } from "@/components/landing/FooterPageTemplate";

export const industryPages: FooterPageData[] = [
  {
    slug: "spacecraft-operators",
    title: "Spacecraft Operators",
    tagline:
      "Full-spectrum regulatory compliance for every phase of your orbital mission.",
    description:
      "Spacecraft operators face the densest regulatory burden under the EU Space Act: debris mitigation plans, cybersecurity posture assessments, mandatory insurance thresholds, and environmental impact obligations that evolve with each mission phase. Caelex maps your fleet against all applicable requirements in real time, from pre-launch authorization through end-of-life disposal. The platform continuously monitors compliance state across Articles 8-42 so your operations team can focus on the mission, not the paperwork.",
    features: [
      {
        title: "Debris Mitigation Tracking",
        description:
          "Automated compliance monitoring against COPUOS/IADC guidelines and EU Space Act debris provisions, including 25-year re-entry rules and passivation requirements.",
      },
      {
        title: "Cybersecurity Posture Management",
        description:
          "NIS2-aligned security controls mapped to your spacecraft systems, with continuous gap analysis and incident reporting workflows for essential and important entity classifications.",
      },
      {
        title: "Insurance & Liability Management",
        description:
          "Track third-party liability coverage against mandatory thresholds, manage policy renewals, and generate evidence packages for national competent authorities.",
      },
    ],
  },
  {
    slug: "launch-providers",
    title: "Launch Providers",
    tagline:
      "Streamline authorization workflows from safety analysis through launch clearance.",
    description:
      "Launch providers operate under some of the most time-sensitive regulatory regimes in the space sector. Each campaign requires coordinated authorization across safety analysis, environmental impact assessment, frequency coordination, and insurance certification. Caelex structures the entire authorization lifecycle into a single workflow, linking safety documentation to regulatory requirements and surfacing gaps before they become schedule risks.",
    features: [
      {
        title: "Authorization Workflow Engine",
        description:
          "State-machine-driven authorization pipelines that track every document, approval, and condition from initial application through launch clearance.",
      },
      {
        title: "Safety Analysis Integration",
        description:
          "Map flight safety analyses, blast danger area calculations, and casualty expectation assessments directly to EU Space Act and national licensing requirements.",
      },
      {
        title: "Environmental Impact Compliance",
        description:
          "Track emissions reporting, noise assessments, and ecological impact obligations across launch and re-entry operations with audit-ready evidence generation.",
      },
    ],
  },
  {
    slug: "launch-site-operators",
    title: "Launch Site Operators",
    tagline:
      "Facility-level compliance management for European spaceport operations.",
    description:
      "Spaceport operators must satisfy a distinct set of regulatory obligations that span facility licensing, ground safety management, environmental monitoring, and third-party access governance. The EU Space Act introduces harmonized requirements for launch site authorization that intersect with existing national regimes. Caelex provides a unified compliance view across all applicable frameworks, ensuring that facility operations remain authorized and audit-ready at all times.",
    features: [
      {
        title: "Facility Licensing Management",
        description:
          "Track site authorization status, license conditions, renewal deadlines, and modification approvals across multiple national and EU regulatory frameworks.",
      },
      {
        title: "Environmental Monitoring Compliance",
        description:
          "Manage continuous environmental obligations including groundwater monitoring, atmospheric emissions, noise abatement, and ecological preservation requirements.",
      },
      {
        title: "Ground Safety Systems",
        description:
          "Document and verify safety management systems, emergency response procedures, and exclusion zone protocols against regulatory baselines.",
      },
    ],
  },
  {
    slug: "in-space-service-operators",
    title: "In-Space Service Operators",
    tagline:
      "Regulatory clarity for the next generation of on-orbit operations.",
    description:
      "On-orbit servicing, active debris removal, and space logistics represent emerging operational categories where regulatory frameworks are still crystallizing. Operators in this domain face unique compliance challenges: proximity operations rules, debris ownership and liability questions, and cross-border authorization for missions that interact with third-party assets. Caelex tracks the evolving regulatory landscape and maps your specific mission profile against current and anticipated requirements.",
    features: [
      {
        title: "Proximity Operations Compliance",
        description:
          "Map rendezvous and proximity operation plans against emerging EU and national rules governing close-approach activities and physical contact with third-party objects.",
      },
      {
        title: "Debris Removal Authorization",
        description:
          "Track the regulatory pathway for active debris removal missions, including liability transfer provisions, object ownership verification, and de-orbit planning requirements.",
      },
      {
        title: "Cross-Border Mission Coordination",
        description:
          "Manage multi-jurisdictional authorization requirements when servicing missions involve operators, clients, or target objects registered under different national regimes.",
      },
    ],
  },
  {
    slug: "collision-avoidance-providers",
    title: "Collision Avoidance Providers",
    tagline:
      "Compliance infrastructure for conjunction assessment and space safety services.",
    description:
      "Collision avoidance service providers sit at the intersection of data obligations and operational safety under the EU Space Act. The regulation imposes specific requirements on conjunction assessment services, including data quality standards, sharing obligations with the EUSST and national authorities, and procedures for integration into the European Space Surveillance and Tracking Network. Caelex ensures your service operations meet every regulatory threshold while maintaining the data governance posture your clients require.",
    features: [
      {
        title: "EUSRN Procedure Management",
        description:
          "Track compliance with European Space Surveillance and Tracking Network data sharing procedures, reporting timelines, and format requirements.",
      },
      {
        title: "Data Quality Assurance",
        description:
          "Monitor and document data quality metrics against regulatory thresholds for conjunction data messages, screening volumes, and probability of collision calculations.",
      },
      {
        title: "Service-Level Compliance",
        description:
          "Map your conjunction assessment service agreements against EU Space Act obligations for timeliness, accuracy, and mandatory notification procedures.",
      },
    ],
  },
  {
    slug: "positional-data-providers",
    title: "Positional Data Providers",
    tagline:
      "Regulatory compliance for space surveillance and tracking data services.",
    description:
      "Positional data providers underpin the entire space safety ecosystem, and the EU Space Act places specific obligations on the quality, availability, and security of SST data services. Providers must meet data sharing requirements with authorized users, maintain cybersecurity controls proportionate to the criticality of their services, and comply with accuracy and timeliness standards. Caelex provides a compliance framework purpose-built for the unique regulatory position of SST service providers.",
    features: [
      {
        title: "Data Sharing Governance",
        description:
          "Manage and document data sharing agreements, authorized user access, and distribution controls in accordance with EU Space Act and EUSST framework requirements.",
      },
      {
        title: "Cybersecurity for SST Services",
        description:
          "Implement and track NIS2-aligned security controls specific to space surveillance infrastructure, including supply chain security and incident notification obligations.",
      },
      {
        title: "Accuracy & Timeliness Standards",
        description:
          "Monitor positional data quality against regulatory baselines, document calibration procedures, and generate compliance evidence for national competent authorities.",
      },
    ],
  },
  {
    slug: "third-country-operators",
    title: "Third Country Operators",
    tagline:
      "Navigate EU market access requirements from outside the European Union.",
    description:
      "Non-EU operators seeking to provide space services within European jurisdiction face a distinct regulatory pathway under the EU Space Act. The regulation establishes mutual recognition mechanisms, equivalence assessments, and market access conditions that third-country operators must satisfy. Caelex maps your existing authorizations against EU requirements, identifies regulatory gaps, and provides a structured pathway to market access without duplicating compliance work already completed in your home jurisdiction.",
    features: [
      {
        title: "Equivalence Gap Analysis",
        description:
          "Compare your home jurisdiction authorizations against EU Space Act requirements to identify specific gaps and avoid redundant compliance work.",
      },
      {
        title: "Mutual Recognition Tracking",
        description:
          "Monitor the status of bilateral and multilateral recognition agreements relevant to your operations and track their impact on your market access pathway.",
      },
      {
        title: "EU Market Access Workflow",
        description:
          "Structured application and documentation pipeline for third-country operator authorization, including liaison requirements with designated national competent authorities.",
      },
    ],
  },
  {
    slug: "space-agencies-government",
    title: "Space Agencies & Government",
    tagline:
      "Oversight and supervision tools for national competent authorities.",
    description:
      "National competent authorities and space agencies require comprehensive visibility into the compliance posture of operators under their supervision. The EU Space Act assigns NCAs significant responsibilities for authorization, ongoing supervision, and reporting to the European Commission. Caelex provides the supervisory infrastructure to manage operator portfolios at scale: real-time compliance dashboards, automated reporting, and structured communication workflows with regulated entities.",
    features: [
      {
        title: "Operator Portfolio Dashboard",
        description:
          "Aggregate compliance status across all supervised operators with real-time risk scoring, deadline tracking, and drill-down capability to individual authorization conditions.",
      },
      {
        title: "Regulatory Reporting Automation",
        description:
          "Generate structured reports for the European Commission, including operator statistics, enforcement actions, and compliance trend analysis across your supervised portfolio.",
      },
      {
        title: "Supervision Workflow Management",
        description:
          "Manage inspection schedules, correspondence with operators, condition monitoring, and enforcement escalation through structured digital workflows.",
      },
    ],
  },
  {
    slug: "defense-security",
    title: "Defense & Security",
    tagline:
      "Dual-use compliance and export control for classified space programs.",
    description:
      "Defense and security space programs operate under layered regulatory regimes that combine space law obligations with export control, dual-use technology restrictions, and classification requirements. ITAR, EAR, and EU dual-use regulations impose strict controls on technology transfer, foreign person access, and end-use monitoring. Caelex provides a secure compliance platform that maps these overlapping requirements and maintains the audit trail that defense programs demand.",
    features: [
      {
        title: "Export Control Management",
        description:
          "Track ITAR and EAR classification, license applications, technology transfer agreements, and end-use monitoring obligations across your program portfolio.",
      },
      {
        title: "Dual-Use Technology Compliance",
        description:
          "Map components and subsystems against EU dual-use regulation annexes, manage catch-all clause assessments, and document intra-EU transfer authorizations.",
      },
      {
        title: "Secure Operations Baseline",
        description:
          "Maintain compliance with information security requirements for classified space programs, including personnel clearance tracking, facility accreditation, and secure communications.",
      },
    ],
  },
  {
    slug: "legal-consulting",
    title: "Legal & Consulting",
    tagline: "Regulatory intelligence platform for space law practitioners.",
    description:
      "Space law firms and regulatory consultancies advise clients across multiple jurisdictions, operator types, and regulatory frameworks simultaneously. Staying current across the EU Space Act, 10+ national space laws, NIS2, export control regimes, and international treaty obligations is an operational challenge that scales with client count. Caelex provides the regulatory intelligence infrastructure that practitioners need: cross-referenced legal databases, automated gap analysis, and client-ready compliance reporting.",
    features: [
      {
        title: "Cross-Jurisdictional Analysis",
        description:
          "Compare regulatory requirements across 10 European jurisdictions simultaneously, with automated identification of favorability differences and harmonization gaps.",
      },
      {
        title: "Client Compliance Reporting",
        description:
          "Generate detailed, client-branded compliance assessments and gap analyses that map operator profiles against all applicable regulatory frameworks.",
      },
      {
        title: "Regulatory Change Monitoring",
        description:
          "Track legislative developments, delegated act publications, and national transposition progress across all relevant jurisdictions with automated impact assessment.",
      },
    ],
  },
];
