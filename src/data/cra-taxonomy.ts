/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Space Product Taxonomy for CRA (EU) 2024/2847 classification.
 * 19 curated product types with Notified-Body-grade reasoning chains.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { CRASpaceProductType } from "@/lib/cra-types";

// ─── Class II Products — Third-Party Assessment Mandatory (Annex IV) ───

const CLASS_II_PRODUCTS: CRASpaceProductType[] = [
  {
    id: "obc",
    name: "On-board Computer",
    segments: ["space"],
    description:
      "Central spacecraft bus computer controlling AOCS, thermal management, TT&C routing, and payload scheduling. Executes flight software and processes telecommand authentication.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "On-board Computer is hardware with embedded software that maintains a data connection to the spacecraft bus (SpaceWire/MIL-STD-1553).",
      },
      {
        criterion:
          "Product controlling physical systems in critical infrastructure",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "Satellite systems are critical infrastructure under NIS2 Annex I Sector 11 (Space). The OBC controls central spacecraft bus logic including AOCS, thermal management, and TT&C routing — failure leads to complete mission loss.",
      },
      {
        criterion: "Product whose failure can generate space debris",
        legalBasis: "Erwägungsgrund 29 CRA i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "OBC failure during collision avoidance maneuvers can result in conjunction events and debris generation (IADC Guideline 5.2.3). Unlike ground-based systems, OBC failures in orbit are irreversible.",
      },
      {
        criterion: "Product processing authentication data",
        legalBasis: "Annex IV Kategorie 2",
        annexRef: "Annex IV",
        annexCategory: "2",
        satisfied: true,
        reasoning:
          "OBC processes TT&C authentication sequences for telecommand verification — unauthorized access enables complete spacecraft control.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure", "satellite_communications"],
  },
  {
    id: "aocs_flight_sw",
    name: "AOCS Flight Software",
    segments: ["space"],
    description:
      "Attitude and Orbit Control System flight software. Controls spacecraft attitude determination, orbit maintenance, and collision avoidance maneuvers.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "AOCS flight software is embedded software that maintains a data connection to spacecraft bus sensors (star trackers, gyroscopes) and actuators (reaction wheels, thrusters).",
      },
      {
        criterion:
          "Product controlling physical systems in critical infrastructure",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "AOCS directly controls spacecraft attitude and orbital position. Satellite systems are critical infrastructure under NIS2 Annex I Sector 11. AOCS malfunction has immediate physical consequences: uncontrolled tumbling, orbit deviation, collision risk.",
      },
      {
        criterion: "Product whose failure can generate space debris",
        legalBasis: "Erwägungsgrund 29 CRA i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "AOCS failure during collision avoidance maneuvers can result in conjunction events and debris generation (IADC Guideline 5.2.3). Unlike ground-based industrial control, AOCS failures in orbit are irreversible — no physical intervention possible.",
      },
      {
        criterion: "Product performing safety-critical computations",
        legalBasis: "Annex IV Kategorie 1, ECSS-Q-ST-80C",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "AOCS performs real-time attitude determination and orbit propagation calculations. Error in attitude knowledge directly affects pointing accuracy for communication antennas and solar arrays, potentially leading to loss of mission.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure", "satellite_communications"],
  },
  {
    id: "ttc_ground_system",
    name: "TT&C Ground System",
    segments: ["ground"],
    description:
      "Telemetry, Tracking & Command ground system. Processes spacecraft telemetry, generates and authenticates telecommands, manages encryption keys for uplink/downlink.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "TT&C ground system is software/hardware that maintains network connections to antenna systems, spacecraft via RF link, and mission control networks.",
      },
      {
        criterion: "Product processing authentication and authorization data",
        legalBasis: "Annex IV Kategorie 2",
        annexRef: "Annex IV",
        annexCategory: "2",
        satisfied: true,
        reasoning:
          "TT&C ground systems process spacecraft authentication sequences, command authorization tokens, and telecommand encryption keys. Compromise enables unauthorized spacecraft control.",
      },
      {
        criterion:
          "Product performing cryptographic operations for critical infrastructure",
        legalBasis: "Annex IV Kategorie 3",
        annexRef: "Annex IV",
        annexCategory: "3",
        satisfied: true,
        reasoning:
          "TT&C systems perform encryption/decryption of telecommand uplinks and telemetry downlinks using space-grade cryptographic algorithms. Key management is integral to spacecraft security.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure"],
  },
  {
    id: "mission_control_sw",
    name: "Mission Control Software",
    segments: ["ground"],
    description:
      "Central command and control software for satellite fleet management. Manages mission planning, pass scheduling, anomaly detection, and operator workflows.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Mission control software is networked software connecting operators, ground stations, spacecraft interfaces, and mission databases.",
      },
      {
        criterion: "Product controlling critical infrastructure systems",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "Mission control is the central C2 system for satellite fleet operations. It orchestrates all spacecraft commanding, health monitoring, and contingency responses. Compromise or failure affects the entire satellite constellation.",
      },
      {
        criterion: "Network management system for critical infrastructure",
        legalBasis: "Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "Mission control manages the ground segment network topology, ground station scheduling, and inter-facility communications — meeting the CRA definition of network management for critical infrastructure.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure"],
  },
  {
    id: "satellite_c2",
    name: "Satellite Command & Control System",
    segments: ["ground"],
    description:
      "Dedicated system for spacecraft commanding and telemetry processing. Handles command authorization, authentication, and real-time spacecraft state monitoring.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Satellite C2 is networked software processing spacecraft telemetry and generating authenticated telecommands.",
      },
      {
        criterion: "Product processing authentication and authorization data",
        legalBasis: "Annex IV Kategorie 2",
        annexRef: "Annex IV",
        annexCategory: "2",
        satisfied: true,
        reasoning:
          "C2 system manages operator authentication, command authorization workflows, and spacecraft access control. Unauthorized access to C2 enables direct spacecraft commanding.",
      },
      {
        criterion: "Product in critical infrastructure with control function",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "C2 system directly controls spacecraft operations. Loss of C2 integrity can result in unauthorized maneuvers, telemetry spoofing, or mission disruption.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure", "satellite_communications"],
  },
  {
    id: "hsm_space",
    name: "Hardware Security Module (Space-grade)",
    segments: ["space"],
    description:
      "Radiation-hardened cryptographic hardware module for on-board key management, telecommand authentication, and payload data encryption.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Space-grade HSM is hardware with embedded firmware performing cryptographic operations on the spacecraft bus.",
      },
      {
        criterion: "Cryptographic device for key management",
        legalBasis: "Annex IV Kategorie 3",
        annexRef: "Annex IV",
        annexCategory: "3",
        satisfied: true,
        reasoning:
          "HSM performs key generation, storage, and cryptographic operations for spacecraft authentication. Compromise of the HSM invalidates all on-board security mechanisms.",
      },
      {
        criterion: "Product in critical infrastructure",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 3",
        annexRef: "Annex IV",
        annexCategory: "3",
        satisfied: true,
        reasoning:
          "Space-grade HSMs protect the cryptographic foundation of satellite communications, which are NIS2 Annex I Sector 11 critical infrastructure.",
      },
    ],
    nis2SubSectors: ["satellite_communications"],
  },
];

