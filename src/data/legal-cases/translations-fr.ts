/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * French translations for the Atlas case law dataset. Mirrors the
 * shape of `translations-de.ts` for parity — same 28 cases, same
 * field structure (TranslatedCase type), so the case-detail UI
 * picks the right map without any FR-specific branching.
 *
 * Translation conventions:
 *   - Plaintiff / Defendant → 'Demandeur' / 'Défendeur' (or institutional
 *     names where appropriate; treaty-award entries use the state names)
 *   - 'Settlement' → 'règlement amiable' / 'transaction'
 *   - 'Ruling' → 'décision'
 *   - 'Legal holding' → 'fondement juridique'
 *   - 'Industry significance' → 'portée pour la pratique'
 *   - 'Consent decree' → 'décret consensuel' (terminology US, conservé
 *     en français pour préserver la précision juridique)
 *   - Statute numbers and forum names stay in their original form
 *     (e.g. '47 CFR § 25.114' — never translated).
 *
 * Provenance: machine-assisted translation from the EN source-of-truth
 * (cases.ts), reviewed for legal-terminology consistency. Any deviation
 * from a native-speaker counsel review should be flagged and corrected
 * via PR — Atlas TranslationProvenanceNotice surfaces this status to
 * end-users on each case-detail page.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { TranslatedCase } from "./translations-de";

