import { NextResponse } from "next/server";
import { WEIGHT_PRESETS } from "@/lib/optimizer/weight-presets";

export async function GET() {
  const presets = Object.values(WEIGHT_PRESETS).map((p) => ({
    name: p.name,
    label: p.label,
    description: p.description,
    weights: p.weights,
  }));
  return NextResponse.json({ data: presets });
}
