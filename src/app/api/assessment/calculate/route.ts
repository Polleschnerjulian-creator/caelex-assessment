/**
 * RETIRED — rebuild Task 4.2. The legacy EU Space Act wizard was replaced by the
 * assessment spine; its calculate endpoint is permanently gone. Stored
 * results keep rendering from their saved snapshots — nothing re-computes
 * through this route. The legacy NIS2 engine's Art-26 Rule 4 misreading is
 * retired WITH these wizards (the gateway in src/lib/assessment/ is the
 * corrected source of truth, spec §7.1 #3).
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint has been retired.",
      moved: "/api/assessment/v2/quick",
    },
    { status: 410 },
  );
}
