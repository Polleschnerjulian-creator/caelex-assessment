// src/data/legal-sources/translations-fr.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * French translations for ATLAS legal-source content. Mirrors the
 * shape of translations-de.ts so the registry pattern in index.ts
 * can pick up either map by language code without changing the
 * lookup logic.
 *
 * Currently a skeleton: covers the cross-cutting Atlas-wide sources
 * (sanctions, ITU, standards, insurance, EU programmes) plus the
 * canonical international treaties. National-source translations are
 * intentionally NOT here for FR jurisdictions — those sources already
 * carry French `title_local` in the source files (LOS, RTF, Décret),
 * so a fallback chain from the registry returns the correct French
 * label without duplicating it here.
 *
 * Adding a national source to this map is appropriate when the
 * canonical FR text doesn't already capture what a French lawyer
 * would expect to read — e.g. EU instruments where the French
 * official-journal version differs in wording from the English.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { TranslatedSource, TranslatedAuthority } from "./translations-de";

export const LEGAL_SOURCE_TRANSLATIONS_FR = new Map<string, TranslatedSource>([
  // ═══════════════════════════════════════════════════════════════════
  // INTERNATIONAL TREATIES
  // ═══════════════════════════════════════════════════════════════════

  [
    "INT-OST-1967",
    {
      title:
        "Traité sur l'espace extra-atmosphérique — Traité sur les principes régissant les activités des États en matière d'exploration et d'utilisation de l'espace extra-atmosphérique",
      provisions: {
        "Art. I": {
          title: "Liberté d'exploration et d'utilisation",
          summary:
            "L'espace extra-atmosphérique est ouvert à l'exploration et à l'utilisation par tous les États sur la base de l'égalité et conformément au droit international.",
        },
        "Art. II": {
          title: "Principe de non-appropriation",
          summary:
            "L'espace extra-atmosphérique et les corps célestes ne peuvent faire l'objet d'aucune appropriation nationale par revendication de souveraineté, par voie d'utilisation ou d'occupation, ni par aucun autre moyen.",
        },
        "Art. VI": {
          title: "Responsabilité de l'État et autorisation",
          summary:
            "Les États sont internationalement responsables des activités nationales menées dans l'espace extra-atmosphérique, qu'elles soient le fait des organismes gouvernementaux ou non gouvernementaux. La supervision continue par l'État compétent est requise.",
        },
      },
    },
  ],

  [
    "INT-LIABILITY-1972",
    {
      title:
        "Convention sur la responsabilité internationale pour les dommages causés par des objets spatiaux",
      scopeDescription:
        "Régit la responsabilité absolue des États de lancement pour les dommages causés à la surface de la Terre ou aux aéronefs en vol, et la responsabilité pour faute pour les dommages causés en orbite. Mise en œuvre nationale en France via le régime d'indemnisation de la LOS Art. 13.",
      provisions: {
        "Art. II": {
          title: "Responsabilité absolue pour dommages au sol",
          summary:
            "L'État de lancement a une responsabilité absolue pour les dommages causés par son objet spatial à la surface de la Terre ou aux aéronefs en vol.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // CROSS-CUTTING — sanctions, ITU, standards, EU programmes, insurance
  // ═══════════════════════════════════════════════════════════════════

  [
    "INT-EU-SANCTIONS-RU-833",
    {
      title:
        "Règlement (UE) n° 833/2014 — Sanctions sectorielles contre la Russie (avec les escalations 2022+ pour le secteur spatial)",
      scopeDescription:
        "Instrument opérationnel des sanctions de l'UE contre la Russie, durci à plusieurs reprises depuis février 2022 (16ème paquet en décembre 2024). Les annexes VII (haute technologie) et XXIII (biens industriels) couvrent les engins spatiaux, récepteurs GNSS, INS, viseurs d'étoiles et de nombreux composants segment-sol. L'annexe IV liste les utilisateurs finaux interdits. Directement applicable dans tous les États membres — prime sur tout arrangement contractuel et ne peut pas être écartée par choix de loi.",
      provisions: {
        "Art. 12g": {
          title: "Obligation de diligence anti-contournement",
          summary:
            "Les opérateurs doivent prendre des mesures positives pour empêcher la déviation par pays tiers vers la Russie. Le détournement via la Biélorussie, l'Asie centrale ou le Caucase est le piège de conformité le plus fréquent.",
        },
      },
    },
  ],

  [
    "INT-WASSENAAR",
    {
      title:
        "Arrangement de Wassenaar sur le contrôle des exportations d'armes conventionnelles et de biens et technologies à double usage",
      scopeDescription:
        "Régime plurilatéral de contrôle des exportations entre 42 États participants avec listes de contrôle communes (Liste des munitions et Liste des biens à double usage). Les listes de la Réglementation européenne 2021/821 sur le double usage, de l'EAR américaine, de l'ECO 2008 britannique, de la FEFTA japonaise et de la DSGL australienne dérivent toutes leur structure des listes Wassenaar. Mises à jour annuelles en plénière, reflétées dans les listes nationales avec un décalage de 6 à 18 mois.",
      provisions: {},
    },
  ],

  [
    "INT-ITU-RR",
    {
      title: "Règlement des radiocommunications de l'UIT",
      scopeDescription:
        "Instrument international de rang conventionnel régissant l'attribution des fréquences radioélectriques et l'orbite des satellites géostationnaires. Lie 194 États membres de l'UIT et constitue la couche internationale au-dessus de chaque régime national de licences de fréquences. L'article 5 (Attribution des fréquences), l'article 9 (Procédures de coordination), l'article 11 (Notification) et l'article 22 (Services spatiaux) sont les dispositions opérationnelles pour tout système satellitaire commercial.",
      provisions: {
        "Art. 9": {
          title: "Coordination — API, CR/C et bilatéral",
          summary:
            "Procédure par laquelle un réseau satellitaire est coordonné avec les administrations potentiellement affectées. L'API (Advance Publication Information) ouvre la procédure ; le CR/C (Coordination Request) déclenche les obligations de coordination bilatérale ; les délais sont typiquement de 2 à 7 ans pour les réseaux GEO.",
        },
      },
    },
  ],

  [
    "INT-ISO-24113",
    {
      title:
        "ISO 24113 — Systèmes spatiaux : Exigences relatives à la mitigation des débris spatiaux",
      scopeDescription:
        "Norme ISO de premier niveau sur la mitigation des débris adoptée comme référence technique par pratiquement chaque autorité nationale qui réglemente l'activité spatiale non gouvernementale. Spécifie des exigences quantitatives sur la durée de vie orbitale (LEO ≤ 25 ans), la passivation, l'élimination en fin de vie, les seuils de risque de victimes et la conception en vue de l'élimination. Citée par le RTF-2011 français, les SLR Rules 2019 australiennes, la loi japonaise sur les activités spatiales et la règle FCC PMD à 5 ans.",
      provisions: {
        "Cl. 6.6 — Casualty risk": {
          title: "Seuil de risque de 1 sur 10 000",
          summary:
            "La rentrée non contrôlée des engins spatiaux et lanceurs doit présenter un risque de victimes inférieur à 1 sur 10 000 par événement — seuil quantitatif repris dans les règles d'autorisation de toutes les juridictions.",
        },
      },
    },
  ],

  [
    "EU-IRIS2-CONCESSION-2024",
    {
      title:
        "Règlement (UE) 2023/588 — Programme de connectivité sécurisée IRIS²",
      scopeDescription:
        "Établit le programme IRIS² (Infrastructure for Resilience, Interconnection and Security by Satellite) — une constellation à double usage gouvernementale et commerciale en MEO/LEO. Le contrat de concession IRIS² 2024 attribué au consortium SpaceRISE opérationnalise l'achat par le gouvernement de connectivité sécurisée jusqu'en 2040, avec des obligations explicites de cybersécurité, de chaîne d'approvisionnement et de conception ITAR-free.",
      provisions: {
        "Art. 9": {
          title: "Achat par concession",
          summary:
            "L'UE achète le service IRIS² de connectivité sécurisée via un contrat de concession attribué à un consortium (SpaceRISE : Eutelsat-OneWeb / SES / Hispasat / Airbus / Thales / OHB). Horizon de concession 2024-2040 avec paiements liés à des jalons.",
        },
      },
    },
  ],

  [
    "UK-INSURANCE-ACT-2015",
    {
      title: "Insurance Act 2015 (Royaume-Uni)",
      scopeDescription:
        "Modernise le droit anglais des contrats d'assurance et constitue la base juridique substantielle pour presque toutes les polices d'assurance spatiale placées chez les Lloyd's — couvertures de lancement, en orbite, responsabilité civile et risques politiques rédigées sur le marché de Londres pour les opérateurs mondiaux. Remplace la norme stricte de divulgation du Marine Insurance Act 1906 par un « duty of fair presentation » (§ 3) et réforme les conséquences de la violation, des garanties et des sinistres frauduleux.",
      provisions: {},
    },
  ],

  [
    "DE-VVG",
    {
      title: "Loi allemande sur les contrats d'assurance (VVG)",
      scopeDescription:
        "Loi-cadre allemande du droit des contrats régissant tout contrat d'assurance conclu sous le droit allemand — y compris les couvertures de responsabilité civile détenues pour satisfaire à une future Weltraumgesetz, les couvertures cyber motivées par NIS2 et les assurances de lancement et en orbite contractées par les opérateurs. Définit les obligations précontractuelles d'information (§§ 19-22), les règles de gestion des sinistres (§§ 100-115) et le régime de protection du consommateur qui distingue les polices allemandes des libellés du marché de Londres.",
      provisions: {},
    },
  ],

  [
    "INT-SPACE-RESOURCES-COMPARATOR",
    {
      title:
        "Ressources spatiales — Comparatif des régimes de propriété (US, LU, AE, JP)",
      scopeDescription:
        "Entrée de référence comparant les quatre juridictions ayant légiféré des droits commerciaux de propriété sur les ressources spatiales, ainsi que le Groupe de travail COPUOS sur les aspects juridiques des activités relatives aux ressources spatiales (actif depuis 2021). Les quatre régimes législatifs interprètent le principe de non-appropriation de l'article II du Traité de l'espace comme n'interdisant pas la propriété privée des ressources extraites, tout en divergeant en partie sur les implications de souveraineté. La Chine et la Russie rejettent l'interprétation des quatre régimes ; l'UE n'a pas légiféré.",
      provisions: {},
    },
  ],
]);

export const AUTHORITY_TRANSLATIONS_FR = new Map<string, TranslatedAuthority>([
  [
    "EU-EC",
    {
      name: "Commission européenne",
      mandate:
        "Propose la législation spatiale de l'UE (Space Act, règlement sur le programme spatial, IRIS²). DG DEFIS dirige la politique spatiale de l'UE. Applique les règlements de l'UE avec effet direct dans tous les États membres.",
    },
  ],
  [
    "EU-EUSPA",
    {
      name: "Agence de l'Union européenne pour le programme spatial",
      mandate:
        "Gère les programmes spatiaux de l'UE : Galileo, EGNOS, Copernicus, IRIS², GOVSATCOM. Responsable de l'accréditation de sécurité et de l'adoption commerciale.",
    },
  ],
  [
    "EU-ENISA",
    {
      name: "Agence de l'Union européenne pour la cybersécurité",
      mandate:
        "Centre d'expertise de l'UE en matière de cybersécurité. Publie le Space Threat Landscape, le cadre de cybersécurité spatiale et les orientations pour la mise en œuvre de la directive NIS2.",
    },
  ],
  [
    "FR-CNES",
    {
      name: "Centre national d'études spatiales",
      mandate:
        "Établissement public à caractère industriel et commercial sous l'autorité du Code de la recherche, mandaté pour mener la recherche spatiale, fournir des conseils techniques sur les demandes LOS, exercer la police spéciale au CSG et représenter la France dans la coopération spatiale internationale.",
    },
  ],
  [
    "FR-ANSSI",
    {
      name: "Agence nationale de la sécurité des systèmes d'information",
      mandate:
        "Autorité nationale française en matière de cybersécurité. Supervise les opérateurs d'importance vitale (OIV), les opérateurs de services essentiels (OSE) sous NIS et les entités essentielles/importantes sous NIS2. Critique pour les opérateurs satellitaires français classés comme OIV.",
    },
  ],
]);
