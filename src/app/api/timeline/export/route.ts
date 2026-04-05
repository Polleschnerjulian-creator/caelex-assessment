/**
 * G-1: iCal Export of Timeline Deadlines
 *
 * GET /api/timeline/export — Export all deadlines for the authenticated
 * user/org as an iCalendar (.ics) file.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = session.user.id;

    // Resolve organization context for multi-tenant scoping
    const orgCtx = await getCurrentOrganization(userId);
    const where: Record<string, unknown> = { userId };
    if (orgCtx?.organizationId) {
      where.organizationId = orgCtx.organizationId;
    }

    const deadlines = await prisma.deadline.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    // Build iCal format (RFC 5545)
    let ical =
      "BEGIN:VCALENDAR\r\n" +
      "VERSION:2.0\r\n" +
      "PRODID:-//Caelex//Timeline//EN\r\n" +
      "CALSCALE:GREGORIAN\r\n" +
      "METHOD:PUBLISH\r\n" +
      "X-WR-CALNAME:Caelex Compliance Deadlines\r\n";

    for (const deadline of deadlines) {
      const dtStart =
        deadline.dueDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const createdAt =
        deadline.createdAt.toISOString().replace(/[-:]/g, "").split(".")[0] +
        "Z";

      // Escape iCal text values (fold not required for short strings)
      const summary = escapeIcalText(deadline.title);
      const description = escapeIcalText(
        [
          deadline.description || "",
          deadline.regulatoryRef
            ? `Regulatory Ref: ${deadline.regulatoryRef}`
            : "",
          deadline.penaltyInfo ? `Penalty: ${deadline.penaltyInfo}` : "",
          `Priority: ${deadline.priority}`,
          `Category: ${deadline.category}`,
        ]
          .filter(Boolean)
          .join("\\n"),
      );

      ical += "BEGIN:VEVENT\r\n";
      ical += `UID:${deadline.id}@caelex.eu\r\n`;
      ical += `DTSTAMP:${createdAt}\r\n`;
      ical += `DTSTART:${dtStart}\r\n`;
      ical += `DTEND:${dtStart}\r\n`;
      ical += `SUMMARY:${summary}\r\n`;
      ical += `DESCRIPTION:${description}\r\n`;
      if (deadline.category) {
        ical += `CATEGORIES:${deadline.category}\r\n`;
      }
      ical += "END:VEVENT\r\n";
    }

    ical += "END:VCALENDAR\r\n";

    return new Response(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=caelex-deadlines.ics",
      },
    });
  } catch (error) {
    logger.error("Error exporting timeline as iCal", error);
    return new Response(
      JSON.stringify({ error: "Failed to export deadlines" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/** Escape special characters for iCal text values (RFC 5545 Section 3.3.11) */
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
