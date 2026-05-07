import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Sprint 10I — Inline document picker for UPLOAD_EVIDENCE.
 *
 * Returns the user's most recent vault documents for use in the
 * picker dropdown on /dashboard/items/[reg]/[id]. Scope:
 *   - Documents directly owned by the user, OR
 *   - Documents in any organization the user belongs to
 *
 * Capped at 25 — if the user has more than that, they should use the
 * full /dashboard/documents page (eventually we'll add server-side
 * search to the picker, but the lazy MVP shows the most recent and
 * trusts users to pick from there or jump to the vault).
 *
 * Latest-first ordering matches user intent: when the user clicks
 * "Attach evidence" they probably just uploaded the document.
 */
export interface PickerDocument {
  id: string;
  name: string;
  fileName: string;
  category: string;
  /** Bytes — for the file-size hint in the dropdown row. */
  fileSize: number;
  createdAt: Date;
}

export async function getRecentDocumentsForPicker(
  userId: string,
  limit: number = 25,
): Promise<PickerDocument[]> {
  // Find every org the user is a member of so we can broaden the
  // doc-fetch beyond just user-owned files. Most orgs share docs at
  // the org level, not at the individual-user level.
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);

  const docs = await prisma.document.findMany({
    where: {
      OR: [
        { userId },
        ...(orgIds.length > 0 ? [{ organizationId: { in: orgIds } }] : []),
      ],
      isLatest: true, // Hide superseded versions to keep the picker clean.
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      fileName: true,
      category: true,
      fileSize: true,
      createdAt: true,
    },
  });

  return docs;
}
