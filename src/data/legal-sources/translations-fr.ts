// src/data/legal-sources/translations-fr.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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

  // ═══════════════════════════════════════════════════════════════════
  // ADDITIONAL UN TREATIES & RESOLUTIONS (FR-coverage extension Option C)
  // Official French versions taken from UN treaty collection / UNOOSA.
  // ═══════════════════════════════════════════════════════════════════

  [
    "INT-RESCUE-1968",
    {
      title:
        "Accord sur le sauvetage des astronautes, le retour des astronautes et la restitution des objets lancés dans l'espace extra-atmosphérique",
      scopeDescription:
        "Convention de l'ONU élargissant l'art. V du Traité de l'espace : obligations détaillées d'assistance aux astronautes en détresse et de restitution des objets spatiaux retrouvés sur le territoire d'un État partie. Mise en œuvre nationale en France via la LOS Art. 19 (notification d'incident).",
      provisions: {
        "Art. 1": {
          title: "Notification d'incident",
          summary:
            "Toute Partie contractante qui apprend que l'équipage d'un engin spatial a subi un accident, est en détresse, ou a effectué un atterrissage forcé, en informe sans délai l'autorité de lancement et le Secrétaire général de l'ONU.",
        },
      },
    },
  ],
  [
    "INT-REGISTRATION-1975",
    {
      title:
        "Convention sur l'immatriculation des objets lancés dans l'espace extra-atmosphérique",
      scopeDescription:
        "Établit l'obligation pour chaque État de lancement de tenir un registre national des objets spatiaux et de notifier ces inscriptions au Secrétaire général de l'ONU pour le Registre tenu par UNOOSA. Mise en œuvre nationale en France via la LOS Art. 12 et le registre français des objets spatiaux tenu par le CNES.",
      provisions: {
        "Art. II": {
          title: "Registre national",
          summary:
            "Chaque État de lancement immatricule les objets spatiaux qu'il lance sur un registre approprié. Lorsqu'il y a deux ou plusieurs États de lancement, ils déterminent ensemble lequel d'entre eux immatricule l'objet.",
        },
        "Art. III": {
          title: "Registre de l'ONU",
          summary:
            "Le Secrétaire général de l'ONU tient un registre central public où sont consignés les renseignements fournis. Délai de notification : aussitôt que possible.",
        },
      },
    },
  ],
  [
    "INT-MOON-1979",
    {
      title:
        "Accord régissant les activités des États sur la Lune et les autres corps célestes",
      scopeDescription:
        "Convention de l'ONU étendant les principes du Traité de l'espace aux activités sur la Lune et les autres corps célestes du système solaire. Faiblement ratifié (18 États parties au 31 mars 2024) ; aucune des grandes puissances spatiales (États-Unis, Russie, Chine, France, Royaume-Uni, Inde, Japon) ne l'a ratifié. Référence interprétative pour le débat sur le patrimoine commun de l'humanité.",
      provisions: {
        "Art. 11": {
          title: "Patrimoine commun de l'humanité",
          summary:
            "La Lune et ses ressources naturelles constituent le patrimoine commun de l'humanité. Les États parties s'engagent à établir un régime international régissant l'exploitation des ressources lunaires lorsque celle-ci sera sur le point de devenir possible.",
        },
      },
    },
  ],
  [
    "INT-LEGAL-PRINCIPLES-1963",
    {
      title:
        "Déclaration des principes juridiques régissant les activités des États en matière d'exploration et d'utilisation de l'espace extra-atmosphérique (résolution 1962 (XVIII) de l'AGNU)",
      scopeDescription:
        "Première déclaration de principes onusienne consacrée à l'espace, adoptée à l'unanimité par l'Assemblée générale en 1963. Codifie les principes de liberté d'exploration, de non-appropriation, de responsabilité internationale et d'assistance aux astronautes — base du futur Traité de l'espace de 1967.",
      provisions: {},
    },
  ],
  [
    "INT-PTBT-1963",
    {
      title: "Traité d'interdiction partielle des essais nucléaires (PTBT)",
      scopeDescription:
        "Traité multilatéral interdisant les essais nucléaires dans l'atmosphère, sous l'eau et dans l'espace extra-atmosphérique. Constitue le fondement de l'interdiction des essais nucléaires en orbite, complété par l'art. IV du Traité de l'espace de 1967.",
      provisions: {},
    },
  ],
  [
    "INT-CTBT-1996",
    {
      title:
        "Traité d'interdiction complète des essais nucléaires (TICEN/CTBT)",
      scopeDescription:
        "Traité multilatéral interdisant TOUS les essais d'armes nucléaires dans tous les milieux. Non encore en vigueur (Annexe 2 incomplète) mais largement respecté de facto. Pertinent pour la qualification d'« essai nucléaire » d'expériences orbitales avec matières fissiles.",
      provisions: {},
    },
  ],
  [
    "INT-ARTEMIS-ACCORDS-2020",
    {
      title:
        "Accords Artemis — Principes de coopération en matière d'exploration et d'utilisation civiles de la Lune, de Mars, des comètes et des astéroïdes à des fins pacifiques",
      scopeDescription:
        "Cadre multilatéral non contraignant initié par les États-Unis (NASA + Department of State) le 13 octobre 2020, signé à ce jour par 56 États (mai 2026). Précise les modalités opérationnelles d'exploration spatiale civile : interopérabilité, transparence, immatriculation, déconfliction, zones de sécurité, préservation du patrimoine spatial, libération de données scientifiques. Signataires européens : Royaume-Uni, France, Italie, Allemagne, Pologne, Pays-Bas, Espagne, Suède, République tchèque, Roumanie, Bulgarie, Lituanie.",
      provisions: {
        "Sec. 11": {
          title: "Zones de sécurité (« safety zones »)",
          summary:
            "Les signataires reconnaissent que les opérations sur les corps célestes peuvent nécessiter l'établissement de zones de sécurité visant à éviter les interférences nuisibles. Notification + coordination requises ; absence d'appropriation territoriale au sens de l'art. II du Traité de l'espace.",
        },
      },
    },
  ],
  [
    "INT-LTS-2019",
    {
      title:
        "Lignes directrices aux fins de la viabilité à long terme des activités spatiales (UN COPUOS LTS Guidelines)",
      scopeDescription:
        "21 lignes directrices adoptées par consensus en juin 2019 par le COPUOS, couvrant la sécurité opérationnelle, la coordination, les débris spatiaux, la météorologie spatiale et la coopération internationale. Document de référence non contraignant que de nombreuses NCA ont intégré dans leurs régimes d'autorisation (notamment FR via la LOS, IT via la Loi 89/2025, UK via la SIA 2018).",
      provisions: {},
    },
  ],
  [
    "INT-DIRECT-BROADCASTING-1982",
    {
      title:
        "Principes régissant l'utilisation par les États de satellites artificiels de la Terre aux fins de la télévision directe internationale (résolution 37/92 de l'AGNU)",
      scopeDescription:
        "Résolution de l'Assemblée générale codifiant les principes applicables aux services de télédiffusion par satellite : compatibilité avec le droit à l'information, droits souverains des États récepteurs, consultation préalable. Base interprétative pour les services satellitaires DTH modernes.",
      provisions: {},
    },
  ],
  [
    "INT-REMOTE-SENSING-1986",
    {
      title:
        "Principes sur la télédétection de la Terre depuis l'espace (résolution 41/65 de l'AGNU)",
      scopeDescription:
        "15 principes adoptés en 1986 par l'Assemblée générale de l'ONU sur la télédétection : libre accès aux données primaires, accès non discriminatoire des États sondés aux données secondaires, coopération internationale. Document de référence pour le régime de licences EO civil/militaire.",
      provisions: {},
    },
  ],
  [
    "INT-NPS-1992",
    {
      title:
        "Principes relatifs à l'utilisation de sources d'énergie nucléaires dans l'espace extra-atmosphérique (résolution 47/68 de l'AGNU)",
      scopeDescription:
        "Cadre adopté en 1992 par l'AGNU régissant l'utilisation de sources d'énergie nucléaires (RTG, réacteurs) dans les missions spatiales : limites de puissance, restrictions LEO, exigences de notification et de réentrée sécurisée. Mise en œuvre via UN-IAEA Safety Framework 2009.",
      provisions: {},
    },
  ],
  [
    "INT-IADC-MITIGATION-2002",
    {
      title:
        "Lignes directrices de l'IADC pour la mitigation des débris spatiaux (version 2002)",
      scopeDescription:
        "Première version des lignes directrices de l'Inter-Agency Space Debris Coordination Committee (IADC) — base technique reprise par les COPUOS Debris Mitigation Guidelines de 2007. Définit la durée de vie LEO ≤ 25 ans, les exigences de passivation, les seuils de risque de victimes 1/10 000 et les protocoles d'évitement de collision.",
      provisions: {},
    },
  ],
  [
    "INT-IADC-MITIGATION-2020",
    {
      title:
        "Lignes directrices de l'IADC pour la mitigation des débris spatiaux (révision 2020)",
      scopeDescription:
        "Révision majeure 2020 des lignes directrices IADC : durée de vie LEO réduite à 5 ans pour les opérations à grande échelle, fiabilité de désorbitation post-mission ≥ 0,9, modélisation explicite du risque cumulé pour les constellations. Citée par la règle FCC PMD à 5 ans (2022) et l'ESA Zero Debris Approach (2023).",
      provisions: {},
    },
  ],
  [
    "INT-IADC-MITIGATION-2025",
    {
      title:
        "Lignes directrices de l'IADC pour la mitigation des débris spatiaux (révision 2025)",
      scopeDescription:
        "Révision 2025 des lignes directrices IADC, intégrant les résultats du programme Zero Debris ESA et les retours d'expérience de l'augmentation des constellations à grande échelle (Starlink, OneWeb, Kuiper). Renforce les exigences de fiabilité de désorbitation et introduit des protocoles de coordination de manœuvres entre opérateurs.",
      provisions: {},
    },
  ],
  [
    "INT-COPUOS-DEBRIS-2007",
    {
      title:
        "Lignes directrices du COPUOS relatives à la réduction des débris spatiaux",
      scopeDescription:
        "Adoptées par consensus par le COPUOS en 2007 et endossées par l'AGNU (résolution 62/217). Sept lignes directrices opérationnelles dérivées de l'IADC 2002. Document non contraignant mais quasi universellement intégré dans les régimes nationaux d'autorisation (LOS Art. 5 et 6, SatDSiG, OSA 1986, SIA 2018).",
      provisions: {},
    },
  ],
  [
    "INT-ESA-ZERO-DEBRIS-CHARTER",
    {
      title: "Charte « Zero Debris » de l'Agence spatiale européenne",
      scopeDescription:
        "Charte volontaire ESA lancée en 2023 engageant les signataires à viser zéro débris durable d'ici 2030 sur leurs missions LEO. Plus de 100 signataires (mai 2026), incluant ArianeGroup, Thales Alenia Space, Airbus Defence and Space, OHB, GomSpace, ICEYE, ClearSpace.",
      provisions: {},
    },
  ],
  [
    "INT-HCOC-2002",
    {
      title:
        "Code de conduite de La Haye contre la prolifération des missiles balistiques (HCoC)",
      scopeDescription:
        "Code de conduite politique multilatéral signé en 2002 à La Haye, comptant 145 États souscripteurs (mai 2026). Engagements de transparence sur les programmes de missiles balistiques et de lanceurs spatiaux : déclarations annuelles, notifications préalables de tirs. Pertinent pour les opérateurs de lanceurs européens (Arianespace, RFA, Isar Aerospace).",
      provisions: {},
    },
  ],
  [
    "INT-MTCR",
    {
      title: "Régime de contrôle de la technologie des missiles (MTCR)",
      scopeDescription:
        "Régime informel multilatéral de contrôle des exportations regroupant 35 États partenaires. Annexe technique listant les biens et technologies de Catégorie I (missiles complets ≥ 500 kg / 300 km) et Catégorie II (composants, sous-systèmes, technologies). Pertinent pour les exportations de moteurs de lanceurs, systèmes de guidage et structures composites.",
      provisions: {},
    },
  ],
  [
    "INT-NSG",
    {
      title: "Groupe des fournisseurs nucléaires (NSG)",
      scopeDescription:
        "Régime informel multilatéral de contrôle des exportations nucléaires regroupant 48 États participants. Listes Trigger List et Dual-Use List. Pertinent pour les exportations de matériels nucléaires destinés à des missions spatiales (RTG, réacteurs, propulsion nucléaire).",
      provisions: {},
    },
  ],
  [
    "INT-AUSTRALIA-GROUP",
    {
      title: "Groupe d'Australie",
      scopeDescription:
        "Régime informel multilatéral de contrôle des exportations d'agents chimiques et biologiques regroupant 43 États participants + l'UE. Pertinent pour les exportations de précurseurs et matériaux pouvant être utilisés dans les ergols spatiaux.",
      provisions: {},
    },
  ],
  [
    "INT-ESA-CONV-1975",
    {
      title: "Convention portant création de l'Agence spatiale européenne",
      scopeDescription:
        "Convention signée le 30 mai 1975 à Paris instituant l'ESA. 22 États membres au 1er janvier 2026 (incluant Royaume-Uni post-Brexit). Régit la gouvernance, le financement, le retour géographique industriel et les programmes obligatoires/facultatifs.",
      provisions: {
        "Art. V": {
          title: "Activités obligatoires et facultatives",
          summary:
            "Distingue les activités obligatoires (Programme scientifique, contributions de base — financement par PIB) des activités facultatives (programmes opérationnels — contributions à la carte selon l'intérêt national).",
        },
      },
    },
  ],
  [
    "INT-NATO-SPACE-POLICY-2022",
    {
      title: "Politique spatiale globale de l'OTAN (2022)",
      scopeDescription:
        "Politique adoptée par l'OTAN en juin 2022 reconnaissant l'espace comme cinquième domaine opérationnel (après terre, mer, air, cyber). Cadre pour la coopération entre alliés sur la connaissance de la situation spatiale, les communications par satellite et la résilience des systèmes spatiaux militaires.",
      provisions: {},
    },
  ],
  [
    "INT-UNGA-1721B-1961",
    {
      title:
        "Coopération internationale touchant les utilisations pacifiques de l'espace extra-atmosphérique (résolution 1721 B (XVI) de l'AGNU)",
      scopeDescription:
        "Résolution fondatrice de 1961 invitant les États à immatriculer leurs objets spatiaux auprès du Secrétaire général de l'ONU. Précurseur de la Convention sur l'immatriculation de 1975.",
      provisions: {},
    },
  ],
  [
    "INT-UNGA-59-115-2004",
    {
      title:
        "Application de la notion d'« État de lancement » (résolution 59/115 de l'AGNU)",
      scopeDescription:
        "Résolution adoptée en 2004 invitant les États à clarifier dans leur droit interne la notion d'« État de lancement » au sens de la Convention sur la responsabilité et de la Convention sur l'immatriculation. Pertinente pour l'attribution des charges utiles à bord de lancements multinationaux (rideshare).",
      provisions: {},
    },
  ],
  [
    "INT-UNGA-62-101-2007",
    {
      title:
        "Pratiques recommandées pour l'immatriculation des objets spatiaux (résolution 62/101 de l'AGNU)",
      scopeDescription:
        "Résolution adoptée en 2007 recommandant des pratiques d'immatriculation harmonisées : informations supplémentaires à fournir au-delà du minimum de la Convention de 1975 (orbite, fonction générale, etc.). Adoptées par la France via la pratique du registre tenu par le CNES.",
      provisions: {},
    },
  ],
  [
    "INT-UNGA-68-74-2013",
    {
      title:
        "Recommandations sur la législation nationale relative à l'exploration et à l'utilisation pacifiques de l'espace extra-atmosphérique (résolution 68/74 de l'AGNU)",
      scopeDescription:
        "Résolution adoptée en 2013 énonçant huit éléments recommandés pour les législations nationales spatiales : champ d'application, autorisation, supervision continue, immatriculation, transfert d'autorisation, sanctions, etc. Référence pour les législations nationales modernes (LOS française, SIA 2018 britannique, Loi 89/2025 italienne).",
      provisions: {},
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // EU REGULATIONS & DIRECTIVES (FR-coverage extension Option C)
  // Official French versions from EUR-Lex.
  // ═══════════════════════════════════════════════════════════════════

  [
    "EU-SPACE-PROGRAMME-REG-696-2021",
    {
      title:
        "Règlement (UE) 2021/696 établissant le programme spatial de l'Union et l'Agence de l'Union européenne pour le programme spatial",
      scopeDescription:
        "Règlement-cadre du programme spatial de l'UE pour la période 2021-2027 (budget 14,88 Md€). Couvre Galileo, EGNOS, Copernicus, GOVSATCOM et SST. Crée l'EUSPA (successeur de la GSA). Directement applicable dans tous les États membres.",
      provisions: {},
    },
  ],
  [
    "EU-NIS2-2022-2555",
    {
      title:
        "Directive (UE) 2022/2555 sur la cybersécurité dans l'ensemble de l'Union (NIS2)",
      scopeDescription:
        "Directive transposée en France par la Loi Résilience (juillet 2024). Désigne le secteur spatial comme secteur de haute criticité (Annexe I), incluant les opérateurs de stations sol, les fabricants de satellites et les fournisseurs de services satellitaires. Obligations : mesures de gestion des risques cyber, notification d'incident en 24 h, supervision par l'ANSSI en France.",
      provisions: {
        "Art. 21": {
          title: "Mesures de gestion des risques en matière de cybersécurité",
          summary:
            "Les entités essentielles et importantes prennent des mesures techniques, opérationnelles et organisationnelles appropriées et proportionnées pour gérer les risques qui pèsent sur la sécurité des réseaux et des systèmes d'information.",
        },
        "Art. 23": {
          title: "Obligations de notification",
          summary:
            "Notification d'incident significatif sans retard injustifié et au plus tard dans les 24 heures (alerte précoce), 72 heures (notification d'incident), un mois (rapport final).",
        },
      },
    },
  ],
  [
    "EU-CRA-2024-2847",
    {
      title:
        "Règlement (UE) 2024/2847 sur la cyber-résilience des produits comportant des éléments numériques (CRA)",
      scopeDescription:
        "Règlement adopté en 2024 introduisant des obligations cybersécurité pour les fabricants, importateurs et distributeurs de produits comportant des éléments numériques. Pertinent pour les composants satellitaires (RF, OBC, payloads) commercialisés sur le marché de l'UE. Pleine application : décembre 2027.",
      provisions: {},
    },
  ],
  [
    "EU-DUAL-USE-2021-821",
    {
      title:
        "Règlement (UE) 2021/821 instituant un régime de l'Union de contrôle des exportations, du courtage, de l'assistance technique, du transit et des transferts en ce qui concerne les biens à double usage",
      scopeDescription:
        "Règlement directement applicable régissant les exportations de biens à double usage hors UE et les transferts intra-UE de biens hautement sensibles. Annexe I (liste de contrôle commune) couvre la catégorie 9 « Aérospatial et propulsion » et la catégorie 5A (cryptographie). Compétent en France : SBDU/MinÉco ; en Allemagne : BAFA ; aux Pays-Bas : CDIU.",
      provisions: {},
    },
  ],
  [
    "EU-IRIS2-CONCESSION-2024",
    {
      title:
        "Règlement (UE) 2024/1054 établissant le programme de connectivité sécurisée de l'Union pour 2023-2027 (IRIS²)",
      scopeDescription:
        "Règlement adoptant le programme IRIS² (Infrastructure for Resilience, Interconnectivity and Security by Satellite) — constellation multi-orbite gouvernementale-commerciale de 290 satellites. Budget 10,6 Md€ (UE 2,4 Md€ + ESA 0,6 Md€ + privé 7,5 Md€). Concession attribuée en 2024 au consortium SpaceRISE (Eutelsat, SES, Hispasat).",
      provisions: {},
    },
  ],
  [
    "EU-SST-DEC-541-2014",
    {
      title:
        "Décision n° 541/2014/UE établissant un cadre de soutien à la surveillance de l'espace et au suivi des objets en orbite (SST)",
      scopeDescription:
        "Décision adoptée en 2014 établissant le cadre EU SST. Consortium initial composé de la France (CNES), de l'Allemagne (DLR), de l'Italie (ASI), de l'Espagne, du Royaume-Uni (avant Brexit) et de la Pologne. Services rendus : conjonctions, rentrées, fragmentations.",
      provisions: {},
    },
  ],
  [
    "EU-RESILIENCE-DIR-2557-2022",
    {
      title:
        "Directive (UE) 2022/2557 sur la résilience des entités critiques (CER)",
      scopeDescription:
        "Directive « jumelle » de NIS2 portant sur la résilience physique (et non cyber) des entités critiques. Inclut le secteur spatial (Annexe I) parmi les onze secteurs concernés. Transposition nationale : France via la Loi Résilience.",
      provisions: {},
    },
  ],
  [
    "EU-GDPR-2016-679",
    {
      title:
        "Règlement (UE) 2016/679 relatif à la protection des personnes physiques à l'égard du traitement des données à caractère personnel et à la libre circulation de ces données (RGPD)",
      scopeDescription:
        "Règlement-cadre européen sur la protection des données. Applicable au traitement de données personnelles issues de l'observation de la Terre (imagerie haute résolution), de la géolocalisation (GNSS) et des télécommunications par satellite. Compétent en France : CNIL.",
      provisions: {},
    },
  ],
  [
    "EU-CRITICAL-RAW-MATERIALS-ACT-2024",
    {
      title:
        "Règlement (UE) 2024/1252 établissant un cadre visant à garantir un approvisionnement sûr et durable en matières premières critiques (CRMA)",
      scopeDescription:
        "Règlement adopté en avril 2024 visant à sécuriser l'approvisionnement de l'UE en 34 matières premières critiques et 17 matières premières stratégiques. Pertinent pour la chaîne d'approvisionnement spatiale (béryllium, gallium, germanium, terres rares pour aimants permanents).",
      provisions: {},
    },
  ],
  [
    "EU-SECURE-CONNECTIVITY-2023-588",
    {
      title:
        "Règlement (UE) 2023/588 établissant le programme de connectivité sécurisée de l'Union (cadre amont d'IRIS²)",
      scopeDescription:
        "Règlement-cadre adopté en mars 2023 préparant le programme IRIS². Définit les principes, la gouvernance et les modalités de financement avant l'attribution effective de la concession en 2024.",
      provisions: {},
    },
  ],
]);

