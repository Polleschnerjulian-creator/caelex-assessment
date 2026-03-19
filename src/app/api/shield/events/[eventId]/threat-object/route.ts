import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchObjectByNorad } from "@/lib/data-sources/providers/discos-provider.server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!member) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const event = await prisma.conjunctionEvent.findFirst({
      where: { id: eventId, organizationId: member.organizationId },
      select: {
        threatNoradId: true,
        threatObjectName: true,
        threatObjectType: true,
      },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch enriched data from ESA DISCOS
    let discosData = null;
    try {
      discosData = await fetchObjectByNorad(event.threatNoradId);
    } catch {
      // DISCOS unavailable — return basic data from event
    }

    return NextResponse.json({
      noradId: event.threatNoradId,
      name: discosData?.name ?? event.threatObjectName ?? "Unknown",
      objectType:
        discosData?.objectClass ?? event.threatObjectType ?? "Unknown",
      source: discosData ? "ESA DISCOS" : "Space-Track CDM",
      // DISCOS enrichment (null if unavailable)
      discos: discosData
        ? {
            discosId: discosData.discosId,
            cosparId: discosData.cosparId,
            mass: discosData.mass,
            shape: discosData.shape,
            width: discosData.width,
            height: discosData.height,
            depth: discosData.depth,
            span: discosData.span,
            xSectMax: discosData.xSectMax,
            xSectAvg: discosData.xSectAvg,
            active: discosData.active,
            mission: discosData.mission,
            launchDate: discosData.launchDate,
            decayDate: discosData.decayDate,
            cataloguedFragments: discosData.cataloguedFragments,
            onOrbitFragments: discosData.onOrbitFragments,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching threat object:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
