/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Chat Privacy Consent — § 203 StGB / DSGVO Awareness-Gate.
 *
 * Compliance-Audit 2026-05 closes the gap between (a) the comprehensive
 * DPA § 10a Berufsgeheimnis-Annex and (b) the actual chat UX where a
 * lawyer could paste mandate-identifying client data into the input
 * field with no friction.
 *
 * The voice-input flow (`src/components/atlas/ai-mode/AIMode.tsx`
 * startListening) already has a localStorage-gated informed-consent
 * confirm dialog. This module mirrors that pattern for TEXT input,
 * because text is the actual primary entry path.
 *
 * Two surfaces:
 *   1. First-use modal on the first chat submit per device — explains
 *      what flows where and asks the lawyer to acknowledge that
 *      pasting § 203-protected data without prior client consent may
 *      itself constitute a Berufsrecht violation.
 *   2. Persistent banner above the input area — short reminder that
 *      stays visible across the session.
 *
 * Versioning: when the routing posture changes (e.g. EU-Bedrock
 * becomes the unconditional default), bump CONSENT_VERSION to force
 * a re-acknowledgement.
 */

const STORAGE_KEY = "atlas-chat-privacy-consent";
export const CONSENT_VERSION = "2026-05-11";

export interface ChatPrivacyConsentRecord {
  version: string;
  acknowledgedAt: string; // ISO timestamp
  language: string;
}

export type ChatPrivacyLanguage = "de" | "en" | "fr" | "es";

export function readConsent(): ChatPrivacyConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatPrivacyConsentRecord;
    if (
      typeof parsed?.version !== "string" ||
      typeof parsed?.acknowledgedAt !== "string" ||
      typeof parsed?.language !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasCurrentConsent(): boolean {
  const record = readConsent();
  return !!record && record.version === CONSENT_VERSION;
}

export function writeConsent(language: string): ChatPrivacyConsentRecord {
  const record: ChatPrivacyConsentRecord = {
    version: CONSENT_VERSION,
    acknowledgedAt: new Date().toISOString(),
    language,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      /* localStorage may be unavailable (incognito with strict
         settings) — failing silently means the modal would re-appear
         next time, which is acceptable defensive behaviour. */
    }
  }
  return record;
}

export function revokeConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* swallow */
  }
}

/* ── Localised copy ────────────────────────────────────────────────── */

export interface ChatPrivacyCopy {
  modal: {
    title: string;
    intro: string;
    bullets: string[];
    routing: string;
    accept: string;
    cancel: string;
  };
  banner: {
    text: string;
    learnMore: string;
  };
}