// FR-coverage extension (Option C): expanded from 5 to 93 priority
// authorities — all UN/INT, all EU, plus DE/FR/UK/US/IT/ES/NL national
// authorities. Smaller-jurisdiction national authorities (AT, BE, CH,
// CZ, DK, FI, GR, IE, LU, NO, PL, PT, SE) intentionally NOT here yet —
// those should be filled by a content-production sprint with native-
// speaker counsel review per jurisdiction. Lookup falls back to the
// English source in the meantime via the registry undefined-contract.
//
// Sorted alphabetically by ID (stable diff when adding entries).
export const AUTHORITY_TRANSLATIONS_FR = new Map<string, TranslatedAuthority>([
  [
    "DE-AA",
    {
      name: "Office fédéral des Affaires étrangères (Auswärtiges Amt)",
      mandate:
        "Représente l'Allemagne au sein du COPUOS de l'ONU et d'autres instances internationales du droit spatial. Compétent pour les processus de ratification des traités et les aspects diplomatiques des activités spatiales (respect de l'article VI du Traité de l'espace).",
    },
  ],
  [
    "DE-BAFA",
    {
      name: "Office fédéral de l'économie et du contrôle des exportations (BAFA)",
      mandate:
        "Autorité compétente pour les autorisations SatDSiG (observation de la Terre haute résolution). Gère également les contrôles à l'exportation à double usage et militaires pour les technologies spatiales selon l'AWG/AWV et le règlement UE 2021/821.",
    },
  ],
  [
    "DE-BMVG",
    {
      name: "Ministère fédéral de la Défense — Commandement spatial (Weltraumkommando)",
      mandate:
        "Exploite le Commandement spatial à Uedem pour la connaissance de la situation spatiale militaire. Compétent pour les systèmes satellitaires de la Bundeswehr et la politique de sécurité spatiale.",
    },
  ],
  [
    "DE-BMWK",
    {
      name: "Ministère fédéral de l'Économie et de la Protection du climat (BMWK)",
      mandate:
        "Ministère chef de file pour la politique spatiale. Future autorité d'autorisation dans le cadre d'une loi spatiale nationale. Actuellement compétent pour la mise en œuvre du SatDSiG et coordonne le rôle d'agence spatiale du DLR.",
    },
  ],
  [
    "DE-BNETZA",
    {
      name: "Bundesnetzagentur — Agence fédérale des réseaux",
      mandate:
        "Attribue les radiofréquences pour les communications par satellite, le TT&C et les liaisons de charge utile selon le § 91 TKG. Soumet les notifications UIT au nom des opérateurs allemands. Délivre les licences de spectre. Fait appliquer les exigences de sécurité des télécommunications (§ 165 TKG).",
    },
  ],
  [
    "DE-BSI",
    {
      name: "Office fédéral de la sécurité dans les technologies de l'information (BSI)",
      mandate:
        "Évaluations de conformité en cybersécurité selon le SatDSiG (TR-03140). Publie la TR-03184 (cybersécurité du segment spatial et du segment sol). Autorité nationale de surveillance NIS2 pour les infrastructures critiques, secteur spatial inclus (BSIG §§ 30-31).",
    },
  ],
  [
    "DE-DLR",
    {
      name: "Centre allemand de recherche aérospatiale (DLR) — Agence spatiale",
      mandate:
        "Gère le programme spatial national allemand pour le compte du BMWK. Représente l'Allemagne dans la gouvernance de l'ESA. Établit des évaluations techniques pour les décisions d'autorisation. Exploite le German Space Situational Awareness Centre (GSSAC).",
    },
  ],
  [
    "DE-LBA",
    {
      name: "Office fédéral de l'aviation (LBA)",
      mandate:
        "Réglemente le transit des lanceurs dans l'espace aérien allemand selon le § 1(2) LuftVG. Délivre les arrêtés de restriction d'espace aérien et coordonne avec le contrôle aérien militaire pour les fenêtres de tir.",
    },
  ],
  [
    "ES-AEE",
    {
      name: "Agence spatiale espagnole (AEE)",
      mandate:
        "Créée par le RD 158/2023, opérationnelle depuis le 20 avril 2023. Siège à Séville. Gère les contributions à l'ESA, coordonne la politique spatiale nationale et est mandatée pour proposer l'avant-projet de loi sur les activités spatiales (Anteproyecto de Ley de Actividades Espaciales). N'est PAS actuellement une autorité de licence/réglementation.",
    },
  ],
  [
    "ES-AEMET",
    {
      name: "Agence météorologique espagnole (AEMET)",
      mandate:
        "Agence d'État sous le ministère de la Transition écologique. Représentant espagnol auprès d'EUMETSAT. Pilote le SAF Nowcasting (NWC SAF) d'EUMETSAT.",
    },
  ],
  [
    "ES-AEPD",
    {
      name: "Agence espagnole de protection des données (AEPD)",
      mandate:
        "Autorité de contrôle indépendante en vertu de la LO 3/2018 (LOPDGDD). Supervise le traitement des données à caractère personnel issues de l'imagerie satellitaire et des données d'observation de la Terre.",
    },
  ],
  [
    "ES-CCN",
    {
      name: "Centre cryptologique national (CCN)",
      mandate:
        "Autorité nationale de cybersécurité sous le CNI. Gère l'Esquema Nacional de Seguridad (ENS). Mise en œuvre de NIS2 en attente — l'Espagne n'a pas respecté l'échéance d'octobre 2024.",
    },
  ],
  [
    "ES-CDTI",
    {
      name: "Centre pour le développement technologique et industriel (CDTI)",
      mandate:
        "Créé en 1977. Établissement public d'entreprise sous le ministère des Sciences. Historiquement la délégation espagnole auprès de l'ESA. L'AEE a repris les fonctions liées à l'ESA, le CDTI conserve l'exécution des programmes.",
    },
  ],
  [
    "ES-CNMC",
    {
      name: "Commission nationale des marchés et de la concurrence (CNMC)",
      mandate:
        "Autorité de régulation indépendante. Autorité nationale de régulation des communications électroniques, services satellitaires inclus. Gère le registre des opérateurs de télécommunications.",
    },
  ],
  [
    "ES-CNSA",
    {
      name: "Conseil national de la sécurité aérospatiale (CNSA)",
      mandate:
        "Organe d'appui du Conseil national de sécurité. Coordonne la politique de sécurité aérospatiale, y compris la stratégie ESAN-2025.",
    },
  ],
  [
    "ES-INTA",
    {
      name: "Institut national de technique aérospatiale (INTA)",
      mandate:
        "Fondé en 1942. Établissement public de recherche sous le ministère de la Défense. ~1 500 collaborateurs. Essais aérospatiaux, construction satellitaire, exploitation de stations sol (MDSCC, Maspalomas). El Arenosillo (CEDEA) — site de lancement du PLD Space MIURA 1.",
    },
  ],
  [
    "ES-JIMDDU",
    {
      name: "Commission interministérielle pour les biens de défense et le commerce à double usage (JIMDDU)",
      mandate:
        "Commission interministérielle examinant au cas par cas TOUTES les demandes d'autorisation d'exportation de matériels de défense et de technologies à double usage. Émet des avis contraignants.",
    },
  ],
  [
    "ES-MAEC",
    {
      name: "Ministère des Affaires étrangères, de l'UE et de la Coopération",
      mandate:
        "Obligations conventionnelles et représentation diplomatique au COPUOS. Gère le Registro Español de Objetos Espaciales (coordonné via l'AEE).",
    },
  ],
  [
    "ES-MINCIENCIA",
    {
      name: "Ministère des Sciences, de l'Innovation et des Universités",
      mandate:
        "Ministère de tutelle de la politique spatiale. Tutelle principale de l'AEE. Tutelle du CDTI.",
    },
  ],
  [
    "ES-MOD",
    {
      name: "Ministère de la Défense — Forces aérospatiales / MESPA",
      mandate:
        "Ejército del Aire y del Espacio depuis 2022. MESPA (Commandement spatial) depuis 2023. Co-tutelle de l'AEE. Tutelle de l'INTA.",
    },
  ],
  [
    "ES-SETID",
    {
      name: "Secrétariat d'État aux Télécommunications et Infrastructures numériques (SETID)",
      mandate:
        "Principale autorité espagnole de gestion du spectre. Gère la planification et l'attribution du spectre radioélectrique, y compris les ressources orbite-spectre satellitaires. Tient le CNAF. Soumet les notifications de réseaux satellitaires à l'UIT.",
    },
  ],
  [
    "EU-EC",
    {
      name: "Commission européenne",
      mandate:
        "Propose la législation spatiale de l'UE (Space Act, règlement sur le programme spatial, IRIS²). DG DEFIS dirige la politique spatiale de l'UE. Applique les règlements de l'UE avec effet direct dans tous les États membres.",
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
    "EU-EUSPA",
    {
      name: "Agence de l'Union européenne pour le programme spatial",
      mandate:
        "Gère les programmes spatiaux de l'UE : Galileo, EGNOS, Copernicus, IRIS², GOVSATCOM. Responsable de l'accréditation de sécurité et de l'adoption commerciale.",
    },
  ],
  [
    "FR-ANFR",
    {
      name: "Agence nationale des fréquences (ANFR)",
      mandate:
        "Soumet à l'UIT les notifications de fréquences et les demandes de coordination pour le compte de la France. Gère le tableau national de répartition des fréquences. Coordonne l'utilisation du spectre entre utilisateurs civils, militaires et scientifiques.",
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
  [
    "FR-ARCEP",
    {
      name: "Autorité de régulation des communications électroniques, des postes et de la distribution de la presse (ARCEP)",
      mandate:
        "Autorisations de fréquences satellitaires en vertu du Code des postes et des communications électroniques. Régule les opérateurs de haut débit par satellite.",
    },
  ],
  [
    "FR-ASN",
    {
      name: "Autorité de sûreté nucléaire (ASN)",
      mandate:
        "Sûreté nucléaire pour les engins spatiaux à propulsion nucléaire et les générateurs thermoélectriques à radio-isotopes (RTG). Supervise les missions impliquant des matières nucléaires sous juridiction française.",
    },
  ],
  [
    "FR-CDE",
    {
      name: "Commandement de l'Espace (CDE)",
      mandate:
        "Commandement militaire des opérations spatiales. Assure la connaissance de la situation spatiale (SSA), la défense spatiale active et la surveillance de l'espace.",
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
    "FR-CNIL",
    {
      name: "Commission nationale de l'informatique et des libertés (CNIL)",
      mandate:
        "Autorité de protection des données pour les données d'observation de la Terre comportant des implications personnelles. Fait appliquer le RGPD et la loi Informatique et Libertés au traitement des géodonnées d'origine satellitaire.",
    },
  ],
  [
    "FR-DGA",
    {
      name: "Direction générale de l'Armement (DGA)",
      mandate:
        "Acquisition spatiale militaire et contrôle des technologies à double usage. Gère l'acquisition des systèmes satellitaires militaires (CSO, Syracuse, CERES).",
    },
  ],
  [
    "FR-DGAC",
    {
      name: "Direction générale de l'Aviation civile (DGAC)",
      mandate:
        "Gère les restrictions d'espace aérien lors des lancements depuis le CSG et coordonne les NOTAM pour les fenêtres de tir.",
    },
  ],
  [
    "FR-DRM",
    {
      name: "Direction du Renseignement militaire (DRM)",
      mandate:
        "Contrôle des charges utiles satellitaires militaires et exploitation du renseignement. Exploite le renseignement d'origine image (IMINT) de la constellation CSO. Examine les autorisations de charges utiles militaires.",
    },
  ],
  [
    "FR-MESR",
    {
      name: "Ministère de l'Enseignement supérieur et de la Recherche (MESR)",
      mandate:
        "Principal ministère de tutelle du CNES. Supervise les dispositions du Code de la recherche relatives à la mission, l'organisation et la gouvernance de l'agence spatiale.",
    },
  ],
  [
    "FR-MINARMES",
    {
      name: "Ministère des Armées",
      mandate:
        "Politique de défense spatiale. Auteur de la Stratégie spatiale de défense (2019). Co-tutelle du CNES. Compétent pour l'investissement spatial de la loi de programmation militaire (10,2 Md€ d'ici 2030).",
    },
  ],
  [
    "FR-MINECO",
    {
      name: "Ministère de l'Économie — Direction générale des entreprises (MinÉco/DGE)",
      mandate:
        "Chef de file pour la politique industrielle spatiale. Gère les investissements spatiaux France 2030 (1,5 Md€ au titre de l'objectif 9). Contrôles à l'exportation à double usage via le SBDU et la plateforme EGIDE.",
    },
  ],
  [
    "FR-PREFET-GUYANE",
    {
      name: "Préfet de la région Guyane",
      mandate:
        "Collectivité territoriale pour le CSG à Kourou. Coordonne la sécurité locale, les autorisations ICPE (installations classées), la supervision SEVESO et la protection de l'environnement pour les opérations de lancement.",
    },
  ],
  [
    "FR-SGDSN",
    {
      name: "Secrétariat général de la défense et de la sécurité nationale (SGDSN)",
      mandate:
        "Coordonne la politique nationale de sécurité spatiale. Gère le régime des données EO en vertu des art. 23-25 LOS. Auteur de la Stratégie nationale spatiale 2025-2040. Préside la CIEEMG (Commission interministérielle pour l'étude des exportations de matériels de guerre).",
    },
  ],
  [
    "INT-COPUOS",
    {
      name: "Comité des utilisations pacifiques de l'espace extra-atmosphérique (COPUOS)",
      mandate:
        "Organe des Nations unies régissant la coopération internationale en matière d'utilisation pacifique de l'espace. Élabore les lignes directrices sur la mitigation des débris spatiaux et la viabilité à long terme.",
    },
  ],
  [
    "INT-ITU",
    {
      name: "Union internationale des télécommunications (UIT)",
      mandate:
        "Institution spécialisée des Nations unies pour les technologies de l'information et de la communication. Tient le Master International Frequency Register (MIFR). Gère le Règlement des radiocommunications, y compris les limites EPFD de l'art. 22 et les jalons de mise en service NGSO de la Résolution 35.",
    },
  ],
  [
    "INT-UNOOSA",
    {
      name: "Bureau des affaires spatiales des Nations unies (UNOOSA)",
      mandate:
        "Promeut la coopération internationale dans l'utilisation pacifique de l'espace. Tient le Registre des Nations unies des objets lancés dans l'espace (Convention sur l'immatriculation, art. III). Secrétariat du Comité des utilisations pacifiques de l'espace extra-atmosphérique (COPUOS).",
    },
  ],
  [
    "IT-ACN",
    {
      name: "Agence nationale de cybersécurité (ACN)",
      mandate:
        "Autorité de cybersécurité pour le secteur spatial. Autorité NIS2 compétente classifiant le spatial comme secteur de haute criticité. Supervise le Perimetro di Sicurezza Nazionale Cibernetica pour les stations sol spatiales et les centres de contrôle de mission.",
    },
  ],
  [
    "IT-AGCOM",
    {
      name: "Autorité pour les garanties dans les communications (AGCOM)",
      mandate:
        "Régulation et licences de fréquences satellitaires. Gère les attributions de spectre pour les services satellitaires. Coordonne les notifications UIT pour les réseaux satellitaires italiens.",
    },
  ],
  [
    "IT-ASI",
    {
      name: "Agence spatiale italienne (ASI)",
      mandate:
        "Autorité technique de réglementation des activités spatiales. Effectue l'évaluation technique de 60 jours des demandes d'autorisation en vertu de l'art. 11 de la Loi 89/2025. Tient le registre national des objets spatiaux selon l'art. 14. Supervise la conformité continue des opérateurs autorisés.",
    },
  ],
  [
    "IT-COMINT",
    {
      name: "Comité interministériel pour la politique spatiale (COMINT)",
      mandate:
        "Coordination politique et planification stratégique pour le secteur spatial national. Approuve le Documento Strategico di Politica Spaziale Nazionale.",
    },
  ],
  [
    "IT-COS",
    {
      name: "Commandement des opérations spatiales (COS)",
      mandate:
        "Commandement militaire des opérations spatiales. Créé en juin 2020 au sein de l'Aeronautica Militare. Gère les communications par satellite SICRAL et l'observation de la Terre COSMO-SkyMed.",
    },
  ],
  [
    "IT-DIS",
    {
      name: "Département des informations pour la sécurité (DIS)",
      mandate:
        "Coordination du renseignement. Les activités spatiales menées à des fins de renseignement sont expressément exclues du régime d'autorisation civile en vertu de l'art. 28 de la Loi 89/2025.",
    },
  ],
  [
    "IT-ENAC",
    {
      name: "Autorité nationale de l'aviation civile (ENAC)",
      mandate:
        "Licences de vols spatiaux suborbitaux et réglementation des spaceports. A adopté les règlements SASO 2023 pour le spaceport de Grottaglie.",
    },
  ],
  [
    "IT-GARANTE",
    {
      name: "Autorité de protection des données (Garante)",
      mandate:
        "Autorité de protection des données pour l'imagerie d'observation de la Terre et les données personnelles d'origine satellitaire. Fait appliquer le RGPD et le Codice Privacy au traitement des données spatiales.",
    },
  ],
  [
    "IT-MAECI-UAMA",
    {
      name: "Ministère des Affaires étrangères — Unité pour les autorisations de matériels d'armement (MAECI/UAMA)",
      mandate:
        "Autorité de contrôle des exportations pour les biens militaires (L. 185/1990) et à double usage (D.Lgs. 221/2017). L'UAMA délivre les autorisations d'exportation pour les composants d'engins spatiaux et les technologies de lanceurs.",
    },
  ],
  [
    "IT-MASE",
    {
      name: "Ministère de l'Environnement et de la Sécurité énergétique (MASE)",
      mandate:
        "Autorité d'évaluation de l'impact environnemental (VIA) pour les activités spatiales. Gère la législation environnementale pour les évaluations environnementales de spaceport et la manipulation de carburant (Seveso III).",
    },
  ],
  [
    "IT-MIMIT",
    {
      name: "Ministère des Entreprises et du Made in Italy (MIMIT)",
      mandate:
        "Politique industrielle spatiale, gestion du Fondo per l'Economia dello Spazio, coordination des fréquences satellitaires.",
    },
  ],
  [
    "IT-MINDIFESA",
    {
      name: "Ministère de la Défense / Commandement des opérations spatiales (MinDifesa)",
      mandate:
        "Opérations spatiales militaires, systèmes spatiaux à double usage. L'art. 28 de la Loi 89/2025 exclut expressément les activités de défense et de renseignement du régime d'autorisation civile.",
    },
  ],
  [
    "IT-MUR",
    {
      name: "Ministère de l'Université et de la Recherche (MUR)",
      mandate:
        "Ministère de tutelle de l'ASI. Approuve le plan triennal d'activité et le budget de l'ASI.",
    },
  ],
  [
    "IT-PDC",
    {
      name: "Présidence du Conseil des ministres (PdCM)",
      mandate:
        "Autorité d'autorisation suprême pour les activités spatiales dans le cadre italien. La Loi 7/2018 désigne la PdCM comme l'organe suprême de gouvernance spatiale, renforcé par la Loi 89/2025.",
    },
  ],
  [
    "NL-ACM",
    {
      name: "Autorité néerlandaise pour les consommateurs et les marchés (ACM)",
      mandate:
        "Autorité de régulation du marché et de la concurrence. Supervise le marché des télécommunications, y compris les services de communication par satellite.",
    },
  ],
  [
    "NL-AP",
    {
      name: "Autorité néerlandaise de protection des données (Autoriteit Persoonsgegevens)",
      mandate:
        "Application du RGPD/AVG au traitement des données spatiales. Supervise les opérateurs d'observation de la Terre et les fournisseurs de données satellitaires traitant des données à caractère personnel.",
    },
  ],
  [
    "NL-BTI",
    {
      name: "Bureau de l'examen des investissements (BTI)",
      mandate:
        "Examen des investissements étrangers dans les technologies sensibles en vertu du Wet veiligheidstoets investeringen (Vifo). Technologie spatiale classée comme technologie sensible — les acquisitions d'entreprises spatiales néerlandaises par des investisseurs non-UE sont soumises à un examen obligatoire.",
    },
  ],
  [
    "NL-BZ",
    {
      name: "Ministère des Affaires étrangères",
      mandate:
        "Diplomatie spatiale internationale et négociations conventionnelles. Représentation des Pays-Bas au COPUOS de l'ONU. Gère le Code de conduite de La Haye contre la prolifération des missiles balistiques (HCoC).",
    },
  ],
  [
    "NL-CDIU",
    {
      name: "Service central pour les importations et les exportations (CDIU)",
      mandate:
        "Autorisations de contrôle des exportations pour les biens à double usage et les produits de défense en vertu du Wet strategische goederen (Wsg). Délivre les autorisations d'exportation pour les composants satellitaires et la technologie de chiffrement.",
    },
  ],
  [
    "NL-DEFENCE",
    {
      name: "Ministère de la Défense",
      mandate:
        "Opérations spatiales militaires et NATO Space Centre of Excellence (planifié à La Haye). Exploite le Defensie Space Commando. Coordonne les communications militaires par satellite et la connaissance de la situation spatiale.",
    },
  ],
  [
    "NL-ESTEC",
    {
      name: "Centre européen de recherche et de technologie spatiales (ESA/ESTEC)",
      mandate:
        "Plus grand site de l'ESA, à Noordwijk. Centre principal de développement et d'essais technologiques de l'ESA. Abrite l'ESTEC Test Centre (plus grande installation européenne d'essais satellitaires). Environ 2 500 collaborateurs.",
    },
  ],
  [
    "NL-EZK",
    {
      name: "Ministère des Affaires économiques et de la Politique climatique",
      mandate:
        "Ministère chef de file pour la politique spatiale. Délivre les licences en vertu du WRA 2007. Responsable de la stratégie spatiale nationale et des décisions du Conseil ministériel de l'ESA.",
    },
  ],
  [
    "NL-IenW",
    {
      name: "Ministère de l'Infrastructure et de la Gestion de l'eau",
      mandate:
        "Réglementation environnementale pour les activités de lancement et de rentrée en vertu du Wet milieubeheer (Wm). Responsable des évaluations d'impact environnemental pour les infrastructures spatiales.",
    },
  ],
  [
    "NL-ILT",
    {
      name: "Inspection de l'environnement et des transports (ILT)",
      mandate:
        "Application environnementale et supervision de la sécurité des transports. Surveille le respect des exigences du Wet milieubeheer pour les installations liées au spatial.",
    },
  ],
  [
    "NL-KNMI",
    {
      name: "Institut royal météorologique néerlandais (KNMI)",
      mandate:
        "Service national météorologique et sismologique. Exploite le service Copernicus de surveillance du changement climatique (C3S) et gère les données satellitaires d'observation de la Terre néerlandaises. Surveillance de la météorologie spatiale pour l'exploitation des satellites.",
    },
  ],
  [
    "NL-NCSC",
    {
      name: "Centre national de cybersécurité (NCSC)",
      mandate:
        "Autorité de cybersécurité pour les infrastructures critiques, y compris les systèmes spatiaux. Coordonne la mise en œuvre de NIS2. Point central pour la réponse aux incidents cyber.",
    },
  ],
  [
    "NL-NSO",
    {
      name: "Bureau spatial néerlandais (NSO)",
      mandate:
        "Agence spatiale nationale et point de contact principal pour l'octroi des licences d'activités spatiales en vertu du WRA 2007. Gère le programme spatial néerlandais, la délégation à l'ESA et la coopération internationale. Tient le registre national des objets spatiaux (en deux parties : actifs + désaffectés).",
    },
  ],
  [
    "NL-RDI",
    {
      name: "Autorité néerlandaise de surveillance des infrastructures numériques (RDI)",
      mandate:
        "Gestion des fréquences et coordination des radiofréquences pour les services satellitaires. Anciennement Agentschap Telecom. Autorité nationale de régulation des fréquences pour les notifications UIT et les attributions de fréquences satellitaires.",
    },
  ],
  [
    "NL-TUDELFT",
    {
      name: "Université de technologie de Delft — Faculté d'aérospatiale",
      mandate:
        "Université de recherche aérospatiale de premier plan en Europe. Exploite le programme Delfi (satellites étudiants). Plus grande faculté d'ingénierie aérospatiale d'Europe.",
    },
  ],
  [
    "UK-AAIB",
    {
      name: "Branche d'enquête sur les accidents aériens / Autorité d'enquête sur les accidents spatiaux (AAIB/SAIA)",
      mandate:
        "Enquêtes sur les accidents spatiaux. La SIA 2018 s.20 et le SI 2021/793 créent la SAIA au sein du cadre AAIB existant.",
    },
  ],
  [
    "UK-CAA",
    {
      name: "Autorité de l'aviation civile (régulation spatiale) (CAA)",
      mandate:
        "Autorité britannique de régulation spatiale depuis juillet 2021. Délivre toutes les licences spatiales en vertu du SIA 2018 et les licences d'activités outre-mer en vertu de l'OSA 1986. Compétente pour les licences d'opérateur, de spaceport, de poste de contrôle et d'opérations orbitales.",
    },
  ],
  [
    "UK-DFT",
    {
      name: "Ministère des Transports (DfT)",
      mandate:
        "Politique de réglementation du SIA 2018. Délivre les consentements du Secrétaire d'État pour les licences de vols spatiaux suborbitaux.",
    },
  ],
  [
    "UK-DSIT",
    {
      name: "Ministère des Sciences, de l'Innovation et de la Technologie (DSIT)",
      mandate:
        "Politique spatiale civile globale. Ministère de tutelle de l'UKSA. Compétent pour la Stratégie spatiale nationale et la réforme réglementaire.",
    },
  ],
  [
    "UK-ECJU",
    {
      name: "Unité conjointe de contrôle des exportations (ECJU)",
      mandate:
        "Octroi de licences à l'exportation de technologies spatiales. Gère les contrôles à l'exportation britanniques pour les biens militaires et à double usage, y compris les engins spatiaux et les composants satellitaires.",
    },
  ],
  [
    "UK-HSE",
    {
      name: "Autorité de la santé et de la sécurité (HSE)",
      mandate:
        "Réglementation de la sécurité sur les sites de lancement. Fait appliquer la réglementation COMAH pour le stockage du carburant des fusées. Supervise la réglementation des explosifs pour les moteurs-fusées à propergol solide sur les spaceports.",
    },
  ],
  [
    "UK-ICO",
    {
      name: "Bureau du commissaire à l'information (ICO)",
      mandate:
        "Autorité de protection des données pour l'imagerie d'observation de la Terre comportant des implications personnelles. Fait appliquer le UK GDPR et le Data Protection Act 2018 au traitement des géodonnées d'origine satellitaire.",
    },
  ],
  [
    "UK-MCA",
    {
      name: "Agence maritime et des garde-côtes (MCA)",
      mandate:
        "Sécurité maritime et zones d'exclusion maritimes lors des lancements. Coordonne le déroutement des navires et la sécurité maritime pour les opérations de lancement et de rentrée.",
    },
  ],
  [
    "UK-MOD",
    {
      name: "Ministère de la Défense (MOD)",
      mandate:
        "Politique de défense spatiale et Defence Space Portfolio. Supervise UK Space Command. Compétent pour les communications militaires par satellite Skynet.",
    },
  ],
  [
    "UK-NCSC",
    {
      name: "Centre national de cybersécurité (NCSC)",
      mandate:
        "Lignes directrices de cybersécurité pour les systèmes spatiaux. Composante du GCHQ. Conseille la CAA sur les aspects de cybersécurité des demandes de licence.",
    },
  ],
  [
    "UK-NSPOC",
    {
      name: "Centre national des opérations spatiales (NSpOC)",
      mandate:
        "Créé en mai 2024, RAF High Wycombe. Environ 70 collaborateurs. Fournit des services de connaissance de la situation spatiale (SSA) et de surveillance spatiale pour le Royaume-Uni.",
    },
  ],
  [
    "UK-OFCOM",
    {
      name: "Autorité de régulation des communications (Ofcom)",
      mandate:
        "Octroi de licences de spectre satellitaire et notifications UIT pour le compte des opérateurs britanniques. Régule la radiodiffusion par satellite et le haut débit. Délivre les licences au titre du Wireless Telegraphy Act.",
    },
  ],
  [
    "UK-SPACECOMMAND",
    {
      name: "UK Space Command",
      mandate:
        "Opérations spatiales militaires, connaissance du domaine spatial (SDA) et communications par satellite Skynet. Créé le 1er avril 2021, quartier général à RAF High Wycombe.",
    },
  ],
  [
    "UK-UKSA",
    {
      name: "UK Space Agency (UKSA)",
      mandate:
        "Politique, exécution des programmes et représentation internationale. Agence exécutive du DSIT. Gère la participation britannique aux programmes de l'ESA. Tient le UK Registry of Space Objects. Fusion avec le DSIT à compter d'avril 2026.",
    },
  ],
  [
    "US-BIS",
    {
      name: "U.S. Department of Commerce — Bureau of Industry and Security (BIS)",
      mandate:
        "Administre l'Export Administration Regulations (EAR, 15 CFR 730-774) en vertu de l'Export Control Reform Act 2018 (50 USC Ch. 58). La réforme de 2014 a transféré la plupart des composants satellitaires commerciaux de la catégorie XV de l'ITAR à l'EAR 9E515 / 9A515.",
    },
  ],
  [
    "US-CISA",
    {
      name: "Cybersecurity and Infrastructure Security Agency (CISA)",
      mandate:
        "Pilote opérationnel de la cybersécurité des infrastructures critiques américaines. Systèmes spatiaux désignés comme 16e secteur d'infrastructure critique en vertu du cadre PPD-21 (discussion active ; non encore codifié en 2026).",
    },
  ],
  [
    "US-DDTC",
    {
      name: "U.S. Department of State — Directorate of Defense Trade Controls (DDTC)",
      mandate:
        "Administre l'International Traffic in Arms Regulations (ITAR, 22 CFR 120-130) en vertu de l'Arms Export Control Act (22 USC 2751). Les catégories IV et XV de l'USML couvrent la plupart des composants d'engins spatiaux militaires et à double usage.",
    },
  ],
  [
    "US-FAA-AST",
    {
      name: "U.S. Federal Aviation Administration — Office of Commercial Space Transportation",
      mandate:
        "Autorité principale d'octroi de licences pour les lancements commerciaux, les rentrées et les opérations de site de lancement en vertu du Commercial Space Launch Act (51 USC Ch. 509) et du 14 CFR Parts 400-450. Administre le régime fédéral d'indemnisation de la responsabilité tiers (51 USC § 50914).",
    },
  ],
  [
    "US-FCC",
    {
      name: "U.S. Federal Communications Commission (FCC)",
      mandate:
        "Délivre les licences pour les stations terriennes satellitaires, les services satellitaires et les opérations orbitales en vertu du Communications Act de 1934 et du 47 CFR Parts 2, 5, 25, 87, 101. A adopté la règle phare de désorbitation à 5 ans après fin de vie (2022).",
    },
  ],
  [
    "US-NASA",
    {
      name: "National Aeronautics and Space Administration (NASA)",
      mandate:
        "Agence spatiale civile américaine, instituée par le National Aeronautics and Space Act de 1958 (51 USC Ch. 201). Premier signataire des Accords Artemis (13 octobre 2020).",
    },
  ],
  [
    "US-NOAA-CRSRA",
    {
      name: "NOAA Commercial Remote Sensing Regulatory Affairs Office",
      mandate:
        "Délivre les licences d'exploitation privée des systèmes commerciaux d'observation de la Terre en vertu du Land Remote Sensing Policy Act 1992 (51 USC Ch. 601) et du 15 CFR Part 960.",
    },
  ],
  [
    "US-USSF",
    {
      name: "United States Space Force (USSF)",
      mandate:
        "Service militaire créé le 20 décembre 2019. Compétent pour les opérations spatiales militaires, la connaissance du domaine spatial et les avertissements de conjonction pour les opérateurs commerciaux (via le 18th Space Defense Squadron).",
    },
  ],
]);