// ─── Class I Products — Harmonised Standard or Third-Party (Annex III) ───

const CLASS_I_PRODUCTS: CRASpaceProductType[] = [
  {
    id: "sdr",
    name: "Software-Defined Radio",
    segments: ["space", "link"],
    description:
      "Reconfigurable radio transceiver for intersatellite links and ground communication. Supports multiple waveforms and frequency bands via software updates.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "SDR is hardware with embedded software maintaining RF communication links between spacecraft and ground stations or other satellites.",
      },
      {
        criterion: "Network-capable product in critical infrastructure",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "SDR provides the physical network interface for satellite communications. It is a configurable network device deployed in NIS2 Annex I critical infrastructure.",
      },
      {
        criterion: "Product performing cryptographic communication",
        legalBasis: "Annex III Kategorie 2.3",
        annexRef: "Annex III",
        annexCategory: "2.3",
        satisfied: true,
        reasoning:
          "SDRs typically perform link-layer encryption for intersatellite and ground links, meeting the definition of products implementing cryptographic protocols.",
      },
    ],
    nis2SubSectors: ["satellite_communications"],
  },
  {
    id: "gnss_receiver",
    name: "GNSS Receiver (embedded)",
    segments: ["space", "user"],
    description:
      "Embedded GNSS receiver for spacecraft position determination. Used in orbit determination, autonomous navigation, and timing synchronization.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "GNSS receiver is hardware with embedded software processing satellite navigation signals and outputting position/velocity/time data to the spacecraft bus.",
      },
      {
        criterion:
          "Product processing positioning data in safety-relevant context",
        legalBasis: "Annex III Kategorie 2.4",
        annexRef: "Annex III",
        annexCategory: "2.4",
        satisfied: true,
        reasoning:
          "GNSS receivers on spacecraft provide positioning data used for orbit determination and collision avoidance — safety-relevant applications where spoofed or degraded signals can lead to incorrect maneuver decisions.",
      },
    ],
    nis2SubSectors: ["navigation", "space_situational_awareness"],
  },
  {
    id: "ground_station_sw",
    name: "Ground Station Software",
    segments: ["ground"],
    description:
      "Software for antenna tracking, RF signal processing, and ground station automation. Manages pass scheduling, signal acquisition, and data routing.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Ground station software is networked software controlling antenna systems, RF equipment, and data routing infrastructure.",
      },
      {
        criterion: "Network management product",
        legalBasis: "Annex III Kategorie 2.2",
        annexRef: "Annex III",
        annexCategory: "2.2",
        satisfied: true,
        reasoning:
          "Ground station software manages the configuration and operation of antenna systems and RF network equipment, meeting the CRA definition of network management software.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure"],
  },
  {
    id: "data_handling_unit",
    name: "Data Handling Unit",
    segments: ["space"],
    description:
      "Spacecraft data handling subsystem. Manages onboard data routing, packetization, and storage. Interfaces with payload instruments and spacecraft bus via SpaceWire or similar.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Data handling unit is hardware with embedded software maintaining data connections across the spacecraft bus network.",
      },
      {
        criterion: "Network-capable product with microcontroller",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "DHU contains a microcontroller with network interfaces (SpaceWire/MIL-STD-1553) to the spacecraft bus, routing data between payload instruments and the OBC/downlink chain.",
      },
    ],
    nis2SubSectors: ["satellite_communications", "earth_observation"],
  },
  {
    id: "intersatellite_link",
    name: "Intersatellite Link Terminal",
    segments: ["link"],
    description:
      "Optical or RF terminal for direct satellite-to-satellite communication. Enables mesh networking in constellations and data relay between spacecraft.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "ISL terminal is hardware with embedded software establishing and maintaining data links between spacecraft.",
      },
      {
        criterion: "Network interface product",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "ISL terminals are the network interface devices enabling intersatellite communication networks, directly meeting the definition of network-capable products.",
      },
      {
        criterion: "Product implementing cryptographic protocols",
        legalBasis: "Annex III Kategorie 2.3",
        annexRef: "Annex III",
        annexCategory: "2.3",
        satisfied: true,
        reasoning:
          "ISL terminals typically implement link-layer encryption for data relay between spacecraft, using space-grade cryptographic protocols.",
      },
    ],
    nis2SubSectors: ["satellite_communications"],
  },
  {
    id: "flight_software",
    name: "Flight Software (non-AOCS)",
    segments: ["space"],
    description:
      "General spacecraft flight software for housekeeping, thermal control, power management, and mode transitions. Excludes AOCS which is a separate Class II product.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Flight software is embedded software running on the OBC that interfaces with spacecraft subsystems via the bus network.",
      },
      {
        criterion: "Embedded software with network function",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "Flight software communicates over the spacecraft bus (SpaceWire/CAN/MIL-STD-1553), managing subsystem commands and telemetry collection. While not safety-critical like AOCS, it controls power and thermal subsystems critical to mission success.",
      },
    ],
    nis2SubSectors: ["satellite_communications"],
  },
  {
    id: "payload_processor",
    name: "Payload Data Processor",
    segments: ["space"],
    description:
      "Onboard processor for mission payload data. Performs data compression, formatting, encryption, and buffering for downlink. Used in EO, SAR, and SIGINT missions.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Payload data processor is hardware with embedded software that receives, processes, and routes mission data for downlink.",
      },
      {
        criterion: "Network-capable product with microcontroller",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "Payload processor contains microcontrollers with network interfaces to the spacecraft bus and downlink chain. Processes potentially sensitive EO/SAR data requiring data integrity guarantees.",
      },
    ],
    nis2SubSectors: ["earth_observation"],
  },
  {
    id: "ground_network_infra",
    name: "Ground Network Infrastructure",
    segments: ["ground"],
    description:
      "Network equipment in the ground segment: firewalls, routers, switches, and VPN gateways connecting ground stations, mission control, and data centers.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Network infrastructure devices are hardware/software products with network connectivity by definition.",
      },
      {
        criterion: "Network management and security product",
        legalBasis: "Annex III Kategorie 2.2",
        annexRef: "Annex III",
        annexCategory: "2.2",
        satisfied: true,
        reasoning:
          "Firewalls, routers, and switches in the space ground segment are network security products explicitly listed in CRA Annex III Category 2.2.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure"],
  },
  {
    id: "key_management_sw",
    name: "Key Management Software",
    segments: ["ground"],
    description:
      "Software for managing cryptographic keys used in spacecraft commanding, telemetry decryption, and intersatellite link encryption. Handles key generation, distribution, rotation, and revocation.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Key management software is a networked application managing cryptographic material across ground segment systems.",
      },
      {
        criterion: "Product performing cryptographic operations",
        legalBasis: "Annex III Kategorie 2.3",
        annexRef: "Annex III",
        annexCategory: "2.3",
        satisfied: true,
        reasoning:
          "Key management software generates, stores, and distributes cryptographic keys. While not a hardware HSM (which would be Class II under Annex IV Kat. 3), the software component handles key lifecycle operations that are critical to spacecraft communication security.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure", "satellite_communications"],
  },
];

