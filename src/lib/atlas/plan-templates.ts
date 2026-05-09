/**
 * Atlas Drafting — Plan Templates (Bundle 43).
 *
 * Bundles 30-42 shipped per-tile drafting: Marie picks "Auth" or "NDA"
 * or "Brief" and gets one draft. But the actual lawyer workflow is
 * per-package: a Sky-Sat DE filing isn't ONE draft, it's a paket of
 * (auth + cover-letter + NIS2-brief + NDA-with-co-counsel).
 *
 * A "Plan" is a curated, ordered list of drafts that together form a
 * complete filing package. Marie picks a Plan (or builds her own),
 * the workspace instantiates every item with the active mandate's
 * context, and she steps through them — accepting / regenerating
 * each before moving on.
 *
 * The catalog below is the MVP set, curated from real BHO Legal /
 * Heuking / Dentons Space filing routines. Stage-2 (Bundle 44+) adds
 * mandate-aware auto-suggest ("your mandate looks like a DE-Auth
 * candidate, here's the matching plan"). Stage-3 (Bundle 45+) bridges
 * to Comply so the mandate data comes from the actual client's data
 * room instead of Marie's intake form.
 */

import type { DraftKind } from "./drafting-history";

/**
 * Per-item builder defaults. Each plan-item knows which kind of draft
 * it is (auth/brief/compare/nda/cover) and carries the default args
 * for that kind's prompt builder. The workspace can override defaults
 * per-item if Marie wants to customize before dispatch.
 */
export type PlanItemDefaults =
  | {
      kind: "auth";
      jurisdiction: string;
      operatorType: string;
      /** When true, mission profile is composed from the active mandate's
       *  intake at workspace-creation time. When false, item gets blank
       *  mission unless overridden. */
      missionFromIntake: boolean;
      /** Optional authority template id (matches authority-templates.ts). */
      authorityId?: string;
    }
  | {
      kind: "brief";
      /** Topic template — supports {client} and {jurisdiction} placeholders
       *  that get substituted at workspace-creation time from the active
       *  mandate intake. */
      topicTemplate: string;
    }
  | {
      kind: "compare";
      jurisdictions: string[];
    }
  | {
      kind: "nda";
      ndaType: "mutual" | "one_way";
      /** Party A defaults to active mandate's client name when blank. */
      partyA: string;
      partyB: string;
      jurisdiction: string;
      termYears: string;
    }
  | {
      kind: "cover";
      filingType: "authorization" | "notification" | "renewal" | "amendment";
      /** Authority free-text. Empty = use authority-template's name. */
      authority: string;
      reference: string;
      authorityId?: string;
    };

export interface PlanItem {
  id: string;
  /** Stable order index — items dispatch top-down by this value. */
  order: number;
  /** Display label per locale. */
  label: { de: string; en: string };
  /** Optional one-liner subtitle. */
  description?: { de: string; en: string };
  kind: DraftKind;
  defaults: PlanItemDefaults;
}

export interface PlanTemplate {
  id: string;
  /** Name shown on plan cards in the picker. */
  name: { de: string; en: string };
  /** Subtitle for the picker — what does this plan deliver? */
  description: { de: string; en: string };
  /** Optional applicability filter — used by Bundle 44's auto-suggest. */
  appliesTo?: {
    operatorTypes?: string[];
    jurisdictions?: string[];
  };
  items: PlanItem[];
}

