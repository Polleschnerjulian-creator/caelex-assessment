/**
 * Generate 2.0 — Impact Analysis Engine
 *
 * Computes which documents/sections are affected when assessment data changes.
 * Pure lookup + grouping. No AI call. ~50ms.
 */

import type { NCADocumentType } from "./types";
import { NCA_DOC_TYPE_MAP } from "./types";
import { DEPENDENCY_MAP } from "./impact-dependencies";

export interface ImpactResult {
  changedField: string;
  oldValue: unknown;
  newValue: unknown;
  affectedDocuments: AffectedDocument[];
  totalSectionsAffected: number;
  estimatedRegenerationTime: string;
}

export interface AffectedDocument {
  documentType: NCADocumentType;
  documentTitle: string;
  hasExistingDocument: boolean;
  sections: AffectedSection[];
}

export interface AffectedSection {
  sectionIndex: number;
  sectionTitle: string;
  impactLevel: "invalidates" | "requires_review" | "minor_update";
  reason: string;
}

export function computeImpact(
  changedFields: Array<{
    field: string;
    source: string;
    oldValue: unknown;
    newValue: unknown;
  }>,
  existingDocuments: Set<NCADocumentType>,
): ImpactResult[] {
  return changedFields
    .map((change) => {
      const mapping = DEPENDENCY_MAP.find(
        (d) => d.field === change.field && d.source === change.source,
      );
      if (!mapping) return null;

      // Group affected sections by document type
      const byDocument = new Map<NCADocumentType, AffectedSection[]>();
      for (const dep of mapping.affects) {
        const existing = byDocument.get(dep.documentType) || [];
        existing.push({
          sectionIndex: dep.sectionIndex,
          sectionTitle: dep.sectionTitle,
          impactLevel: dep.impactLevel,
          reason: dep.reason,
        });
        byDocument.set(dep.documentType, existing);
      }

      const affectedDocuments: AffectedDocument[] = Array.from(
        byDocument.entries(),
      ).map(([docType, sections]) => ({
        documentType: docType,
        documentTitle: NCA_DOC_TYPE_MAP[docType]?.title || docType,
        hasExistingDocument: existingDocuments.has(docType),
        sections: sections.sort((a, b) => a.sectionIndex - b.sectionIndex),
      }));

      const totalSectionsAffected = affectedDocuments.reduce(
        (sum, d) => sum + d.sections.length,
        0,
      );
      const invalidatedSections = affectedDocuments.reduce(
        (sum, d) =>
          sum +
          d.sections.filter((s) => s.impactLevel === "invalidates").length,
        0,
      );

      return {
        changedField: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        affectedDocuments,
        totalSectionsAffected,
        estimatedRegenerationTime: `~${Math.max(1, Math.ceil(invalidatedSections * 0.3))} min`,
      };
    })
    .filter((r): r is ImpactResult => r !== null);
}
