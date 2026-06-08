/**
 * Caelex Scholar — Planspiele catalog/chrome namespace (`planspiele`).
 *
 * Catalog page + brief/role-pick chrome. Scenario-specific strings (the ASI
 * flagship, rubric feedback, coach notes) live in the `planspiele-play` namespace.
 *
 * Resolve with: t(locale, PLANSPIELE, "key")
 * EN is the source of truth. FR/ES are MVP stubs ({}) — t() falls back to EN.
 */
import type { ScholarNamespace } from "./core";

export const PLANSPIELE = {
  en: {
    pageTitle: "Planspiele",
    pageSubtitle: "Work real space-law scenarios in role — like in practice.",
    eyebrow: "Practice",
    startCta: "Take the role & start",
    difficultyIntro: "Intro",
    difficultyIntermediate: "Intermediate",
    difficultyAdvanced: "Advanced",
    minutes: "min",
    roleLabel: "Your role",
    attemptsLabel: "Past attempts",
    attemptsNone: "Not started yet",
    fictionContractTitle: "Before you start",
    fictionContract:
      "This is a safe-to-fail exercise. Mistakes are part of the learning and are surfaced only in the debrief.",
    rolesHeading: "Roles",
    briefHeading: "The brief",
    profileHeading: "Operator profile",
    aiPlaysCounterpart:
      "The AI plays the regulator and issues the deficiency notice.",
    empty: "No scenarios available yet.",
    instructorLink: "Instructor view",
    backToCatalog: "Back to Planspiele",
  },
  de: {
    pageTitle: "Planspiele",
    pageSubtitle:
      "Echte weltraumrechtliche Szenarien in einer Rolle bearbeiten — wie in der Praxis.",
    eyebrow: "Praxis",
    startCta: "Rolle übernehmen & starten",
    difficultyIntro: "Einstieg",
    difficultyIntermediate: "Fortgeschritten",
    difficultyAdvanced: "Anspruchsvoll",
    minutes: "Min.",
    roleLabel: "Deine Rolle",
    attemptsLabel: "Bisherige Versuche",
    attemptsNone: "Noch nicht begonnen",
    fictionContractTitle: "Bevor du startest",
    fictionContract:
      "Dies ist eine geschützte Übung. Fehler gehören zum Lernen und werden ausschließlich im Debrief besprochen.",
    rolesHeading: "Rollen",
    briefHeading: "Die Ausgangslage",
    profileHeading: "Betreiberprofil",
    aiPlaysCounterpart:
      "Die KI spielt die Regulierungsbehörde und stellt den Mängelbescheid aus.",
    empty: "Noch keine Szenarien verfügbar.",
    instructorLink: "Dozenten-Ansicht",
    backToCatalog: "Zurück zu den Planspielen",
  },
  it: {
    pageTitle: "Simulazioni",
    pageSubtitle:
      "Affronta scenari reali di diritto spaziale in un ruolo — come nella pratica.",
    eyebrow: "Pratica",
    startCta: "Assumi il ruolo e inizia",
    difficultyIntro: "Base",
    difficultyIntermediate: "Intermedio",
    difficultyAdvanced: "Avanzato",
    minutes: "min",
    roleLabel: "Il tuo ruolo",
    attemptsLabel: "Tentativi precedenti",
    attemptsNone: "Non ancora iniziato",
    fictionContractTitle: "Prima di iniziare",
    fictionContract:
      "È un'esercitazione sicura: gli errori fanno parte dell'apprendimento e si discutono solo nel debriefing.",
    rolesHeading: "Ruoli",
    briefHeading: "Il caso",
    profileHeading: "Profilo dell'operatore",
    aiPlaysCounterpart:
      "L'IA interpreta l'autorità di regolamentazione ed emette la richiesta di integrazione.",
    empty: "Nessuno scenario disponibile.",
    instructorLink: "Vista docente",
    backToCatalog: "Torna alle simulazioni",
  },
  fr: {},
  es: {},
} as const satisfies ScholarNamespace;