// ─── Default Products — Self-Assessment (Annex VIII) ───

const DEFAULT_PRODUCTS: CRASpaceProductType[] = [
  {
    id: "star_tracker",
    name: "Star Tracker",
    segments: ["space"],
    description:
      "Optical sensor for spacecraft attitude determination. Captures star field images and matches against onboard star catalog to compute pointing direction.",
    classification: "default",
    conformityRoute: "self_assessment",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Star tracker contains embedded processing for star pattern recognition, meeting the basic CRA product definition.",
      },
      {
        criterion: "Network-capable product",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: false,
        reasoning:
          "Star tracker provides attitude data over the spacecraft bus but does not have an independent network function. It is a sensor providing unidirectional data output, not a networked device.",
      },
      {
        criterion: "Product processing authentication data",
        legalBasis: "Annex IV Kategorie 2",
        annexRef: "Annex IV",
        annexCategory: "2",
        satisfied: false,
        reasoning:
          "Star tracker does not process authentication credentials, authorization tokens, or cryptographic material.",
      },
    ],
    nis2SubSectors: [],
  },
  {
    id: "reaction_wheel",
    name: "Reaction Wheel (with embedded controller)",
    segments: ["space"],
    description:
      "Momentum exchange actuator for spacecraft attitude control. Contains an embedded motor controller but no independent processing or network capability.",
    classification: "default",
    conformityRoute: "self_assessment",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Reaction wheel contains an embedded motor controller with firmware, meeting the basic CRA product definition.",
      },
      {
        criterion: "Network-capable product",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: false,
        reasoning:
          "Reaction wheel's embedded controller receives commanded torque values from the OBC but has no independent network function. It is a peripheral actuator, not a networked device.",
      },
    ],
    nis2SubSectors: [],
  },
  {
    id: "solar_array_driver",
    name: "Solar Array Drive Mechanism (SADM)",
    segments: ["space"],
    description:
      "Electromechanical actuator for solar panel positioning. Contains simple control electronics for motor driving and position sensing.",
    classification: "default",
    conformityRoute: "self_assessment",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "SADM contains simple control electronics with firmware for motor driving and position feedback.",
      },
      {
        criterion: "Network-capable product",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: false,
        reasoning:
          "SADM receives positioning commands from the OBC over a simple command interface. No independent network function, no data processing beyond motor control.",
      },
    ],
    nis2SubSectors: [],
  },
  {
    id: "ground_monitoring_tool",
    name: "Ground Monitoring/Visualization Tool",
    segments: ["ground"],
    description:
      "Display and visualization software for spacecraft telemetry, orbit tracks, and ground station status. Read-only tool with no commanding or control capability.",
    classification: "default",
    conformityRoute: "self_assessment",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Monitoring tool is software with network connectivity for receiving telemetry feeds.",
      },
      {
        criterion: "Network management product",
        legalBasis: "Annex III Kategorie 2.2",
        annexRef: "Annex III",
        annexCategory: "2.2",
        satisfied: false,
        reasoning:
          "Monitoring tool is read-only — it visualizes data but does not manage, configure, or control network equipment or spacecraft systems. No commanding capability.",
      },
      {
        criterion: "Product in critical infrastructure with control function",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: false,
        reasoning:
          "Tool has no control function. It cannot send commands, modify configurations, or affect spacecraft operations. Pure visualization.",
      },
    ],
    nis2SubSectors: [],
  },
];

// ─── Consolidated Taxonomy ───

export const SPACE_PRODUCT_TAXONOMY: CRASpaceProductType[] = [
  ...CLASS_II_PRODUCTS,
  ...CLASS_I_PRODUCTS,
  ...DEFAULT_PRODUCTS,
];

// ─── Lookup Helpers ───

export function getSpaceProductById(
  id: string,
): CRASpaceProductType | undefined {
  return SPACE_PRODUCT_TAXONOMY.find((p) => p.id === id);
}

export function getSpaceProductsByClass(
  classification: "default" | "class_I" | "class_II",
): CRASpaceProductType[] {
  return SPACE_PRODUCT_TAXONOMY.filter(
    (p) => p.classification === classification,
  );
}

export function getSpaceProductsBySegment(
  segment: "space" | "ground" | "link" | "user",
): CRASpaceProductType[] {
  return SPACE_PRODUCT_TAXONOMY.filter((p) => p.segments.includes(segment));
}
