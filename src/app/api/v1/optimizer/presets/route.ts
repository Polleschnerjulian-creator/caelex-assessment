import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { WEIGHT_PRESETS } from "@/lib/optimizer/weight-presets";

export async function GET() {
  try {
    const presets = Object.values(WEIGHT_PRESETS).map((p) => ({
      name: p.name,
      label: p.label,
      description: p.description,
      weights: p.weights,
    }));
    return NextResponse.json({ data: presets });
  } catch (error) {
    logger.error("[optimizer/presets]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
