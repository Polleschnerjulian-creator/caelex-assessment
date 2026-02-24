/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary risk assessment templates and data
 * that represent significant research and development investment.
 *
 * Unauthorized reproduction, distribution, reverse-engineering, or use
 * of this data to build competing products or services is strictly prohibited
 * and may result in legal action.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface RiskTemplate {
  category:
    | "TECHNOLOGY"
    | "MARKET"
    | "REGULATORY"
    | "FINANCIAL"
    | "OPERATIONAL"
    | "COMPETITIVE"
    | "GEOPOLITICAL";
  title: string;
  description: string;
  defaultProbability: "VERY_LOW" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  defaultImpact:
    | "NEGLIGIBLE"
    | "MINOR"
    | "MODERATE_IMPACT"
    | "MAJOR"
    | "CATASTROPHIC";
  suggestedMitigation: string;
  timeHorizon: string;
  applicableStages: string[];
  applicableTypes: string[];
}

export const riskTemplates: RiskTemplate[] = [
  // ─── TECHNOLOGY RISKS ───
  {
    category: "TECHNOLOGY",
    title: "Launch vehicle failure",
    description:
      "Total or partial loss of payload due to launch vehicle anomaly during ascent, staging, or payload deployment. Includes both primary mission failure and degraded orbit insertion.",
    defaultProbability: "LOW",
    defaultImpact: "CATASTROPHIC",
    suggestedMitigation:
      "Secure launch insurance covering full replacement cost. Negotiate re-flight clauses in launch service agreements. Maintain flight-spare hardware where feasible. Diversify across multiple launch providers.",
    timeHorizon: "0-6 months post-launch commitment",
    applicableStages: ["Seed", "Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "LO"],
  },
  {
    category: "TECHNOLOGY",
    title: "On-orbit anomaly or premature end of life",
    description:
      "Spacecraft experiences critical subsystem failure (power, propulsion, ADCS, or communications) leading to reduced capability or total mission loss before planned end of life.",
    defaultProbability: "MODERATE",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Implement redundant subsystem architectures. Conduct comprehensive environmental testing (TVAC, vibration, EMC). Carry on-orbit spares in constellation designs. Establish anomaly resolution procedures and ground segment fallback modes.",
    timeHorizon: "Mission lifetime (1-15 years)",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO"],
  },
  {
    category: "TECHNOLOGY",
    title: "Technology readiness gap",
    description:
      "Core technology (e.g., novel propulsion, sensor, or antenna system) fails to mature from demonstrated TRL to flight-qualified TRL within planned schedule and budget, creating cascading delays.",
    defaultProbability: "HIGH",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Conduct independent TRL assessments at each gate review. Maintain fallback design options using heritage components. Allocate 20-30% schedule margin for technology maturation. Leverage ESA or national agency co-funded technology development programs.",
    timeHorizon: "12-36 months",
    applicableStages: ["Pre-Seed", "Seed", "Series A"],
    applicableTypes: [],
  },
  {
    category: "TECHNOLOGY",
    title: "Supply chain dependency on single-source components",
    description:
      "Critical spacecraft components (radiation-hardened processors, space-grade solar cells, reaction wheels) available from only one supplier, creating schedule and cost vulnerability.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Identify and qualify second-source alternatives for all critical components. Maintain strategic inventory of long-lead items. Design for component flexibility where possible. Engage with European component manufacturers through ESA's Component Technology Board.",
    timeHorizon: "6-24 months",
    applicableStages: ["Seed", "Series A", "Series B"],
    applicableTypes: ["SCO", "LO"],
  },
  {
    category: "TECHNOLOGY",
    title: "Cybersecurity breach of ground segment",
    description:
      "Unauthorized access to satellite command and control systems, telemetry data, or ground network infrastructure. Potential for unauthorized commanding, data exfiltration, or denial of service.",
    defaultProbability: "MODERATE",
    defaultImpact: "CATASTROPHIC",
    suggestedMitigation:
      "Implement end-to-end encryption for TT&C links. Conduct regular penetration testing of ground segment. Follow NIST SP 800-53 and ENISA space cybersecurity guidelines. Establish a SOC with 24/7 monitoring. Maintain incident response plan aligned with NIS2 requirements.",
    timeHorizon: "Ongoing",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "CAP", "PDP"],
  },
  {
    category: "TECHNOLOGY",
    title: "Software and firmware development delays",
    description:
      "On-board software, ground segment software, or data processing pipeline development exceeds planned timeline, blocking integration testing and launch readiness.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Adopt agile development with frequent integration milestones. Use hardware-in-the-loop simulation for early software validation. Establish clear interface control documents (ICDs). Consider COTS software for non-differentiating subsystems.",
    timeHorizon: "6-18 months",
    applicableStages: ["Pre-Seed", "Seed", "Series A"],
    applicableTypes: [],
  },
  {
    category: "TECHNOLOGY",
    title: "Orbital debris collision risk",
    description:
      "Increasing congestion in target orbital regime raises probability of conjunction events, requiring evasive maneuvers that consume propellant and reduce operational lifetime.",
    defaultProbability: "LOW",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Subscribe to enhanced conjunction assessment services (e.g., EUSST, 18SDS). Design spacecraft with propulsive collision avoidance capability. Include debris risk in insurance coverage. Implement automated conjunction screening and maneuver planning.",
    timeHorizon: "Mission lifetime",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "ISOS"],
  },

  // ─── MARKET RISKS ───
  {
    category: "MARKET",
    title: "Insufficient market demand for planned capacity",
    description:
      "Addressable market for space-derived data, connectivity, or services is smaller than projected, leading to underutilized constellation capacity or insufficient customer acquisition.",
    defaultProbability: "MODERATE",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Validate demand through binding LOIs or anchor customer contracts before full constellation deployment. Pursue phased deployment strategy. Diversify across government and commercial verticals. Build flexible payload architecture that can serve multiple market segments.",
    timeHorizon: "12-36 months post-deployment",
    applicableStages: ["Seed", "Series A", "Series B"],
    applicableTypes: ["SCO", "PDP"],
  },
  {
    category: "MARKET",
    title: "Customer concentration risk",
    description:
      "Revenue heavily dependent on a small number of customers (often government agencies or prime contractors), creating vulnerability if any single contract is not renewed or is significantly reduced.",
    defaultProbability: "HIGH",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Develop diversified customer pipeline across sectors (defense, agriculture, insurance, maritime). Target threshold of no single customer exceeding 30% of revenue by Series B. Build self-service data platforms to reach SME customers.",
    timeHorizon: "Ongoing",
    applicableStages: ["Seed", "Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "MARKET",
    title: "Pricing pressure from capacity oversupply",
    description:
      "Rapid growth in constellation deployments (particularly EO and Satcom) creates oversupply relative to demand, compressing margins and forcing price reductions.",
    defaultProbability: "MODERATE",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Differentiate through data quality, latency, or value-added analytics rather than raw capacity. Lock in long-term contracts with price escalation clauses. Focus on niche or underserved market segments with defensible positioning.",
    timeHorizon: "24-60 months",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "PDP"],
  },
  {
    category: "MARKET",
    title: "Slow government procurement cycles",
    description:
      "European institutional customers (ESA, EDA, Copernicus, national defense agencies) operate on multi-year procurement timelines that delay revenue recognition and strain cash flow.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Maintain 18+ months cash runway to bridge procurement delays. Pursue commercial customers in parallel. Leverage framework contracts and pre-qualification schemes. Engage with institutional customers early in budget planning cycles.",
    timeHorizon: "12-36 months",
    applicableStages: ["Seed", "Series A", "Series B"],
    applicableTypes: [],
  },
  {
    category: "MARKET",
    title: "Failure to achieve product-market fit",
    description:
      "Space-derived product or service does not meet customer expectations for quality, latency, coverage, or pricing, resulting in low adoption and high churn.",
    defaultProbability: "HIGH",
    defaultImpact: "CATASTROPHIC",
    suggestedMitigation:
      "Run pilot programs with target customers before full deployment. Iterate on product specifications based on customer feedback. Conduct willingness-to-pay studies. Build flexible ground processing to adjust data products rapidly.",
    timeHorizon: "6-24 months",
    applicableStages: ["Pre-Seed", "Seed", "Series A"],
    applicableTypes: [],
  },
  {
    category: "MARKET",
    title: "Emerging terrestrial alternatives",
    description:
      "Advances in terrestrial technologies (5G/6G networks, HAPS, drones, fiber expansion) reduce the addressable market for satellite-based connectivity or Earth observation services.",
    defaultProbability: "LOW",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Position satellite services as complementary to terrestrial infrastructure. Focus on use cases where space has inherent advantages (global coverage, remote areas, maritime, disaster response). Develop hybrid solutions integrating satellite and terrestrial data.",
    timeHorizon: "36-60 months",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "PDP"],
  },

  // ─── REGULATORY RISKS ───
  {
    category: "REGULATORY",
    title: "EU Space Act compliance burden",
    description:
      "New EU Space Act (COM(2025) 335) introduces mandatory authorization, environmental footprint declarations, debris mitigation plans, and cybersecurity requirements that significantly increase compliance costs and timelines for European space operators.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Begin compliance gap analysis early using automated assessment tools (e.g., Caelex Comply). Budget 5-10% of operating costs for regulatory compliance. Engage with NCA early in authorization process. Monitor delegated acts and implementing regulations.",
    timeHorizon: "12-24 months from entry into force",
    applicableStages: ["Seed", "Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "LO", "LSO", "ISOS"],
  },
  {
    category: "REGULATORY",
    title: "Spectrum and frequency coordination delays",
    description:
      "ITU frequency filing, coordination, and national spectrum licensing processes create multi-year delays before operational frequencies can be secured, particularly for large constellations requiring extensive coordination with incumbent systems.",
    defaultProbability: "MODERATE",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Initiate ITU filing process at earliest feasible stage. Engage experienced spectrum consultants. Pursue advance publication (AP) filings promptly. Consider acquiring existing frequency rights. Maintain dialogue with national spectrum authorities.",
    timeHorizon: "24-48 months",
    applicableStages: ["Seed", "Series A", "Series B"],
    applicableTypes: ["SCO"],
  },
  {
    category: "REGULATORY",
    title: "Export control (ITAR/EAR) restrictions",
    description:
      "US export control regulations (ITAR/EAR) restrict use of certain US-origin components, software, or technical data, limiting technology choices and creating compliance overhead for European companies with US-origin personnel or components.",
    defaultProbability: "MODERATE",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Develop ITAR-free supply chain using European-sourced components where possible. Implement robust Technology Control Plan (TCP). Obtain required export licenses proactively. Train all staff on export control obligations. Conduct regular self-assessments.",
    timeHorizon: "Ongoing",
    applicableStages: ["Seed", "Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "REGULATORY",
    title: "National authorization regime fragmentation",
    description:
      "Different EU member states maintain divergent authorization requirements, timelines, and conditions, creating complexity for operators needing authorizations in multiple jurisdictions.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Select primary jurisdiction based on regulatory favorability analysis. Leverage Caelex Space Law module for multi-jurisdiction comparison. Engage local legal counsel in each relevant jurisdiction. Monitor EU Space Act harmonization progress.",
    timeHorizon: "6-18 months per jurisdiction",
    applicableStages: ["Seed", "Series A", "Series B"],
    applicableTypes: ["SCO", "LO", "LSO"],
  },
  {
    category: "REGULATORY",
    title: "NIS2 Directive space sector obligations",
    description:
      "NIS2 Directive classifies space infrastructure operators as essential entities, imposing mandatory cybersecurity risk management measures, incident reporting within 24/72 hours, and potential penalties up to EUR 10M or 2% of global turnover.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Implement cybersecurity risk management framework aligned with NIS2 Art. 21. Establish incident detection and reporting procedures meeting 24-hour early warning requirement. Conduct regular security audits. Use Caelex NIS2 module for compliance tracking.",
    timeHorizon: "Immediate (transposition deadline passed)",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "LO", "LSO", "CAP"],
  },
  {
    category: "REGULATORY",
    title: "Environmental regulation tightening",
    description:
      "Increasing regulatory focus on space sustainability may introduce stricter debris mitigation requirements, Environmental Footprint Declaration obligations, or launch emission controls that increase costs.",
    defaultProbability: "MODERATE",
    defaultImpact: "MINOR",
    suggestedMitigation:
      "Design spacecraft and operations for best-in-class sustainability from the outset. Proactively prepare Environmental Footprint Declarations. Engage with industry groups on regulatory development. Position sustainability as a competitive advantage.",
    timeHorizon: "24-48 months",
    applicableStages: ["Seed", "Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "LO", "LSO"],
  },

  // ─── FINANCIAL RISKS ───
  {
    category: "FINANCIAL",
    title: "Funding gap between development and revenue",
    description:
      "Space ventures typically face a multi-year capital-intensive development phase before generating meaningful revenue, creating a funding valley of death between late Seed/Series A and first commercial operations.",
    defaultProbability: "HIGH",
    defaultImpact: "CATASTROPHIC",
    suggestedMitigation:
      "Secure anchor customer commitments or government contracts to bridge the gap. Pursue non-dilutive funding (ESA, Horizon Europe, national grants). Structure milestone-based funding tranches. Develop interim revenue through consultancy or technology licensing.",
    timeHorizon: "18-36 months",
    applicableStages: ["Seed", "Series A"],
    applicableTypes: [],
  },
  {
    category: "FINANCIAL",
    title: "Cost overruns in hardware development",
    description:
      "Space hardware development frequently exceeds initial budget estimates due to design iterations, testing failures, component obsolescence, or integration challenges. Industry data suggests 30-50% overruns are common.",
    defaultProbability: "HIGH",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Apply standard cost contingency margins (20-30% for mature designs, 40-50% for novel technology). Use parametric cost models validated against industry data. Implement earned value management. Conduct independent cost reviews at each design gate.",
    timeHorizon: "12-36 months",
    applicableStages: ["Seed", "Series A", "Series B"],
    applicableTypes: ["SCO", "LO"],
  },
  {
    category: "FINANCIAL",
    title: "Currency and inflation exposure",
    description:
      "European space companies frequently contract in multiple currencies (EUR, USD, GBP) for components, launch services, and revenue. Inflation in specialized labor and materials exceeds general CPI.",
    defaultProbability: "MODERATE",
    defaultImpact: "MINOR",
    suggestedMitigation:
      "Implement FX hedging for material cross-currency exposures. Include price escalation clauses in long-term contracts. Maintain multi-currency bank accounts. Budget using conservative exchange rate assumptions.",
    timeHorizon: "Ongoing",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "FINANCIAL",
    title: "Insurance cost escalation or unavailability",
    description:
      "Launch and in-orbit insurance premiums may increase significantly or become difficult to obtain following industry losses, reducing financial predictability and potentially breaching authorization conditions.",
    defaultProbability: "LOW",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Build long-term relationships with specialist space insurance brokers. Demonstrate strong risk management practices to secure favorable rates. Explore self-insurance or captive structures for mature operators. Maintain clean claims history.",
    timeHorizon: "6-12 months before launch",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "LO"],
  },
  {
    category: "FINANCIAL",
    title: "Investor sentiment downturn in space sector",
    description:
      "Macro-economic conditions or high-profile space venture failures lead to reduced VC appetite for space investments, making subsequent funding rounds more difficult and potentially down-rounds.",
    defaultProbability: "MODERATE",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Maintain disciplined unit economics and clear path to profitability. Build strategic investor relationships with space-focused funds (Seraphim, Porsche Ventures, Airbus Ventures). Diversify funding sources (VC, grants, revenue, debt). Keep burn rate conservative.",
    timeHorizon: "12-24 months",
    applicableStages: ["Seed", "Series A", "Series B"],
    applicableTypes: [],
  },
  {
    category: "FINANCIAL",
    title: "Revenue recognition delays from long sales cycles",
    description:
      "B2B and government customers in the space sector have extended sales cycles (6-18 months), with revenue recognition further delayed by acceptance testing and milestone-based payment structures.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Implement robust sales pipeline forecasting. Negotiate advance payments or milestone payments aligned with cash flow needs. Maintain working capital reserves. Consider invoice factoring for creditworthy government receivables.",
    timeHorizon: "Ongoing",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: [],
  },

  // ─── OPERATIONAL RISKS ───
  {
    category: "OPERATIONAL",
    title: "Key person dependency",
    description:
      "Critical knowledge, relationships, or technical expertise concentrated in one or a few individuals (typically founders or chief engineers), creating single-point-of-failure risk for the organization.",
    defaultProbability: "HIGH",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Implement structured knowledge management and documentation practices. Cross-train team members on critical functions. Establish competitive retention packages with vesting schedules. Develop succession plans for all C-level and key technical roles.",
    timeHorizon: "Ongoing",
    applicableStages: ["Pre-Seed", "Seed", "Series A"],
    applicableTypes: [],
  },
  {
    category: "OPERATIONAL",
    title: "Talent acquisition and retention challenges",
    description:
      "European space industry faces acute shortage of experienced spacecraft engineers, RF specialists, and mission operations personnel. Competition from US companies offering higher compensation intensifies the challenge.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Offer competitive equity compensation packages. Build university partnerships and internship pipelines. Leverage ESA and national agency alumni networks. Establish remote work policies to access wider talent pool. Create strong employer brand through technical blog and conference presence.",
    timeHorizon: "Ongoing",
    applicableStages: ["Seed", "Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "OPERATIONAL",
    title: "Ground segment reliability failure",
    description:
      "Ground station network or mission control center experiences outages affecting satellite commanding, telemetry reception, or data downlink, leading to data gaps and potential mission safety issues.",
    defaultProbability: "LOW",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Utilize geographically distributed ground station network (own stations plus third-party networks like KSAT, SSC, AWS Ground Station). Implement redundant mission control systems. Establish failover procedures. Conduct regular disaster recovery exercises.",
    timeHorizon: "Ongoing",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "PDP"],
  },
  {
    category: "OPERATIONAL",
    title: "Manufacturing scalability constraints",
    description:
      "Transition from prototype or small-batch production to constellation-scale manufacturing introduces quality control challenges, supply chain bottlenecks, and facility capacity constraints.",
    defaultProbability: "MODERATE",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Invest in manufacturing automation and test infrastructure early. Establish quality management system (ISO 9001 / ECSS) before scaling. Qualify multiple suppliers for critical components. Plan facility expansion well in advance of production ramp.",
    timeHorizon: "12-24 months",
    applicableStages: ["Series A", "Series B"],
    applicableTypes: ["SCO", "LO"],
  },
  {
    category: "OPERATIONAL",
    title: "Launch manifest scheduling risk",
    description:
      "Dependence on third-party launch providers exposes the company to manifest delays, launch window constraints, and potential schedule slips of 6-18 months that cascade through mission planning.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Secure launch contracts with multiple providers. Negotiate contract terms that include delay penalties and backup launch opportunities. Design spacecraft for compatibility with multiple launch vehicles. Maintain schedule contingency in business plans.",
    timeHorizon: "6-24 months before planned launch",
    applicableStages: ["Seed", "Series A", "Series B"],
    applicableTypes: ["SCO"],
  },
  {
    category: "OPERATIONAL",
    title: "Data processing and storage infrastructure limits",
    description:
      "Growing satellite constellation generates exponentially increasing data volumes that exceed ground processing and storage capacity, creating backlogs and degrading service quality.",
    defaultProbability: "MODERATE",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Architect data pipeline for horizontal scalability from the start. Leverage cloud infrastructure (AWS, Azure, OVH) with auto-scaling. Implement edge processing and on-board data reduction. Monitor processing latency KPIs and capacity plan 6+ months ahead.",
    timeHorizon: "12-36 months",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "PDP"],
  },

  // ─── COMPETITIVE RISKS ───
  {
    category: "COMPETITIVE",
    title: "Incumbent space primes entering market segment",
    description:
      "Large established aerospace companies (Airbus, Thales, OHB) launch competing products or services leveraging their existing customer relationships, supply chain access, and government contracts.",
    defaultProbability: "MODERATE",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Maintain innovation velocity advantage. Focus on market niches where startup agility creates value. Build switching costs through data lock-in and integration depth. Consider strategic partnerships with primes where complementary. Protect key IP.",
    timeHorizon: "12-36 months",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "COMPETITIVE",
    title: "Well-funded US competitor with scale advantage",
    description:
      "US-based competitors with significantly larger funding rounds (often 3-5x European equivalents) achieve economies of scale, faster iteration cycles, and stronger market presence.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Leverage European regulatory compliance as competitive moat (GDPR, EU Space Act, data sovereignty). Target European institutional customers with local presence requirement. Pursue capital-efficient strategies. Build strategic alliances within European ecosystem.",
    timeHorizon: "Ongoing",
    applicableStages: ["Seed", "Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "COMPETITIVE",
    title: "Technology commoditization",
    description:
      "Rapid maturation of satellite platforms, components, and data processing tools lowers barriers to entry, enabling new competitors to quickly replicate capabilities that previously provided differentiation.",
    defaultProbability: "MODERATE",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Invest continuously in R&D for next-generation capabilities. Build moats through proprietary algorithms, unique data assets, or exclusive partnerships. Transition from hardware to recurring data/analytics revenue. Secure patents for core innovations.",
    timeHorizon: "24-48 months",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "COMPETITIVE",
    title: "Adjacent industry convergence",
    description:
      "Companies from adjacent industries (telecommunications, cloud computing, defense) enter the space market with existing customer bases, capital, and complementary technology stacks.",
    defaultProbability: "MODERATE",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Position as domain expert partner rather than competitor. Build strategic relationships with potential convergence entrants. Develop APIs and integration capabilities to be complementary. Focus on space-specific expertise that is hard to replicate.",
    timeHorizon: "24-60 months",
    applicableStages: ["Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "COMPETITIVE",
    title: "Open-source or freely available alternative data",
    description:
      "Government programs (Copernicus, Landsat) or open data initiatives provide free or low-cost alternatives to commercial space data products, compressing addressable market.",
    defaultProbability: "MODERATE",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Differentiate through higher resolution, faster revisit rates, unique spectral bands, or near-real-time delivery. Build value-added analytics layers on top of raw data. Target use cases where government data cannot meet requirements (latency, resolution, tasking).",
    timeHorizon: "Ongoing",
    applicableStages: ["Seed", "Series A", "Series B"],
    applicableTypes: ["SCO", "PDP"],
  },

  // ─── GEOPOLITICAL RISKS ───
  {
    category: "GEOPOLITICAL",
    title: "US-China technology decoupling impact",
    description:
      "Escalating US-China technology competition creates supply chain disruptions, export control complications, and potential restrictions on dual-use space technologies that affect European companies.",
    defaultProbability: "MODERATE",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Develop fully European or allied-nation supply chains for critical components. Monitor evolving export control regimes. Maintain compliance with both US and EU export controls. Diversify customer base to reduce geopolitical concentration.",
    timeHorizon: "Ongoing",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "GEOPOLITICAL",
    title: "Space as a contested domain",
    description:
      "Increasing militarization of space raises risk of ASAT demonstrations, signal jamming, or deliberate interference that could affect commercial space assets and operations.",
    defaultProbability: "LOW",
    defaultImpact: "CATASTROPHIC",
    suggestedMitigation:
      "Design spacecraft with resilience to jamming and interference. Implement encrypted and frequency-hopping communications. Develop rapid replenishment capability. Engage with national defense agencies on situational awareness sharing. Diversify orbital regimes.",
    timeHorizon: "Ongoing",
    applicableStages: ["Series B", "Series C"],
    applicableTypes: ["SCO", "CAP"],
  },
  {
    category: "GEOPOLITICAL",
    title: "Sanctions and trade restrictions",
    description:
      "New or expanded international sanctions regimes (e.g., against Russia, Iran, or other nations) may restrict access to launch services, components, or customer markets, requiring rapid supply chain or commercial adjustments.",
    defaultProbability: "MODERATE",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Maintain diversified launch provider portfolio excluding sanctioned entities. Implement sanctions screening for all customers and suppliers. Develop contingency plans for supply chain disruptions. Monitor geopolitical developments and sanctions pipeline.",
    timeHorizon: "0-6 months (acute events)",
    applicableStages: ["Seed", "Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "GEOPOLITICAL",
    title: "European strategic autonomy policy shifts",
    description:
      "EU policy push for strategic autonomy in space may create both opportunities (preferential procurement for EU companies) and risks (restrictions on non-EU partnerships, mandatory European component sourcing).",
    defaultProbability: "MODERATE",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Engage with EU institutional stakeholders and industry associations (Eurospace, SME4Space). Position as contributor to European strategic autonomy. Monitor IRIS2, Copernicus, and Galileo procurement opportunities. Develop European-sourced alternatives for critical technologies.",
    timeHorizon: "12-36 months",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: [],
  },
  {
    category: "GEOPOLITICAL",
    title: "Data sovereignty and localization requirements",
    description:
      "Increasing national requirements for data localization, sovereign ground segments, or restrictions on cross-border data flows may fragment markets and increase operational complexity for global service providers.",
    defaultProbability: "HIGH",
    defaultImpact: "MODERATE_IMPACT",
    suggestedMitigation:
      "Design data architecture for multi-region deployment from the start. Establish local data processing nodes in key markets. Ensure GDPR compliance as baseline. Monitor emerging data sovereignty regulations. Partner with local entities where sovereign requirements apply.",
    timeHorizon: "12-24 months",
    applicableStages: ["Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "PDP"],
  },
  {
    category: "GEOPOLITICAL",
    title: "Launch access restrictions due to geopolitical events",
    description:
      "Geopolitical events may suddenly restrict access to launch sites or launch service providers (as occurred with Soyuz launches from Kourou following 2022 sanctions on Russia), requiring emergency re-manifesting.",
    defaultProbability: "LOW",
    defaultImpact: "MAJOR",
    suggestedMitigation:
      "Maintain launch service agreements with providers in multiple allied jurisdictions. Design spacecraft for multi-launcher compatibility. Include contract provisions for force majeure and re-manifesting. Monitor geopolitical risk indicators for launch provider nations.",
    timeHorizon: "0-12 months (acute events)",
    applicableStages: ["Seed", "Series A", "Series B", "Series C"],
    applicableTypes: ["SCO", "LO"],
  },
];
