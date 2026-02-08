/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * National space law to EU Space Act cross-reference mappings.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { SpaceLawCountryCode } from "@/lib/space-law-types";

export interface SpaceLawCrossReference {
  nationalLawArea: string;
  euSpaceActArticles: string[];
  relationship: "superseded" | "complementary" | "parallel" | "gap";
  description: string;
  applicableCountries: SpaceLawCountryCode[];
}

export const SPACE_LAW_CROSS_REFERENCES: SpaceLawCrossReference[] = [
  // Authorization & Licensing
  {
    nationalLawArea: "Authorization for space operations",
    euSpaceActArticles: ["Art. 6–16", "Art. 32–39"],
    relationship: "superseded",
    description:
      "EU Space Act introduces harmonized authorization regime across all EU member states. National authorization processes will be replaced by a unified EU framework, with NCAs acting as implementing authorities under EUSPA coordination.",
    applicableCountries: ["FR", "BE", "NL", "LU", "AT", "DK", "DE", "IT"],
  },
  {
    nationalLawArea: "Third-country operator requirements",
    euSpaceActArticles: ["Art. 14", "Art. 15"],
    relationship: "superseded",
    description:
      "EU Space Act requires third-country operators offering EU market services to designate an EU legal representative. This supersedes varying national approaches to foreign operator oversight.",
    applicableCountries: ["FR", "BE", "NL", "LU", "AT", "DK", "IT"],
  },
  {
    nationalLawArea: "Insurance & liability coverage",
    euSpaceActArticles: ["Art. 17–19"],
    relationship: "complementary",
    description:
      "EU Space Act sets minimum insurance standards, but national laws may retain higher thresholds or specific government indemnification schemes. France's €60M cap and UK's £60M structure likely remain alongside EU minimums.",
    applicableCountries: ["FR", "UK", "BE", "NL", "LU", "AT", "DK", "IT", "NO"],
  },
  {
    nationalLawArea: "Debris mitigation requirements",
    euSpaceActArticles: ["Art. 55–73"],
    relationship: "superseded",
    description:
      "EU Space Act introduces comprehensive debris mitigation framework with specific deorbit timelines, passivation requirements, and collision avoidance obligations that supersede national provisions based on IADC Guidelines.",
    applicableCountries: ["FR", "BE", "NL", "LU", "AT", "DK", "IT"],
  },
  {
    nationalLawArea: "Cybersecurity & resilience",
    euSpaceActArticles: ["Art. 74–95"],
    relationship: "complementary",
    description:
      "EU Space Act cybersecurity provisions (Art. 74–95) complement existing NIS2 obligations for space operators. National implementations of NIS2 remain relevant alongside space-specific cybersecurity requirements.",
    applicableCountries: [
      "FR",
      "UK",
      "BE",
      "NL",
      "LU",
      "AT",
      "DK",
      "DE",
      "IT",
      "NO",
    ],
  },
  {
    nationalLawArea: "Environmental footprint declarations",
    euSpaceActArticles: ["Art. 96–100"],
    relationship: "superseded",
    description:
      "EU Space Act introduces mandatory Environmental Footprint Declarations (EFD) with no current national equivalent. This is a new obligation for all EU-authorized operators.",
    applicableCountries: ["FR", "BE", "NL", "LU", "AT", "DK", "DE", "IT"],
  },
  {
    nationalLawArea: "Space object registration",
    euSpaceActArticles: ["Art. 24"],
    relationship: "superseded",
    description:
      "EU Space Act establishes the Union Register of Space Objects (URSO), replacing or supplementing national registries. National registries may continue as supplementary records.",
    applicableCountries: ["FR", "BE", "NL", "LU", "AT", "DK", "IT"],
  },
  {
    nationalLawArea: "Remote sensing / data distribution",
    euSpaceActArticles: ["Art. 101–104"],
    relationship: "complementary",
    description:
      "EU Space Act addresses primary data provision but national remote sensing regulations (especially Germany's SatDSiG and France's LOS provisions) remain relevant for data security and distribution controls.",
    applicableCountries: ["FR", "UK", "DE", "IT"],
  },
  {
    nationalLawArea: "Supervision & enforcement",
    euSpaceActArticles: ["Art. 33–54", "Art. 105–108"],
    relationship: "superseded",
    description:
      "EU Space Act establishes unified supervision framework with EUSPA coordination. National authorities become implementing bodies under the EU framework with harmonized enforcement powers.",
    applicableCountries: ["FR", "BE", "NL", "LU", "AT", "DK", "IT"],
  },
  {
    nationalLawArea: "Space resources exploitation",
    euSpaceActArticles: [],
    relationship: "parallel",
    description:
      "Luxembourg's 2017 Space Resources Act remains unique — the EU Space Act does not address space resource utilization. Luxembourg provisions operate independently and remain in full force.",
    applicableCountries: ["LU"],
  },
  {
    nationalLawArea: "UK post-Brexit regime",
    euSpaceActArticles: [],
    relationship: "parallel",
    description:
      "UK Space Industry Act 2018 operates entirely independently of EU Space Act. UK-licensed operators serving the EU market will need separate EU authorization under Art. 14 (third-country provisions).",
    applicableCountries: ["UK"],
  },
  {
    nationalLawArea: "Norway EEA position",
    euSpaceActArticles: [],
    relationship: "parallel",
    description:
      "Norway's space law operates independently. EU Space Act applicability depends on EEA incorporation decision. Norwegian operators serving the EU market may need separate EU authorization.",
    applicableCountries: ["NO"],
  },
  {
    nationalLawArea: "German regulatory gap",
    euSpaceActArticles: ["Art. 6–16", "Art. 55–73", "Art. 96–100"],
    relationship: "gap",
    description:
      "Germany lacks a comprehensive national space law. The EU Space Act will fill this significant gap, providing Germany's first comprehensive authorization and compliance framework for space operators beyond remote sensing.",
    applicableCountries: ["DE"],
  },
];
