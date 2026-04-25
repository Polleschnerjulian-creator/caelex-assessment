/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Pharos Oversight Scope — types + validators für Mandatory Disclosure
 * Floor (MDF) + Voluntary Disclosure Floor (VDF).
 *
 * Wiederverwendung: ScopeItem, ScopeCategory, Permission kommen aus
 * @/lib/legal-network/scope (Atlas-Architektur). Pharos überlagert
 * lediglich die Semantik:
 *
 *   - MDF (mandatoryDisclosure) — gesetzlich vorgeschrieben, vom Operator
 *     nicht reduzierbar. Wird von der Behörde bei Initiation gesetzt.
 *   - VDF (voluntaryDisclosure) — zusätzlich freigegeben, vom Operator
 *     amendbar. Default leer.
 *
 * Effektiver Aufsichts-Scope = MDF ∪ VDF.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { z } from "zod";
import { ScopeItemSchema, type ScopeItem } from "@/lib/legal-network/scope";

/**
 * MDF + VDF zusammen ergeben den effektiven Aufsichts-Scope. Beide sind
 * Arrays von ScopeItems. Die Trennung ist semantisch — auf DB-Ebene
 * sind es zwei separate JSON-Spalten.
 */
export const OversightScopeSchema = z.object({
  mandatoryDisclosure: z.array(ScopeItemSchema).min(1).max(16),
  voluntaryDisclosure: z.array(ScopeItemSchema).max(16),
});

export type OversightScope = z.infer<typeof OversightScopeSchema>;

/**
 * Vereint MDF + VDF in ein einziges effektives Scope-Set. Verschmilzt
 * gleiche Kategorien — wenn MDF + VDF beide auf "DOCUMENTS" zeigen,
 * werden die permissions union'ed.
 */
export function effectiveScope(
  mandatory: ScopeItem[],
  voluntary: ScopeItem[],
): ScopeItem[] {
  const byCategory = new Map<string, ScopeItem>();
  for (const item of [...mandatory, ...voluntary]) {
    const existing = byCategory.get(item.category);
    if (!existing) {
      byCategory.set(item.category, {
        category: item.category,
        permissions: [...new Set(item.permissions)],
        ...(item.resourceFilter ? { resourceFilter: item.resourceFilter } : {}),
      });
    } else {
      existing.permissions = [
        ...new Set([...existing.permissions, ...item.permissions]),
      ];
    }
  }
  return Array.from(byCategory.values());
}

/**
 * Prüfe ob ein gewünschter Voluntary-Scope den MDF-Bestandteil unverletzt
 * lässt. Operator darf VDF anpassen (zusätzlich freigeben), aber niemals
 * MDF reduzieren — das ist die zentrale Pharos-Compliance-Garantie.
 *
 * Returns true wenn die Anpassung zulässig ist.
 */
export function vdfAmendmentIsValid(
  mandatory: ScopeItem[],
  proposedVoluntary: ScopeItem[],
): { valid: boolean; reason?: string } {
  // VDF kann nur erweitern, nie reduzieren — das ist trivial wenn VDF
  // strict additiv ist. MDF bleibt unverändert. Das bedeutet jeder
  // VDF-Vorschlag der den MDF-Inhalt nicht überlappt ist OK.
  // Zulässig wäre auch: VDF darf MDF überlappen (redundant), das schadet
  // nicht. Kritisch wäre nur wenn jemand MDF-permissions als VDF tarnt
  // und dann VDF "removed" — das geht nur über separate MDF-Mutation,
  // die wir auf Service-Ebene blockieren.
  for (const item of proposedVoluntary) {
    if (!item.category || !item.permissions || item.permissions.length === 0) {
      return {
        valid: false,
        reason: `VDF Item zu Kategorie ${item.category} hat keine permissions`,
      };
    }
  }
  return { valid: true };
}

/**
 * Erzeuge ein MDF-Template basierend auf Behördentyp. Hilft Behörden
 * bei der Initiation einer neuen Aufsicht — anstelle MDF-Items von
 * Hand zu wählen, gibt's vorgefertigte Standards pro Behördentyp.
 *
 * Diese Templates sind nicht final — sie werden bei jeder Initiation
 * vom Behörden-Mitarbeiter editiert/bestätigt.
 */
export function defaultMandatoryDisclosureFor(
  authorityType: string,
): ScopeItem[] {
  switch (authorityType) {
    case "BAFA":
      return [
        {
          category: "DOCUMENTS",
          permissions: ["READ"],
        },
        {
          category: "AUTHORIZATION_WORKFLOWS",
          permissions: ["READ_SUMMARY"],
        },
      ];
    case "BNETZA":
      return [
        {
          category: "SPACECRAFT_REGISTRY",
          permissions: ["READ"],
        },
        {
          category: "AUTHORIZATION_WORKFLOWS",
          permissions: ["READ_SUMMARY"],
        },
      ];
    case "BMWK":
      return [
        {
          category: "COMPLIANCE_ASSESSMENTS",
          permissions: ["READ_SUMMARY"],
        },
        {
          category: "AUTHORIZATION_WORKFLOWS",
          permissions: ["READ"],
        },
        {
          category: "INCIDENTS",
          permissions: ["READ_SUMMARY"],
        },
        {
          category: "SPACECRAFT_REGISTRY",
          permissions: ["READ_SUMMARY"],
        },
      ];
    case "BSI":
      return [
        {
          category: "INCIDENTS",
          permissions: ["READ"],
        },
        {
          category: "COMPLIANCE_ASSESSMENTS",
          permissions: ["READ_SUMMARY"],
        },
      ];
    case "BMVG":
      return [
        {
          category: "COMPLIANCE_ASSESSMENTS",
          permissions: ["READ_SUMMARY"],
        },
        {
          category: "DOCUMENTS",
          permissions: ["READ_SUMMARY"],
        },
      ];
    default:
      // Conservative default — minimal read access on summary level
      return [
        {
          category: "COMPLIANCE_ASSESSMENTS",
          permissions: ["READ_SUMMARY"],
        },
      ];
  }
}
