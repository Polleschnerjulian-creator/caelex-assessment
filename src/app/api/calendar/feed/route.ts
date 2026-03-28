export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function escapeIcal(str: string): string {
  return str.replace(/[\\;,\n]/g, (match) => {
    if (match === "\n") return "\\n";
    return "\\" + match;
  });
}

function formatIcalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

// GET /api/calendar/feed - iCal feed of compliance deadlines
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch deadlines, milestones, and scheduled reports for this user
    const [deadlines, missionPhases, scheduledReports] = await Promise.all([
      prisma.deadline.findMany({
        where: { userId },
        orderBy: { dueDate: "asc" },
        take: 200,
      }),
      prisma.missionPhase.findMany({
        where: { userId },
        include: { milestones: true },
        take: 50,
      }),
      prisma.scheduledReport.findMany({
        where: { userId },
        take: 50,
      }),
    ]);

    const milestones = missionPhases.flatMap((p) => p.milestones);

    const now = new Date();
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Caelex//Compliance Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Caelex Compliance Deadlines",
      "X-WR-TIMEZONE:UTC",
    ];

    // Deadlines as VEVENT
    for (const d of deadlines) {
      const uid = `deadline-${d.id}@caelex.eu`;
      const dtStart = formatIcalDate(new Date(d.dueDate));
      const summary = escapeIcal(d.title);
      const desc = d.description ? escapeIcal(d.description) : "";
      const status = d.status === "COMPLETED" ? "COMPLETED" : "NEEDS-ACTION";

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${formatIcalDate(now)}`,
        `DTSTART:${dtStart}`,
        `SUMMARY:[Deadline] ${summary}`,
        desc ? `DESCRIPTION:${desc}` : "",
        `STATUS:${status}`,
        `CATEGORIES:Compliance,Deadline`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        `DESCRIPTION:Deadline tomorrow: ${summary}`,
        "END:VALARM",
        "END:VEVENT",
      );
    }

    // Milestones
    for (const m of milestones) {
      if (!m.targetDate) continue;
      const uid = `milestone-${m.id}@caelex.eu`;
      const dtStart = formatIcalDate(new Date(m.targetDate));
      const summary = escapeIcal(m.name);

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${formatIcalDate(now)}`,
        `DTSTART:${dtStart}`,
        `SUMMARY:[Milestone] ${summary}`,
        m.description ? `DESCRIPTION:${escapeIcal(m.description)}` : "",
        `CATEGORIES:Compliance,Milestone`,
        "END:VEVENT",
      );
    }

    // Scheduled reports
    for (const r of scheduledReports) {
      if (!r.nextRunAt) continue;
      const uid = `report-${r.id}@caelex.eu`;
      const dtStart = formatIcalDate(new Date(r.nextRunAt));
      const summary = escapeIcal(r.name);

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${formatIcalDate(now)}`,
        `DTSTART:${dtStart}`,
        `SUMMARY:[Report] ${summary}`,
        `CATEGORIES:Compliance,Report`,
        "END:VEVENT",
      );
    }

    lines.push("END:VCALENDAR");

    // Filter empty lines
    const ical = lines.filter((l) => l !== "").join("\r\n");

    return new NextResponse(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="caelex-deadlines.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    logger.error("Calendar feed error:", error);
    return NextResponse.json(
      { error: "Failed to generate calendar feed" },
      { status: 500 },
    );
  }
}
