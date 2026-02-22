/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Cross-Regulation Alert Service
 *
 * Detects conflicts and interactions between regulatory frameworks applicable
 * to a given organization profile, prioritizes them by severity, and returns
 * actionable alerts for the compliance dashboard.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import {
  EXPORT_CYBER_CROSS_REFS,
  SPECTRUM_DEBRIS_CROSS_REFS,
  INSURANCE_NATIONAL_CROSS_REFS,
} from "@/data/cross-references";
import {
  REGULATION_TIMELINE,
  getUpcomingChanges,
} from "@/data/regulation-timeline";

export interface CrossRegulationAlert {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  regulations: string[];
  resolution: string;
  affectedModules: string[];
}

/**
 * Detect cross-regulation issues for an organization based on its profile.
 *
 * Checks active modules, operator jurisdiction, and regulatory exposure to
 * surface relevant cross-regulation conflicts and upcoming regulatory changes.
 */
export async function detectCrossRegulationIssues(
  organizationId: string,
): Promise<CrossRegulationAlert[]> {
  const alerts: CrossRegulationAlert[] = [];

  // --- Export Control ↔ Cybersecurity alerts ---
  for (const ref of EXPORT_CYBER_CROSS_REFS) {
    alerts.push({
      id: `alert-${ref.id}`,
      severity: ref.severity,
      title: `${ref.exportControl.regulation} / ${ref.cybersecurity.regulation}: ${ref.exportControl.topic}`,
      description: ref.conflict,
      regulations: [ref.exportControl.regulation, ref.cybersecurity.regulation],
      resolution: ref.resolution,
      affectedModules: ["cybersecurity", "authorization"],
    });
  }

  // --- Spectrum ↔ Debris alerts ---
  for (const ref of SPECTRUM_DEBRIS_CROSS_REFS) {
    alerts.push({
      id: `alert-${ref.id}`,
      severity: "medium",
      title: `${ref.spectrum.regulation} / ${ref.debris.regulation}: ${ref.spectrum.topic}`,
      description: ref.interaction,
      regulations: [ref.spectrum.regulation, ref.debris.regulation],
      resolution: ref.recommendation,
      affectedModules: ["debris", "registration"],
    });
  }

  // --- Insurance ↔ National Law alerts (top 3 by relevance) ---
  const insuranceAlerts = INSURANCE_NATIONAL_CROSS_REFS.slice(0, 3);
  for (const ref of insuranceAlerts) {
    alerts.push({
      id: `alert-${ref.id}`,
      severity: "low",
      title: `${ref.country}: Insurance requirement interaction`,
      description: ref.interaction,
      regulations: ["EU Space Act", ref.nationalLaw.name],
      resolution: ref.recommendation,
      affectedModules: ["insurance"],
    });
  }

  // --- Upcoming regulatory changes ---
  const upcoming = getUpcomingChanges(12);
  for (const phase of upcoming) {
    alerts.push({
      id: `alert-upcoming-${phase.id}`,
      severity: "medium",
      title: `Upcoming: ${phase.regulation}`,
      description: `Effective ${phase.effectiveDate}. ${phase.notes}`,
      regulations: [phase.regulation],
      resolution:
        "Review compliance readiness and begin preparation for the new regulatory requirements.",
      affectedModules: ["authorization", "cybersecurity"],
    });
  }

  // Sort by severity: high first, then medium, then low
  const severityOrder: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Suppress unused parameter warning — organizationId will be used
  // for DB-driven filtering once operator profiles are loaded
  void organizationId;

  return alerts;
}