export const LEGAL_CASE_TRANSLATIONS_FR = new Map<string, TranslatedCase>([
  // ─── Liability-Convention awards / inter-state settlements ──────────

  [
    "CASE-COSMOS-954-1981",
    {
      title: "Cosmos 954 — règlement amiable de la réclamation canadienne",
      forum_name:
        "Règlement diplomatique, URSS–Canada (Convention sur la responsabilité 1972)",
      plaintiff: "Gouvernement du Canada",
      defendant:
        "Gouvernement de l'Union des républiques socialistes soviétiques",
      facts:
        "Le 24 janvier 1978, le satellite soviétique RORSAT Cosmos 954 (satellite de reconnaissance océanique radar transportant environ 50 kg d'uranium-235 enrichi) a effectué une rentrée atmosphérique non contrôlée et dispersé des débris radioactifs sur une zone d'environ 124 000 km² dans les Territoires du Nord-Ouest canadiens. Le Canada a lancé l'Opération Morning Light, une mission de récupération de plusieurs mois au cours de laquelle douze fragments contenant des matières radioactives ont été retrouvés.",
      ruling_summary:
        "Le Canada a déposé une réclamation au titre de la Convention sur la responsabilité de 1972 et a réclamé 6 041 174,70 CAD au titre des frais de récupération et de décontamination. L'URSS a versé 3 000 000 CAD à titre de règlement en avril 1981 — formellement à titre gracieux (ex gratia), sans reconnaissance expresse de responsabilité au titre de la Convention. La forme, le mécanisme et la motivation de ce règlement constituent néanmoins l'unique précédent opérationnel de la Convention sur la responsabilité.",
      legal_holding:
        "L'art. II de la Convention sur la responsabilité (responsabilité absolue pour les dommages causés à la surface de la Terre par un objet spatial d'un État partie) constitue le fondement opérationnel de l'indemnisation ; la forme du règlement (montant forfaitaire négocié, sans reconnaissance, sans contrôle judiciaire) est le mécanisme canonique de résolution des dommages spatiaux interétatiques.",
      industry_significance:
        "L'UNIQUE réclamation jamais réglée au titre de la Convention sur la responsabilité. Tout calcul d'assurance spatiale, tout manuel sur la Convention sur la responsabilité et tout débat sur l'attribution étatique (en dernier lieu l'essai ASAT russe de 2021) renvoient en fin de compte à Cosmos-954 comme étalon de ce que signifie en pratique la « responsabilité pour les dommages terrestres ».",
      notes: [
        "Le Canada a déposé sa réclamation formelle le 23 janvier 1979 (un an après la rentrée) ; règlement en avril 1981.",
        "La lettre de règlement soviétique a délibérément évité toute formulation impliquant une reconnaissance de responsabilité au titre de la Convention ; la clause standard « sans reconnaissance d'une obligation juridique » a été reprise pour préserver les arguments de souveraineté.",
      ],
    },
  ],

  [
    "CASE-IRIDIUM-COSMOS-2009",
    {
      title: "Iridium 33 / Cosmos 2251 — collision sans réclamation formelle",
      forum_name:
        "Correspondance diplomatique (aucune réclamation formelle déposée)",
      plaintiff: "Iridium Communications Inc. (États-Unis)",
      defendant: "Fédération de Russie",
      facts:
        "Le 10 février 2009 à 16 h 56 UTC, Iridium 33 (satellite commercial de communications actif, sous licence américaine) et Cosmos 2251 (satellite militaire de communications soviétique désactivé depuis 1993, sans capacité de manœuvre) sont entrés en collision à environ 789 km d'altitude au-dessus de la Sibérie, à une vitesse relative de 11,7 km/s. La collision a généré environ 2 300 fragments catalogués — le plus grand événement de débris en orbite basse à l'époque.",
      ruling_summary:
        "Ni les États-Unis ni Iridium n'ont jamais déposé de réclamation au titre de la Convention sur la responsabilité. L'assurance commerciale d'Iridium a couvert le sinistre ; Cosmos 2251 n'était pas assuré. L'affaire est devenue la démonstration pratique que l'art. III de la Convention sur la responsabilité (responsabilité pour faute dans l'espace) est de fait inapplicable : la précision des données de pistage, l'attribution de la faute et la quantification du préjudice constituent autant d'obstacles majeurs à une réclamation aboutie.",
      legal_holding:
        "L'art. III de la Convention sur la responsabilité (responsabilité pour faute pour les dommages causés dans l'espace) ne peut être invoqué avec succès en l'absence d'une attribution claire de la faute. L'absence de réclamation formelle, malgré une perte commerciale supérieure à 50 millions USD, confirme que l'art. III est en pratique dépourvu de portée.",
      industry_significance:
        "Le précédent de « l'assurance plutôt que l'art. III ». Les opérateurs s'en remettent aux assurances tous risques commerciales en orbite, la voie de la Convention sur la responsabilité étant pratiquement fermée. La collision de 2009 a en outre accéléré l'introduction des exigences d'évaluation des collisions du 47 CFR § 25.114 (2013) et le renforcement du partage des données de conjonctions parmi les opérateurs sous licence américaine.",
      notes: [
        "La collision a généré plus de 2 300 fragments catalogués en février 2009 ; en 2024, environ 1 000 d'entre eux étaient encore en orbite et continuent à alimenter la situation de débris en orbite basse.",
        "Le règlement d'assurance d'Iridium est publiquement estimé à environ 50 millions USD (perte du satellite plus coûts du lancement de remplacement).",
      ],
    },
  ],

  // ─── FCC enforcement actions ───────────────────────────────────────

  [
    "CASE-FCC-SWARM-2018",
    {
      title:
        "In the Matter of Swarm Technologies, Inc. — décret consensuel (lancement et exploitation non autorisés de satellites)",
      forum_name: "U.S. Federal Communications Commission (FCC)",
      plaintiff: "Federal Communications Commission",
      defendant: "Swarm Technologies, Inc.",
      facts:
        "En janvier 2018, Swarm Technologies a lancé quatre satellites « SpaceBEE » au format 0,25U lors de la mission ISRO PSLV-C40 sans autorisation FCC — après que la FCC eut rejeté la demande de licence de Swarm au motif que les satellites étaient trop petits pour être suivis de manière fiable. Swarm a procédé au lancement malgré le rejet exprès.",
      ruling_summary:
        "Swarm a accepté un décret consensuel comportant une amende de 900 000 USD, un plan de mise en conformité de trois ans incluant la responsabilité au niveau du dirigeant senior pour les décisions de licence FCC, et l'obligation d'obtenir une autorisation FCC avant tout lancement futur. L'accord n'a pas entraîné le retrait des autorisations Swarm ultérieures.",
      legal_holding:
        "L'exploitation d'une station spatiale non autorisée en violation de l'art. 301 du Communications Act et du 47 CFR § 25.102 expose, selon la pratique d'application de la FCC, à une amende d'environ 225 000 USD par satellite et par jour. La responsabilité au niveau du dirigeant senior est désormais une composante standard des décrets consensuels modernes de la FCC.",
      industry_significance:
        "La première et la plus importante sanction civile pour exploitation non autorisée de satellites. Établit le modèle moderne d'application de la FCC — décret consensuel + responsabilité du dirigeant senior + plan de mise en conformité pluriannuel — repris à l'identique dans les règlements DISH (2022) et Hughes (2024). Tout refus de licence satellitaire de la FCC depuis lors renvoie à cette affaire pour souligner les conséquences d'un lancement sans autorisation.",
      notes: [
        "Swarm a obtenu par la suite des autorisations FCC en bonne et due forme et a été acquise par SpaceX en août 2021.",
        "Le barème d'amende par satellite et par jour est aujourd'hui l'étalon de dissuasion standard dans les décisions de licence de la FCC pour le secteur spatial.",
      ],
    },
  ],

  [
    "CASE-FCC-DISH-2023",
    {
      title:
        "In the Matter of EchoStar Corporation — décret consensuel (EchoStar-7, orbite de désorbitation défaillante)",
      forum_name: "U.S. Federal Communications Commission (FCC)",
      plaintiff: "Federal Communications Commission",
      defendant: "DISH Network / EchoStar Corporation",
      facts:
        "En mai 2022, DISH a placé le satellite EchoStar-7 sur une orbite « cimetière » à seulement environ 122 km au-dessus de l'altitude géostationnaire — nettement en deçà de l'altitude requise par les lignes directrices IADC (235 km + 1000·CR·A/m) et par l'engagement de mitigation des débris pris par DISH dans son dossier FCC. DISH a attribué le déficit à un bilan de carburant inattendu ; la FCC a constaté que DISH n'avait pas tenu ses engagements au titre du § 25.114(d)(14).",
      ruling_summary:
        "DISH a accepté un décret consensuel assorti d'une amende de 150 000 USD — la PREMIÈRE sanction de l'histoire de la FCC fondée exclusivement sur le non-respect des engagements de mitigation des débris. DISH s'est engagée dans un plan de conformité de trois ans assorti de rapports de suivi détaillés du carburant avant chaque manœuvre de fin de vie et d'une consultation préalable du FCC International Bureau.",
      legal_holding:
        "Le non-respect d'engagements pris dans le cadre d'une déclaration de mitigation des débris au titre du § 25.114(d)(14) constitue une infraction réglementaire autonome susceptible de sanction — indépendamment des obligations déclaratives elles-mêmes du § 25.114. La portée du pouvoir d'exécution de la FCC s'étend à la précision effective de l'orbite de désorbitation, et non aux seules conditions d'octroi de la licence.",
      industry_significance:
        "Première sanction de mitigation des débris jamais infligée. Établit le précédent que la précision de l'orbite de désorbitation est exécutoire — non seulement démontrable au stade de la demande. Les opérateurs intègrent désormais des marges de sécurité dans leurs objectifs de désorbitation post-mission pour éviter un dépassement comparable — l'amende de 150 000 USD de DISH est citée dans pratiquement toutes les présentations de conseil d'administration relatives à la stratégie de désorbitation post-mission.",
      notes: [
        "EchoStar-7 était un satellite Lockheed Martin A2100, lancé en 2002, après 21 années d'exploitation orbitale jusqu'à sa fin de vie.",
        "L'amende a été généralement qualifiée de « symbolique » (faible au regard du chiffre d'affaires de DISH) mais constitutive de précédent.",
      ],
    },
  ],

  [
    "CASE-FCC-HUGHES-2024",
    {
      title:
        "In the Matter of Hughes Network Systems — décret consensuel (manquements aux obligations déclaratives)",
      forum_name: "U.S. Federal Communications Commission (FCC)",
      plaintiff: "Federal Communications Commission",
      defendant: "Hughes Network Systems, LLC",
      facts:
        "Hughes a omis des rapports annuels en temps utile et n'a pas notifié à la FCC l'acquisition de la société mère d'Hughes par EchoStar en 2024 pour plusieurs licences de satellites en bandes Ka et Ku. L'enquête de la FCC a révélé des lacunes systémiques dans les obligations déclaratives sur l'ensemble du portefeuille de licences Hughes.",
      ruling_summary:
        "Hughes a accepté un décret consensuel comportant une amende de 300 000 USD et l'engagement à un plan de conformité de trois ans avec un FCC-Compliance-Officer désigné nommément et des déclarations de conformité trimestrielles.",
      legal_holding:
        "Les manquements aux obligations annuelles de déclaration des titulaires de licence et de notification des changements de propriétaire au titre du 47 CFR § 25.121 et § 25.119 sont sanctionnables de façon autonome ; l'exposition aux amendes FCC par licence et par manquement s'additionne sur l'ensemble d'un portefeuille.",
      industry_significance:
        "Confirme que la conformité opérationnelle — et non seulement la conformité au stade de la demande — est une charge réglementaire continue. L'amende de 300 000 USD infligée à Hughes a été la deuxième sanction la plus lourde en matière de licence spatiale après les 900 000 USD de Swarm et a déclenché un examen sectoriel des pratiques de déclaration des titulaires de licence.",
    },
  ],

  // ─── ITAR / Export-control settlements ─────────────────────────────

  [
    "CASE-ITT-ITAR-2007",
    {
      title: "United States v. ITT Corporation",
      forum_name: "U.S. Department of Justice / Department of State",
      plaintiff: "États-Unis d'Amérique",
      defendant: "ITT Corporation",
      facts:
        "ITT Corporation a plaidé coupable de deux chefs d'exportation non autorisée d'articles de défense (technologie de vision nocturne et spécifications de pistage laser) vers la Chine, Singapour et le Royaume-Uni — en violation des catégories XII (vision nocturne et intensification d'image) et XV (spacecraft systems) de l'USML ITAR. L'enquête remontait à un programme d'ingénierie offshore lancé en 2001.",
      ruling_summary:
        "ITT a payé une amende pénale de 2 millions USD, une sanction civile de 20 millions USD et a été contrainte d'investir 50 millions USD dans une supervision externe de la conformité — exposition totale de 100 millions USD. Deux dirigeants d'ITT ont plaidé coupable à titre personnel. L'accord comportait un Deferred Prosecution Agreement.",
      legal_holding:
        "Les violations des catégories XII et XV de l'ITAR fondent une responsabilité pénale au titre de l'Arms Export Control Act et du 22 USC § 2778 ; les ordonnances de supervision externe de la conformité d'un montant de l'ordre de 50 millions USD sont des sanctions appropriées en cas de défaillances systémiques de la conformité à l'export.",
      industry_significance:
        "L'étalon des règlements pénaux ITAR dans le secteur de la défense et du spatial. Tout programme de conformité à l'export spatial se réfère à ITT-2007 comme avertissement ; l'exposition globale de 100 millions USD est l'indicateur budgétaire standard des violations ITAR dans les présentations de conseil d'administration.",
    },
  ],

  [
    "CASE-BAE-ITAR-2011",
    {
      title: "United States v. BAE Systems plc",
      forum_name: "U.S. Department of Justice / Department of State",
      plaintiff: "États-Unis d'Amérique",
      defendant: "BAE Systems plc",
      facts:
        "BAE Systems a conclu un règlement civil de 79 millions USD (à l'époque le plus important règlement civil ITAR jamais conclu) — pour 2 591 violations alléguées de l'ITAR portant sur plusieurs catégories de munitions et plusieurs années de réexportations non autorisées, d'activités de courtage et de manquements aux obligations de tenue de registres.",
      ruling_summary:
        "BAE a accepté une amende civile de 79 millions USD payable sur quatre ans, 10 millions USD d'investissements en conformité et une supervision externe de la conformité pendant trois ans.",
      legal_holding:
        "Les violations des obligations de tenue de registres et d'autorisation de réexportation se cumulent ; les poursuites portant sur plusieurs milliers de violations conduisent, selon la pratique d'application du DDTC, à des amendes civiles à huit chiffres.",
      industry_significance:
        "A confirmé que les obligations systémiques de tenue de registres sont en elles-mêmes pertinentes au regard de l'ITAR — et non seulement les transferts de technologie sous-jacents. Le DDTC a publié par la suite des protocoles d'audit étendus sur les registres, qui renvoient expressément à BAE-2011.",
    },
  ],

  [
    "CASE-ZTE-EAR-2017",
    {
      title: "United States v. ZTE Corporation",
      forum_name:
        "U.S. Department of Justice / Department of Commerce (BIS) / Department of the Treasury (OFAC)",
      plaintiff: "États-Unis d'Amérique",
      defendant: "ZTE Corporation",
      facts:
        "ZTE a plaidé coupable de violations des contrôles à l'exportation américains (EAR, à proximité de l'ITAR) et des sanctions OFAC — notamment des exportations non autorisées vers l'Iran et la Corée du Nord de produits américains, dont des équipements de télécommunications, serveurs et matériel réseau à double usage potentiel dans le segment sol spatial.",
      ruling_summary:
        "ZTE a payé des sanctions pénales et civiles combinées de 1,19 milliard USD — à l'époque le plus important règlement de sanctions et de contrôle à l'exportation jamais prononcé aux États-Unis. L'accord comprenait une supervision indépendante de la conformité de sept ans.",
      legal_holding:
        "Les règlements coordonnés DOJ/BIS/OFAC cumulent les montants des sanctions ; les contournements de sanctions et les violations EAR issus du même fait s'additionnent au lieu de se réduire mutuellement.",
      industry_significance:
        "Le cas de référence « ne soyez pas ZTE » dans tous les programmes de conformité des fournisseurs du segment sol spatial. La suspension de 2018 pour violations pendant la phase de supervision a en outre démontré que les manquements aux conditions de supervision sont susceptibles de menacer l'existence — l'action ZTE a perdu 41 % en trois semaines pendant la suspension.",
    },
  ],

  [
    "CASE-LORAL-1996",
    {
      title:
        "Loral Space & Communications — Long March / transfert de technologie vers la Chine",
      forum_name: "U.S. Department of State / Department of Justice",
      plaintiff: "États-Unis d'Amérique",
      defendant: "Loral Space & Communications, Ltd.",
      facts:
        "À la suite de l'échec du lancement d'une Long March 3B emportant Intelsat 708 de Loral en février 1996, des ingénieurs de Loral ont participé à une analyse post-défaillance avec les autorités de lancement chinoises. Le Department of State a constaté ultérieurement que les ingénieurs y avaient communiqué à des entités chinoises, sans autorisation du DDTC, des informations techniques contrôlées par l'ITAR (notamment des améliorations relatives au carénage défaillant de la Long March).",
      ruling_summary:
        "Loral a conclu un règlement de 14 millions USD avec le DDTC (porté par la suite à 20 millions USD avec l'enquête parallèle Hughes), accepté une supervision pluriannuelle de conformité par le DDTC et un Consent Agreement assorti de restrictions sur les contacts des dirigeants avec les autorités de lancement étrangères.",
      legal_holding:
        "Les revues d'ingénierie post-défaillance avec des autorités de lancement étrangères déclenchent un examen ITAR, même si l'intention de l'opérateur est l'élucidation non commerciale ; les dérogations aux obligations d'autorisation ITAR pour briefing technique doivent être obtenues par écrit et au préalable.",
      industry_significance:
        "La raison pour laquelle tout contrat de lancement moderne contient une clause limitant les échanges d'ingénierie post-défaillance aux canaux pré-autorisés par le DDTC. Aussi le déclencheur politique du § 1513 du Strom Thurmond National Defense Authorization Act 1999, qui a fait passer les satellites commerciaux américains du Commerce-CCL DE NOUVEAU sur la State-USML — un déplacement de catégorie réglementaire qui a mis 15 ans à être inversé.",
      notes: [
        "Règlement parallèle avec Hughes Electronics en janvier 2003 — amende civile de 32 millions USD, condamnation pénale pour des faits sans lien.",
        "L'épisode combiné Loral-Hughes de 1996 est probablement l'événement d'application de l'ITAR le plus lourd de conséquences de l'histoire spatiale commerciale.",
      ],
    },
  ],

  [
    "CASE-HUGHES-ELECTRONICS-2003",
    {
      title: "United States v. Hughes Electronics Corporation",
      forum_name: "U.S. Department of State / Department of Justice",
      plaintiff: "États-Unis d'Amérique",
      defendant:
        "Hughes Electronics Corporation (Hughes Space and Communications Co.)",
      facts:
        "Affaire connexe à Loral-1996. Des ingénieurs Hughes ont participé, après les échecs Long March 2E (1995) et Long March 3B (1996), à des analyses techniques avec des entités chinoises, transmettant à cette occasion des informations contrôlées ITAR sur la conception du carénage et l'analyse de trajectoire.",
      ruling_summary:
        "Hughes a payé une amende civile de 32 millions USD, accepté un Consent Agreement comportant des réformes structurelles de conformité et une supervision pluriannuelle du DDTC.",
      legal_holding:
        "Les sessions d'analyse technique avec des autorités de lancement étrangères requièrent une autorisation préalable du DDTC ; les échanges intra-groupe qui seraient possibles sans autorisation deviennent soumis à autorisation lorsqu'ils impliquent des partenaires étrangers.",
      industry_significance:
        "Confirmation de Loral-1996. Les deux affaires ensemble ont conduit au déplacement de catégorie USML par le § 1513 NDAA 1999.",
    },
  ],

  // ─── Spectrum / FCC orbital disputes ──────────────────────────────

  [
    "CASE-VIASAT-V-FCC-2021",
    {
      title: "Viasat, Inc. v. FCC",
      forum_name: "U.S. Court of Appeals for the District of Columbia Circuit",
      plaintiff: "Viasat, Inc.",
      defendant: "Federal Communications Commission",
      facts:
        "Viasat a contesté l'ordonnance FCC d'avril 2021 modifiant la licence de la première génération Starlink de SpaceX pour autoriser des opérations à des altitudes inférieures (540–570 km au lieu des 1 110–1 325 km initialement autorisés). Viasat soutenait que la FCC n'avait pas effectué d'évaluation environnementale en bonne et due forme au titre de la NEPA avant d'autoriser une modification de constellation de cette ampleur.",
      ruling_summary:
        "Le D.C. Circuit a confirmé intégralement l'ordonnance de modification de la FCC. La cour a jugé que la FCC avait correctement appliqué son exclusion catégorique NEPA pour les actions de licence de satellites, et que la qualité pour agir et les moyens de fond de Viasat échouaient. Les opérations en altitude inférieure de SpaceX sont restées autorisées.",
      legal_holding:
        "L'exclusion catégorique NEPA de la FCC pour les actions de licence de satellites (47 CFR § 1.1306) est appropriée ; les obligations d'évaluation environnementale ne s'étendent PAS aux modifications d'altitude d'une constellation, sauf démonstration concrète d'un impact environnemental significatif.",
      industry_significance:
        "A levé l'incertitude juridique entourant la modification Starlink Gen-1 de SpaceX et a établi le cadre NEPA moderne pour les modifications d'orbite des constellations satellitaires. Les opérateurs envisageant des modifications d'altitude peuvent s'appuyer sur l'exclusion catégorique de la FCC — sous réserve de démonstrations d'impact concrètes.",
    },
  ],

  [
    "CASE-FCC-INTL-BUREAU-DEBRIS-2024",
    {
      title:
        "In the Matter of Updated Orbital-Debris Mitigation Showing Requirements",
      forum_name:
        "U.S. Federal Communications Commission — International Bureau",
      plaintiff: "Federal Communications Commission (procédure d'office)",
      defendant: "Notice de rulemaking sectorielle",
      facts:
        "À la suite du décret consensuel DISH/EchoStar-7 et de préoccupations plus larges sur la situation des débris, le FCC International Bureau a adopté une Report and Order actualisant les exigences de mitigation des débris au titre du § 25.114(d)(14) : preuves quantitatives renforcées de fiabilité (≥ 0,99 pour les constellations de plus de 100 satellites), modélisation explicite des risques cumulés de catastrophes par collision au niveau de la flotte, et garanties financières sécurisées pour les manœuvres de fin de vie.",
      ruling_summary:
        "Order adoptée sous une forme modifiée : exigences de divulgation renforcées d'effet immédiat pour les nouvelles demandes ; modélisation du risque catastrophique au niveau de la flotte obligatoire pour toutes les constellations de plus de 100 satellites ; garantie financière sécurisée renvoyée à un avis ultérieur.",
      legal_holding:
        "Les opérations à l'échelle d'une constellation déclenchent un examen renforcé par la FCC en matière de mitigation des débris, indépendamment de l'évaluation par satellite ; l'analyse agrégée d'impact environnemental fait désormais partie de la déclaration au titre du § 25.114(d)(14).",
      industry_significance:
        "Définit la déclaration moderne de mitigation des débris exigée par la FCC pour les opérateurs à l'échelle d'une constellation. Toute demande de Starlink Gen-2, Kuiper, OneWeb-Gen-2, AST SpaceMobile ou Astranis comporte depuis lors les divulgations renforcées.",
    },
  ],

  // ─── UK / EU enforcement ──────────────────────────────────────────

  [
    "CASE-UK-AAIB-CORNWALL-2023",
    {
      title:
        "Virgin Orbit « Start Me Up » — enquête AAIB & revue de licence UKSA",
      forum_name:
        "UK Air Accidents Investigation Branch (AAIB) / UK Space Agency",
      plaintiff: "UK Air Accidents Investigation Branch (enquête)",
      defendant: "Virgin Orbit / Spaceport Cornwall",
      facts:
        "Le 9 janvier 2023, la mission « Start Me Up » de Virgin Orbit a échoué — première tentative de lancement orbital depuis le sol britannique. La fusée LauncherOne a atteint l'espace mais a subi une anomalie sur son deuxième étage et n'a pas atteint l'orbite. L'AAIB a ouvert une enquête au titre des Space Industry Regulations 2021 — première enquête formelle britannique sur un lancement spatial. L'enquête a identifié comme cause un corps étranger lié à un filtre de carburant, qui s'était logé dans le système de carburant du second étage.",
      ruling_summary:
        "L'AAIB n'a infligé aucune sanction réglementaire formelle, mais a documenté la cause de la défaillance et ses implications pour la licence. L'UKSA a alors revu les conditions de licence de Spaceport Cornwall et actualisé en conséquence le modèle de licence pour avions porteurs de lancement. Virgin Orbit a sollicité la protection du Chapter 11 en avril 2023 — les procédures de licence sont devenues sans objet.",
      legal_holding:
        "L'AAIB dispose, au titre des Space Industry Regulations 2021, de la compétence d'enquête principale en cas d'échec d'un lancement orbital britannique ; l'UKSA a une compétence subséquente pour la revue des conditions de licence. Les enquêtes au titre des SIR-2021 sont publiques par défaut.",
      industry_significance:
        "La toute première enquête britannique sur l'échec d'un lancement spatial. Établit l'architecture d'application enquête-d'abord (AAIB) / revue-de-licence-ensuite (UKSA) pour les opérations de lancement britanniques. La licence du spaceport de Cornwall est demeurée valable après l'échec — démontrant qu'un échec n'entraîne pas automatiquement le retrait des licences de spaceport.",
    },
  ],

  [
    "CASE-FR-CSA-AVIO-VEGA-2022",
    {
      title: "Échec Vega-C — mission VV22, enquête",
      forum_name: "Conseil supérieur de l'aviation / European Space Agency",
      plaintiff: "European Space Agency / DGA française",
      defendant: "Avio S.p.A. / Arianespace",
      facts:
        "Le 21 décembre 2022, le deuxième lancement de Vega-C (VV22) a échoué peu après l'allumage du second étage Zefiro-40, détruisant deux satellites Pléiades-Neo d'Airbus. La commission d'enquête de l'ESA a identifié comme cause la plus probable une sur-érosion de l'insert carbone-carbone de la tuyère Zefiro-40.",
      ruling_summary:
        "La commission d'enquête de l'ESA a publié ses conclusions accompagnées de recommandations de modifications de conception sur la tuyère Zefiro-40. Arianespace et Avio ont mis en œuvre la refonte et les essais de qualification ; l'exploitation en vol a repris en 2024. Aucune amende civile ; recours en assurance pour Pléiades-Neo dans le cadre de la couverture standard d'échec de lancement.",
      legal_holding:
        "Les enquêtes multipartites sur les échecs de lancement menées dans des cadres d'enquête conduits par l'ESA sont consultatives, non juridictionnelles ; les régularisations commerciales s'opèrent par l'assurance et le contrat, et non par des sanctions imposées par l'ESA.",
      industry_significance:
        "Alimente le débat européen de politique industrielle sur les lanceurs. L'échec de Vega-C a retardé les charges utiles institutionnelles européennes de plus de 18 mois et a constitué un facteur essentiel du reset ESA de 2023–2024 pour Ariane-6 / Vega-C / politique industrielle.",
    },
  ],

  // ─── California Coastal Commission — Vandenberg ────────────────────

  [
    "CASE-CCC-VANDENBERG-2023",
    {
      title:
        "Décision de cohérence de la California Coastal Commission — augmentation de cadence à Vandenberg",
      forum_name: "California Coastal Commission",
      plaintiff: "California Coastal Commission",
      defendant: "U.S. Department of the Air Force / SpaceX",
      facts:
        "SpaceX a sollicité une augmentation de la cadence annuelle de lancements depuis Vandenberg Space Force Base de 36 à 50 lancements. La California Coastal Commission a constaté, au titre du Coastal Zone Management Act, que l'augmentation envisagée nécessitait une analyse de cohérence Coastal Act complète — comprenant une évaluation environnementale des effets du bang sonique sur la faune côtière.",
      ruling_summary:
        "La Commission a constaté que la base d'évaluation environnementale de la FAA ne couvrait pas adéquatement l'augmentation de cadence. Elle a recommandé une analyse NEPA additionnelle. Le DoD/SpaceX ont introduit un recours auprès du Department of Commerce dans le cadre de la procédure de médiation CZMA. La médiation a abouti à un compromis : augmentation de cadence autorisée, suivi additionnel des bangs soniques requis, examens biennaux.",
      legal_holding:
        "Les régulateurs des États côtiers conservent un pouvoir d'examen de cohérence sur les opérations de lancement fédérales, y compris depuis des sites de lancement fédéraux ; la médiation CZMA au titre du 16 USC § 1456 est le mécanisme de résolution des conflits fédéraux/étatiques sur les questions de cadence de lancement.",
      industry_significance:
        "Premier conflit majeur fédéral/État sur la cadence de lancement. Établit que la Californie (et d'autres États côtiers) peuvent influer substantiellement sur les opérations de lancement fédérales par la voie du CZMA. L'examen comparable par la Floride de la cadence à Cape Canaveral est désormais un schéma récurrent.",
    },
  ],

  // ─── Sanctions / OFAC ─────────────────────────────────────────────

  [
    "CASE-OFAC-EXPRO-2023",
    {
      title:
        "Règlements OFAC — conformité aux sanctions dans le secteur spatial",
      forum_name:
        "U.S. Department of the Treasury — Office of Foreign Assets Control",
      plaintiff: "Office of Foreign Assets Control",
      defendant:
        "Divers fournisseurs américains de la chaîne d'approvisionnement spatiale et défense",
      facts:
        "Série de règlements OFAC 2022–2023 avec des fournisseurs de la chaîne d'approvisionnement spatiale (distributeurs d'électronique, fournisseurs de composants RF, intégrateurs de segment sol) pour des transactions involontaires avec des destinataires finaux russes, iraniens ou cubains au titre du régime de sanctions russe post-2022. À l'échelle sectorielle, les règlements totalisent environ 30 millions USD.",
      ruling_summary:
        "Multiples règlements individuels, marqués par des incitations à l'auto-déclaration (50–90 % de mitigation), des engagements de filtrage renforcés et des plans de conformité de 3 à 5 ans.",
      legal_holding:
        "Les violations involontaires de sanctions demeurent, selon la pratique OFAC, des infractions de responsabilité sans faute ; l'auto-déclaration volontaire assortie d'une coopération substantielle est la seule voie de mitigation significative.",
      industry_significance:
        "A entraîné l'adoption sectorielle d'outils automatisés de filtrage OFAC intégrés à l'ERP en 2023–2024. Les listes de contrôle de due diligence fournisseurs standard exigent désormais des déclarations de filtrage OFAC pour tous les fournisseurs de rang 1 et 2.",
    },
  ],

  // ─── Deutsche / EU-Vollzug ────────────────────────────────────────

  [
    "CASE-DE-BAFA-DUALUSE-2022",
    {
      title:
        "Avis d'amende BAFA — fournisseur allemand de technologies spatiales, violation dual-use (anonymisé)",
      forum_name: "Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA)",
      plaintiff: "Bundesamt für Wirtschaft und Ausfuhrkontrolle",
      defendant: "Fabricant allemand de composants spatiaux anonymisé",
      facts:
        "La BAFA a infligé une amende administrative de 850 000 EUR à un fabricant allemand de composants spatiaux pour exportation non autorisée d'ASIC durcis aux radiations (correspondant à l'ECCN 9A515) à un destinataire final affilié à la Chine. L'entreprise s'est auto-déclarée au titre du § 22 AWG.",
      ruling_summary:
        "Amende administrative ramenée du barème indicatif de 4,2 millions EUR à 850 000 EUR par la mitigation pour auto-déclaration au titre du § 22 AWG ; engagement de conformité renforcé de cinq ans.",
      legal_holding:
        "L'auto-déclaration au titre du § 22 AWG peut atténuer environ 80 % du barème de sanction indicatif ; la portée d'application de la BAFA s'étend aux produits à double usage au niveau du composant, même lorsque le maître d'œuvre exporte légalement vers des juridictions alliées.",
      industry_significance:
        "Le précédent BAFA récent le plus cité dans le secteur spatial pour les formations à la conformité dual-use. Établit que l'auto-déclaration au titre du § 22 AWG est la voie rationnelle en cas de violation involontaire.",
    },
  ],

  // ─── Verfassungsrechtliche / Pre-Launch-Streitigkeiten ────────────

  [
    "CASE-CSE-V-DOT-1979",
    {
      title:
        "Contestation de la méthodologie d'évaluation environnementale de la navette spatiale",
      forum_name: "U.S. Court of Appeals for the District of Columbia Circuit",
      plaintiff: "Divers requérants en environnement",
      defendant: "U.S. Department of Transportation / NASA",
      facts:
        "Des recours fondationnels de la fin des années 1970 et du début des années 1980 ont mis à l'épreuve l'applicabilité de la NEPA aux lancements spatiaux opérés par la NASA et aux activités spatiales commerciales sous licence FCC. Plusieurs décisions du D.C. Circuit ont posé le cadre de la future exclusion catégorique NEPA de la FCC.",
      ruling_summary:
        "Le D.C. Circuit a établi que la NEPA est applicable aux activités de lancement spatial, mais que des exclusions catégoriques sont admissibles dès lors qu'elles sont étayées par une démonstration documentaire de non-significativité générale. Le cadre a été repris au 47 CFR § 1.1306 (exclusion catégorique FCC pour les actions de licence spatiale).",
      legal_holding:
        "La NEPA s'applique aux décisions fédérales de licence spatiale ; les exclusions catégoriques sont valides lorsqu'elles sont étayées par une démonstration documentaire de non-significativité générale.",
      industry_significance:
        "Le fondement historique de l'issue moderne dans Viasat-v-FCC. Établit que les activités spatiales sous licence FCC opèrent sous une exclusion catégorique NEPA juridictionnellement défendable.",
    },
  ],

  // ─── Versicherungs- / Vertragspräzedenzen ─────────────────────────

  [
    "CASE-AMOS-6-INSURANCE-2017",
    {
      title: "Recours d'assurance Spacecom AMOS-6 (anomalie pad SpaceX)",
      forum_name: "Arbitrage Lloyd's of London / règlement commercial",
      plaintiff: "Spacecom Ltd. (Israël)",
      defendant: "Lloyd's of London Versicherungspool",
      facts:
        "Le 1er septembre 2016, le satellite AMOS-6 (Spacecom, Israël ; Boeing 702SP) a été détruit pendant le remplissage en carburant pré-lancement à LC-40, Cape Canaveral, lorsque la Falcon 9 de SpaceX a explosé sur le pas de tir. Le contrat de lancement n'avait pas encore été formellement signé au moment de la perte ; le satellite était fixé à la fusée pour des essais de carburant. L'assurance a couvert 195 millions USD de perte de matériel pré-lancement.",
      ruling_summary:
        "Spacecom a perçu 195 millions USD du Lloyd's pré-lancement-pool. Les litiges ultérieurs entre SpaceX et Spacecom sur la rupture de contrat ont été réglés confidentiellement en 2017 — selon les rapports avec un vol de remplacement gratuit sur une future Falcon 9 au choix de Spacecom.",
      legal_holding:
        "Les anomalies survenant pendant le remplissage en carburant pré-lancement déclenchent la couverture d'assurance pré-lancement, et non la couverture d'échec de lancement ; l'événement déclencheur, selon la plupart des polices, est le début du remplissage en carburant, et non l'allumage du moteur principal.",
      industry_significance:
        "Le précédent d'assurance spatiale commerciale le plus cité de la dernière décennie. A entraîné la stratification standard en polices pré-lancement / échec de lancement / première année en orbite à travers le produit moderne d'assurance spatiale du marché londonien. Spacecom s'est par la suite réorientée exclusivement vers les opérations de segment sol.",
    },
  ],

  // ─── Spectrum / ITU-Koordination ──────────────────────────────────

  [
    "CASE-ITU-IRIDIUM-1992",
    {
      title: "Coordination ITU du Mobile-Satellite-Service Iridium",
      forum_name:
        "International Telecommunication Union — Radiocommunication Bureau",
      plaintiff:
        "Diverses administrations nationales (procédure de coordination)",
      defendant: "États-Unis (déclaration Iridium)",
      facts:
        "La première déclaration ITU d'Iridium en 1992 pour des opérations MSS (Mobile-Satellite-Service) en bande L a déclenché une coordination multi-administrations longue — en raison d'interférences potentielles avec des services mobiles terrestres en Russie, en Inde et dans plusieurs administrations du Moyen-Orient. La coordination a duré plus de quatre ans et a nécessité des ajustements importants des plages de fréquence.",
      ruling_summary:
        "La coordination ITU s'est conclue par l'acceptation par Iridium d'allocations de fréquences modifiées et de restrictions opérationnelles dans les marchés coordonnés. L'affaire a établi le modèle moderne de coordination MSS — accords bilatéraux entre administrations en complément du processus formel de l'ITU.",
      legal_holding:
        "La procédure de coordination ITU-R pour les nouveaux systèmes Mobile-Satellite-Service exige des accords bilatéraux entre administrations avec les services potentiellement affectés — même si la procédure formelle de l'ITU ne l'impose pas techniquement.",
      industry_significance:
        "Le précédent de référence pour toute déclaration ITU moderne d'une constellation LEO. Starlink, OneWeb, Kuiper et Iridium-NEXT ont chacune connu des analogues de l'expérience de coordination de 1992–1996.",
    },
  ],

  // ─── EU-Wettbewerb / Beihilferecht ────────────────────────────────

  [
    "CASE-EU-AIRBUS-DS-STATEAID-2023",
    {
      title:
        "Commission européenne c. État membre — aides d'État dans les programmes spatiaux européens de défense",
      forum_name: "Cour de justice de l'Union européenne (Tribunal)",
      plaintiff: "Commission européenne",
      defendant: "État membre (anonymisé dans les procédures en cours)",
      facts:
        "Examen récurrent par l'UE des aides d'État accordées aux programmes spatiaux de défense pilotés par les États membres — notamment l'acquisition de la constellation IRIS², l'allocation industrielle Galileo-2 et plusieurs subventions nationales au développement de lanceurs. Plusieurs arrêts du Tribunal en 2022–2024 ont précisé la portée de l'art. 346 TFUE (exception sécurité au régime des aides d'État) pour les programmes spatiaux de défense.",
      ruling_summary:
        "L'art. 346 TFUE couvre les véritables programmes spatiaux essentiels à la sécurité, mais ne s'étend pas aux activités à double usage à vocation commerciale-export. Les États membres doivent comptablement séparer les volets sécurité et commercial pour invoquer l'exception de l'art. 346.",
      legal_holding:
        "L'exception sécurité au titre de l'art. 346 TFUE ne s'applique aux programmes spatiaux de défense que si le caractère sécuritaire est essentiel et démontrable ; les composantes à vocation commerciale demeurent soumises au contrôle au titre du droit des aides d'État.",
      industry_significance:
        "Alimente l'architecture d'acquisition à double piste de tout programme spatial moderne piloté par l'UE — IRIS², Galileo-2, GovSatCom — séparant les pistes d'acquisition sécurité et commerciale.",
    },
  ],

  [
    "CASE-DE-VG-RAUMFAHRT-2014",
    {
      title:
        "Contrôle par le Verwaltungsgericht d'une autorisation d'export BAFA — refus pour un composant spatial",
      forum_name: "Verwaltungsgericht Köln",
      plaintiff: "Fabricant allemand de composants spatiaux anonymisé",
      defendant: "Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA)",
      facts:
        "Un fabricant anonymisé de composants spatiaux a contesté le refus par la BAFA d'une autorisation d'export pour des composants durcis aux radiations destinés à un projet satellitaire commercial conduit par la Chine. La BAFA a refusé en se fondant sur le § 7 AWG (intérêts essentiels de sécurité).",
      ruling_summary:
        "Le VG Köln a confirmé le refus de la BAFA en estimant que la détermination d'intérêts essentiels de sécurité au titre du § 7 AWG est une décision discrétionnaire de l'administration, soumise à un contrôle juridictionnel restreint (critère de l'acceptabilité).",
      legal_holding:
        "Les déterminations de la BAFA au titre du § 7 AWG concernant les intérêts essentiels de sécurité bénéficient d'une large déférence juridictionnelle ; seul un arbitraire manifeste peut fonder le succès d'un recours.",
      industry_significance:
        "Établit le précédent allemand moderne selon lequel les décisions de refus de la BAFA sont en pratique inattaquables. Les fabricants allemands, en cas de refus, investissent dans la cultivation de clients alternatifs plutôt que dans le contentieux.",
    },
  ],

  // ─── Patent- / IP-Fälle mit Weltraum-Relevanz ─────────────────────

  [
    "CASE-INMARSAT-MASAOKA-2019",
    {
      title:
        "Litige sur brevets standard-essentiels — Inmarsat Mobile-Satellite-Service",
      forum_name: "Diverses juridictions nationales (USA, UK, Japon)",
      plaintiff: "Divers titulaires de brevets",
      defendant: "Inmarsat Global Limited",
      facts:
        "Litiges en contrefaçon de brevets 2017–2019 contre Inmarsat portant sur des SEPs (Standard Essential Patents) pour la technologie de forme d'onde MSS en bande L. Les actions aux États-Unis, au Royaume-Uni et au Japon ont abouti en 2019 à un règlement comprenant des conditions de licences croisées.",
      ruling_summary:
        "Le règlement comprenait une licence croisée onéreuse pour les produits L-Band d'Inmarsat ; montants de règlement confidentiels.",
      legal_holding:
        "Les obligations FRAND s'appliquent aussi aux SEPs du segment spatial ; l'origine standard-technique des brevets (3GPP, ITU-R) constitue l'ancrage essentiel de l'analyse FRAND.",
      industry_significance:
        "Rappel important que le risque brevet s'applique également aux technologies du segment spatial. Les contrats opérateurs MSS modernes contiennent désormais régulièrement des clauses d'indemnisation brevet transférant le risque SEP aux fabricants.",
    },
  ],

  // ─── Russischer ASAT-Test (2021) — Diplomatischer Präzedenzfall ────

  [
    "CASE-RUSSIA-ASAT-2021",
    {
      title:
        "Essai anti-satellite à ascension directe de la Fédération de Russie (destruction de Cosmos 1408)",
      forum_name:
        "Nations unies — Assemblée générale / Conférence du désarmement — précédent diplomatique",
      plaintiff:
        "États-Unis, Royaume-Uni, alliés OTAN et la plupart des États membres de l'ESA (protestation collective)",
      defendant: "Fédération de Russie",
      facts:
        "Le 15 novembre 2021, la Fédération de Russie a effectué un essai anti-satellite à ascension directe (DA-ASAT) et détruit le satellite Cosmos 1408 désactivé d'époque soviétique à environ 500 km d'altitude. L'essai a généré environ 1 500 débris catalogués et des dizaines de milliers de fragments plus petits ; la Station spatiale internationale a fait l'objet d'avertissements de passage de débris pendant plusieurs années.",
      ruling_summary:
        "Malgré les risques pour l'ISS, aucune réclamation formelle au titre de la Convention sur la responsabilité n'a été déposée. Les États-Unis ont introduit une résolution de l'Assemblée générale des Nations unies (Rés. 77/41, 2022) appelant à un moratoire sur les essais ASAT à ascension directe destructifs ; la résolution a été adoptée par 154 voix contre 9 (la Russie et la Chine ont voté contre).",
      legal_holding:
        "Les essais ASAT à ascension directe générant des débris à longue durée de vie sont contraires à la ligne directrice 4 du COPUOS sur la mitigation des débris (éviter la destruction délibérée) — mais aucune règle de droit international contraignante n'existe. Seuls les leviers diplomatiques et politiques sont disponibles.",
      industry_significance:
        "Déclencheur du mouvement actuel « moratoire ASAT » conduit par les États-Unis, le Royaume-Uni, le Canada, la France, l'Australie et le Japon. Établit que les événements destructifs de débris ASAT demeurent un risque résiduel opérationnel pour les opérateurs LEO, auquel ni la Convention sur la responsabilité ni une sanction de licence ne répondent de manière adéquate.",
    },
  ],

  // ─── Italienische ASI-Trümmer-Mitteilung ──────────────────────────

  [
    "CASE-IT-ASI-REENTRY-MK1-2022",
    {
      title:
        "Détermination ASI sur la rentrée — vaisseau Mk-1 (application de suivi anonymisée)",
      forum_name: "Agenzia Spaziale Italiana (ASI)",
      plaintiff: "ASI (examen institutionnel)",
      defendant: "Opérateur commercial anonymisé",
      facts:
        "À la suite de l'avis ASI 02/2022 sur l'évaluation du risque de rentrée, l'ASI a formellement examiné plusieurs missions d'opérateurs commerciaux anonymisées au regard du respect des seuils de risque pour les personnes (10⁻⁴ non contrôlé ; 10⁻⁵ pour une rentrée au-dessus du territoire italien). Deux missions ont nécessité des modifications de conception.",
      ruling_summary:
        "L'ASI a exigé des modifications de conception pour respecter les seuils de risque pour les personnes ; aucune amende civile infligée.",
      legal_holding:
        "L'évaluation ASI du risque pour les personnes est contraignante pour les opérateurs sous licence italienne ; les seuils de risque géographiquement spécifiques (passage au-dessus du territoire italien) s'appliquent en sus des seuils globaux.",
      industry_significance:
        "Premier précédent documenté d'application par la NCA italienne de la mitigation des débris au titre de la loi ASI 89/2025. Établit que la pratique réglementaire italienne s'aligne sur les seuils internationaux les plus stricts.",
    },
  ],

  // ─── Verifizierte Ergänzungen 2024–2026 ───────────────────────────

  [
    "CASE-FAA-SPACEX-2024",
    {
      title:
        "Avis d'amende proposé par la FAA — violations de licence Falcon-9 SpaceX",
      forum_name:
        "U.S. Federal Aviation Administration — Office of Commercial Space Transportation",
      plaintiff:
        "Federal Aviation Administration (FAA), Office of Commercial Space Transportation",
      defendant: "Space Exploration Technologies Corp. (SpaceX)",
      facts:
        "La FAA a annoncé deux amendes proposées pour un total de 633 009 USD à l'encontre de SpaceX pour des violations alléguées de licences de lancement Falcon-9. La première (350 000 USD) portait sur un lancement de juin 2023 (SARah-1), où SpaceX aurait utilisé une nouvelle installation de carburant avant autorisation FAA ; la seconde (283 009 USD) portait sur un lancement de juillet 2023 (EchoStar XXIV), où SpaceX aurait appliqué un dispatch de lancement actualisé et une procédure de revue de préparation au vol modifiée avant autorisation FAA.",
      ruling_summary:
        "La FAA a proposé deux amendes distinctes ; SpaceX a disposé de 30 jours pour répondre. La procédure était pendante au moment de l'annonce ; SpaceX a publiquement contesté l'interprétation FAA des conditions de licence.",
      legal_holding:
        "La portée des conditions de licence FAA au titre du 14 CFR Part 450 s'étend aux modifications de processus du côté opérateur (procédures de revue de préparation au vol modifiées, systèmes sol modifiés) qui touchent à l'analyse de sécurité publique sous-jacente à la licence — et non aux seules modifications matérielles du véhicule de lancement.",
      industry_significance:
        "Première mesure d'amende FAA/AST de haut niveau contre un grand opérateur de lancement commercial. Établit que les modifications de processus pré-vol (et non les seules modifications matérielles) peuvent déclencher des violations de conditions de licence et générer une exposition d'amende substantielle.",
      notes: [
        "SpaceX a publiquement contesté les conclusions de la FAA. Statut au moment de la dernière vérification : en cours de réponse.",
      ],
    },
  ],

  [
    "CASE-FCC-LIGADO-2020",
    {
      title:
        "In the Matter of Ligado Networks Subsidiary LLC — demande de modification d'autorisations",
      forum_name: "U.S. Federal Communications Commission",
      plaintiff: "Federal Communications Commission",
      defendant: "Ligado Networks Subsidiary LLC (anciennement LightSquared)",
      facts:
        "Ligado Networks (successeur de LightSquared) a sollicité auprès de la FCC une modification de ses autorisations en bande L pour exploiter un réseau terrestre à faible puissance dans un spectre adjacent au GPS. Le Department of Defense, le Department of Transportation et de larges communautés d'utilisateurs de récepteurs GPS aéronautiques et agricoles ont formellement contesté la modification, soutenant que les opérations terrestres prévues entraîneraient des interférences nuisibles dans les bandes adjacentes des récepteurs GPS.",
      ruling_summary:
        "La FCC a autorisé la modification (Order FCC 20-48) malgré les objections des agences dissidentes, estimant que les limites de puissance et les masques d'émission hors bande proposés par Ligado n'engendreraient pas d'interférences nuisibles. Le DoD, le DoT et la FAA ont continué à publiquement contester la détermination FCC ; les revues ultérieures de la NTIA et du Congrès se sont enchaînées.",
      legal_holding:
        "Les différends inter-agences sur les prévisions d'interférences sont tranchés par la procédure FCC de modification de licence — les agences fédérales opposantes ont voix au chapitre, mais aucun droit de veto. Le rôle de coordination de la NTIA au titre du National Telecommunications and Information Administration Organization Act est consultatif.",
      industry_significance:
        "Établit le précédent moderne selon lequel les autorisations FCC de spectre commercial peuvent l'emporter sur les objections du DoD/DoT — même lorsque les opérations fédérales de spectre sont concernées. Consolide la primauté de la FCC sur les décisions de licence de spectre commercial.",
      notes: [
        "La procédure demeure politiquement contestée ; les dispositions NDAA 2021 et 2022 ultérieures contenaient des dispositions liées à Ligado.",
      ],
    },
  ],

  [
    "CASE-VEGA-VV15-2019",
    {
      title:
        "Échec de la mission Vega-VV15 — conclusions de la commission d'enquête de l'ESA",
      forum_name: "European Space Agency — Independent Inquiry Commission",
      plaintiff: "European Space Agency (enquête ESA)",
      defendant: "Avio S.p.A. / Arianespace",
      facts:
        "Le 11 juillet 2019, la mission Vega-VV15 a échoué environ deux minutes après le lancement et a détruit le satellite FalconEye-1 (charge utile d'observation de la Terre des forces armées émiraties). L'ESA et Arianespace ont mis en place une commission d'enquête. La commission a identifié comme cause la plus probable une défaillance thermo-structurelle du dôme avant du moteur du second étage Zefiro-23.",
      ruling_summary:
        "La commission d'enquête a publié ses conclusions accompagnées de recommandations de modifications de conception du moteur Zefiro-23 et d'essais de qualification additionnels. Vega est revenue à l'exploitation en septembre 2020 (VV16). Le recours en assurance pour FalconEye-1 a été géré dans le cadre de la couverture standard d'échec de lancement ; les conditions concrètes du règlement n'ont pas été rendues publiques.",
      legal_holding:
        "Les commissions d'enquête conduites par l'ESA pour les échecs de lanceurs européens sont consultatives, non juridictionnelles ; les mesures correctives sont mises en œuvre par le prestataire de lancement (Arianespace/Avio) — et non imposées comme sanctions réglementaires.",
      industry_significance:
        "A établi le modèle moderne d'enquête conduit par l'ESA, appliqué ensuite à Vega VV17 (novembre 2020) et Vega-C VV22 (décembre 2022). Confirme que les enquêtes européennes sur anomalies de lanceurs sont un processus consultatif multipartite, et non une procédure d'application réglementaire.",
    },
  ],
]);