const COPY: Record<ChatPrivacyLanguage, ChatPrivacyCopy> = {
  de: {
    modal: {
      title: "Hinweis zur Eingabe von Mandantendaten",
      intro:
        "Atlas leitet Ihre Eingabe an Anthropic (Claude) weiter — primär über das Vercel AI Gateway an AWS Bedrock in der EU, mit US-Direkt-Pfad als Fallback. Bevor Sie loslegen, bitten wir um eine kurze Kenntnisnahme:",
      bullets: [
        "Geben Sie keine namentlich identifizierenden Mandantendaten ein, ohne dass die Mandantin/der Mandant über die KI-Verarbeitung informiert wurde und (je nach Konstellation) zugestimmt hat.",
        "Anwaltliches Berufsgeheimnis (§ 43a BRAO, § 203 StGB) liegt bei Ihnen — Caelex haftet für Auftragsverarbeitung gemäß DPA § 10a (Berufsgeheimnisträger-Annex).",
        "Eingaben werden NICHT zum Training der KI-Modelle verwendet (Anthropic Zero-Data-Retention).",
        "Audit-Log und Anonymisierungs-Mechanismen sind in /legal/dpa § 10a beschrieben.",
      ],
      routing:
        "Aktueller Pfad: bevorzugt EU-Bedrock (Frankfurt/Irland), Fallback Anthropic-USA. Konfiguration sichtbar in src/lib/atlas/anthropic-client.ts.",
      accept: "Verstanden — Atlas verwenden",
      cancel: "Abbrechen",
    },
    banner: {
      text: "Eingaben fließen an Anthropic (EU-Bedrock bevorzugt). Keine namentlichen Mandantendaten ohne Mandanteneinwilligung.",
      learnMore: "Datenschutz",
    },
  },
  en: {
    modal: {
      title: "Notice on entering client information",
      intro:
        "Atlas routes your input to Anthropic (Claude) — primarily via the Vercel AI Gateway to AWS Bedrock in the EU, with US-direct as fallback. Before you start, please take note:",
      bullets: [
        "Do not enter client-identifying information unless your client has been informed about AI processing and (depending on the matter) has consented.",
        "Attorney-client privilege (§ 43a BRAO, § 203 StGB) sits with you — Caelex carries the processor-side obligations per DPA § 10a (Professional-Secrecy Annex).",
        "Inputs are NOT used for AI model training (Anthropic Zero-Data-Retention).",
        "Audit-log and anonymisation mechanisms are described in /legal/dpa § 10a.",
      ],
      routing:
        "Active path: preferred EU-Bedrock (Frankfurt/Ireland), fallback Anthropic-US. Configuration visible in src/lib/atlas/anthropic-client.ts.",
      accept: "Understood — use Atlas",
      cancel: "Cancel",
    },
    banner: {
      text: "Inputs flow to Anthropic (EU-Bedrock preferred). No client-identifying data without client consent.",
      learnMore: "Privacy",
    },
  },
  fr: {
    modal: {
      title: "Avis sur la saisie de données clients",
      intro:
        "Atlas transmet votre saisie à Anthropic (Claude) — principalement via Vercel AI Gateway vers AWS Bedrock en UE, avec un repli direct vers les États-Unis. Avant de commencer, merci de prendre note :",
      bullets: [
        "N'entrez pas de données nominatives sur le client sans que celui-ci ait été informé du traitement par IA et (selon le mandat) ait donné son consentement.",
        "Le secret professionnel de l'avocat vous incombe — Caelex assume les obligations de sous-traitant selon DPA § 10a (Annexe sur le secret professionnel).",
        "Les saisies NE sont PAS utilisées pour entraîner les modèles d'IA (Anthropic Zero-Data-Retention).",
        "Les mécanismes d'audit et d'anonymisation sont décrits dans /legal/dpa § 10a.",
      ],
      routing:
        "Chemin actif : EU-Bedrock préféré (Francfort/Irlande), repli Anthropic-US. Configuration visible dans src/lib/atlas/anthropic-client.ts.",
      accept: "Compris — utiliser Atlas",
      cancel: "Annuler",
    },
    banner: {
      text: "Les saisies vont à Anthropic (EU-Bedrock préféré). Pas de données nominatives sans consentement du client.",
      learnMore: "Confidentialité",
    },
  },
  es: {
    modal: {
      title: "Aviso sobre la introducción de datos del cliente",
      intro:
        "Atlas envía su entrada a Anthropic (Claude) — principalmente vía Vercel AI Gateway a AWS Bedrock en la UE, con conexión directa a EE. UU. como respaldo. Antes de empezar, le pedimos una breve toma de conocimiento:",
      bullets: [
        "No introduzca datos identificativos del cliente sin que este haya sido informado sobre el tratamiento por IA y (según el caso) haya consentido.",
        "El secreto profesional del abogado le corresponde a usted — Caelex asume las obligaciones del encargado de tratamiento según DPA § 10a (Anexo de Secreto Profesional).",
        "Las entradas NO se utilizan para entrenar los modelos de IA (Anthropic Zero-Data-Retention).",
        "Los mecanismos de auditoría y anonimización se describen en /legal/dpa § 10a.",
      ],
      routing:
        "Ruta activa: preferida EU-Bedrock (Fráncfort/Irlanda), respaldo Anthropic-EE. UU. Configuración visible en src/lib/atlas/anthropic-client.ts.",
      accept: "Entendido — usar Atlas",
      cancel: "Cancelar",
    },
    banner: {
      text: "Las entradas van a Anthropic (EU-Bedrock preferido). Sin datos identificativos sin consentimiento del cliente.",
      learnMore: "Privacidad",
    },
  },
};

export function getCopy(language: string): ChatPrivacyCopy {
  const lang = (language as ChatPrivacyLanguage) in COPY ? language : "en";
  return COPY[lang as ChatPrivacyLanguage];
}