/**
 * MVP catalog. Five plans covering the 80%-most-frequent BHO Legal
 * paket-asks:
 *   1. Full DE Authorization Package — BNetzA filing end-to-end
 *   2. Full FR Authorization Package — ARCEP filing end-to-end
 *   3. ITU Frequency Filing Pipeline — API + CR + Notification
 *   4. NIS2 Onboarding Bundle — classification + risk + reporting
 *   5. Investor Due Diligence Package — for VC raises
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "de-full-authorization",
    name: {
      de: "DE Genehmigungspaket (komplett)",
      en: "Full DE Authorization Package",
    },
    description: {
      de: "BNetzA-Antrag (9 Sektionen) + Anschreiben + NIS2-Compliance-Brief + Co-Counsel-NDA. Das Standard-Paket für Satellitenbetreiber-Filings in Deutschland.",
      en: "BNetzA filing (9 sections) + cover letter + NIS2-compliance brief + co-counsel NDA. The standard package for satellite-operator filings in Germany.",
    },
    appliesTo: {
      jurisdictions: ["DE"],
      operatorTypes: ["satellite_operator", "constellation_operator"],
    },
    items: [
      {
        id: "auth-de",
        order: 1,
        kind: "auth",
        label: {
          de: "1. BNetzA-Genehmigungsantrag",
          en: "1. BNetzA authorization filing",
        },
        description: {
          de: "Hauptdokument mit allen 9 Standardsektionen.",
          en: "Main document with all 9 standard sections.",
        },
        defaults: {
          kind: "auth",
          jurisdiction: "DE",
          operatorType: "satellite_operator",
          missionFromIntake: true,
          authorityId: "bnetza-de",
        },
      },
      {
        id: "cover-de",
        order: 2,
        kind: "cover",
        label: {
          de: "2. Anschreiben an BNetzA",
          en: "2. Cover letter to BNetzA",
        },
        defaults: {
          kind: "cover",
          filingType: "authorization",
          authority: "Bundesnetzagentur, Tulpenfeld 4, 53113 Bonn",
          reference: "",
          authorityId: "bnetza-de",
        },
      },
      {
        id: "nis2-brief",
        order: 3,
        kind: "brief",
        label: {
          de: "3. NIS2-Compliance-Briefing",
          en: "3. NIS2-compliance brief",
        },
        defaults: {
          kind: "brief",
          topicTemplate:
            "NIS2-Compliance für {client} als Satellitenbetreiber — Klassifizierung, Art. 21 Maßnahmen, Reporting an BSI",
        },
      },
      {
        id: "nda-counsel",
        order: 4,
        kind: "nda",
        label: {
          de: "4. NDA mit Co-Counsel",
          en: "4. Co-counsel NDA",
        },
        defaults: {
          kind: "nda",
          ndaType: "mutual",
          partyA: "",
          partyB: "[Co-Counsel-Kanzlei]",
          jurisdiction: "DE",
          termYears: "5",
        },
      },
    ],
  },
  {
    id: "fr-full-authorization",
    name: {
      de: "FR Genehmigungspaket (komplett)",
      en: "Full FR Authorization Package",
    },
    description: {
      de: "ARCEP-Antrag im französischen Verwaltungsstil + Anschreiben. Für Filings in Frankreich nach Loi Espace.",
      en: "ARCEP filing in French administrative style + cover letter. For filings in France under the Loi Espace.",
    },
    appliesTo: {
      jurisdictions: ["FR"],
      operatorTypes: ["satellite_operator", "constellation_operator"],
    },
    items: [
      {
        id: "auth-fr",
        order: 1,
        kind: "auth",
        label: { de: "1. ARCEP-Antrag", en: "1. ARCEP filing" },
        defaults: {
          kind: "auth",
          jurisdiction: "FR",
          operatorType: "satellite_operator",
          missionFromIntake: true,
          authorityId: "arcep-fr",
        },
      },
      {
        id: "cover-fr",
        order: 2,
        kind: "cover",
        label: {
          de: "2. Anschreiben an ARCEP",
          en: "2. Cover letter to ARCEP",
        },
        defaults: {
          kind: "cover",
          filingType: "authorization",
          authority: "ARCEP, 14 rue Gerty Archimède, 75012 Paris",
          reference: "",
          authorityId: "arcep-fr",
        },
      },
    ],
  },
  {
    id: "itu-frequency-filing",
    name: {
      de: "ITU-Frequenz-Filing (Pipeline)",
      en: "ITU Frequency Filing Pipeline",
    },
    description: {
      de: "Drei Briefings für die ITU-Filing-Phasen: Advance Publication Information (API), Coordination Request (CR), Notification. Bei Konstellationen Pflicht.",
      en: "Three briefs covering the ITU filing phases: Advance Publication Information (API), Coordination Request (CR), Notification. Mandatory for constellations.",
    },
    items: [
      {
        id: "itu-api",
        order: 1,
        kind: "brief",
        label: { de: "1. API-Filing-Briefing", en: "1. API filing brief" },
        defaults: {
          kind: "brief",
          topicTemplate:
            "ITU Advance Publication Information (API) Filing für {client} — Inhalte, Frist, Inter-System-Koordination, SpaceCap-Format",
        },
      },
      {
        id: "itu-cr",
        order: 2,
        kind: "brief",
        label: {
          de: "2. Coordination-Request-Briefing",
          en: "2. Coordination Request brief",
        },
        defaults: {
          kind: "brief",
          topicTemplate:
            "ITU Coordination Request (CR) für {client} — RR Article 9 Verfahren, Verhandlungsstrategie mit angrenzenden Operatoren",
        },
      },
      {
        id: "itu-notification",
        order: 3,
        kind: "brief",
        label: {
          de: "3. Notification-Briefing",
          en: "3. Notification brief",
        },
        defaults: {
          kind: "brief",
          topicTemplate:
            "ITU Notification & Recording (BIU) für {client} — Bring-into-Use-Frist, Dokumentationspflichten, Master International Frequency Register",
        },
      },
    ],
  },
  {
    id: "nis2-onboarding",
    name: {
      de: "NIS2-Onboarding-Bundle",
      en: "NIS2 Onboarding Bundle",
    },
    description: {
      de: "Drei Briefings für den NIS2-Einstieg: Klassifizierung (essential/important), Art. 21-Risikomanagement, Incident-Reporting an BSI/ANSSI.",
      en: "Three briefs for the NIS2 entry: classification (essential/important), Art. 21 risk management, incident reporting to BSI/ANSSI.",
    },
    items: [
      {
        id: "nis2-classification",
        order: 1,
        kind: "brief",
        label: {
          de: "1. NIS2-Klassifizierung",
          en: "1. NIS2 classification",
        },
        defaults: {
          kind: "brief",
          topicTemplate:
            "NIS2-Klassifizierung für {client} — wesentliche vs. wichtige Einrichtung, Größenkriterien, sektorale Anwendbarkeit",
        },
      },
      {
        id: "nis2-risk-mgmt",
        order: 2,
        kind: "brief",
        label: {
          de: "2. Art. 21 Risikomanagement",
          en: "2. Art. 21 risk management",
        },
        defaults: {
          kind: "brief",
          topicTemplate:
            "NIS2 Art. 21 Risikomanagement-Maßnahmen für {client} — die zehn Kontrollen, Lieferketten-Sicherheit, Implementierungsleitfaden",
        },
      },
      {
        id: "nis2-incident",
        order: 3,
        kind: "brief",
        label: {
          de: "3. Incident-Reporting-Plan",
          en: "3. Incident-reporting plan",
        },
        defaults: {
          kind: "brief",
          topicTemplate:
            "NIS2 Incident-Reporting-Plan für {client} — 24/72-Stunden-Pflicht, BSI-Meldewege, Vorlage für Initial Notification",
        },
      },
    ],
  },
  {
    id: "investor-dd",
    name: {
      de: "Investor-Due-Diligence-Paket",
      en: "Investor Due Diligence Package",
    },
    description: {
      de: "Drei Drafts für VC-Runden: Compliance-Statement-Brief, Risiko-Memo (regulatorisch), Anschreiben für Datenraum-Übergabe.",
      en: "Three drafts for VC rounds: compliance-statement brief, regulatory risk memo, cover letter for data-room handover.",
    },
    items: [
      {
        id: "dd-compliance",
        order: 1,
        kind: "brief",
        label: {
          de: "1. Compliance-Statement",
          en: "1. Compliance statement",
        },
        defaults: {
          kind: "brief",
          topicTemplate:
            "Compliance-Statement für Investor-DD — {client}: Stand der Genehmigungen, NIS2, ITU-Filings, ausstehende regulatorische Risiken",
        },
      },
      {
        id: "dd-risk-memo",
        order: 2,
        kind: "brief",
        label: {
          de: "2. Regulatorisches Risiko-Memo",
          en: "2. Regulatory risk memo",
        },
        defaults: {
          kind: "brief",
          topicTemplate:
            "Regulatorisches Risiko-Memo für {client} — Mapping aller offenen Compliance-Punkte mit Eintrittswahrscheinlichkeit und Schadenshöhe",
        },
      },
      {
        id: "dd-cover",
        order: 3,
        kind: "cover",
        label: {
          de: "3. Datenraum-Anschreiben",
          en: "3. Data-room cover letter",
        },
        defaults: {
          kind: "cover",
          filingType: "notification",
          authority: "[Investor]",
          reference: "DD-Datenraum",
        },
      },
    ],
  },
];

export function getPlanTemplate(id: string): PlanTemplate | null {
  return PLAN_TEMPLATES.find((p) => p.id === id) ?? null;
}

/**
 * Substitute mandate-context placeholders in a topic template.
 * Supports {client}, {jurisdiction}, {operator}.
 */
export function substituteTemplate(
  template: string,
  ctx: { client?: string; jurisdiction?: string; operator?: string },
): string {
  return template
    .replace(/\{client\}/g, ctx.client?.trim() || "[Mandant]")
    .replace(/\{jurisdiction\}/g, ctx.jurisdiction?.trim() || "[Jurisdiktion]")
    .replace(/\{operator\}/g, ctx.operator?.trim() || "[Betreiber]");
}
