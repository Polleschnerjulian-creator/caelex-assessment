import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

/**
 * POST /api/environmental/suppliers/import
 *
 * Import supplier response data into the environmental assessment.
 * This takes the LCA data from a supplier submission and creates
 * or updates the corresponding environmental impact calculations.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId required" },
        { status: 400 },
      );
    }

    // Get the supplier request with response data
    const supplierRequest = await prisma.supplierDataRequest.findUnique({
      where: { id: requestId },
      include: {
        assessment: {
          select: {
            id: true,
            userId: true,
            missionName: true,
            spacecraftMassKg: true,
          },
        },
      },
    });

    if (!supplierRequest) {
      return NextResponse.json(
        { error: "Supplier request not found" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (supplierRequest.assessment.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if response data exists
    if (!supplierRequest.responseData) {
      return NextResponse.json(
        { error: "No supplier response data available" },
        { status: 400 },
      );
    }

    // Parse the response data
    let responseData;
    try {
      responseData = JSON.parse(supplierRequest.responseData);
    } catch {
      return NextResponse.json(
        { error: "Invalid response data format" },
        { status: 400 },
      );
    }

    const lcaData = responseData.lcaData;
    if (!lcaData) {
      return NextResponse.json(
        { error: "No LCA data in supplier response" },
        { status: 400 },
      );
    }

    // Calculate environmental impact from supplier data
    const manufacturingImpact = calculateManufacturingImpact(lcaData);
    const transportImpact = calculateTransportImpact(lcaData);

    // Check if we already have impact results for manufacturing phase
    const existingManufacturing =
      await prisma.environmentalImpactResult.findUnique({
        where: {
          assessmentId_phase: {
            assessmentId: supplierRequest.assessmentId,
            phase: "manufacturing",
          },
        },
      });

    // Upsert manufacturing impact
    await prisma.environmentalImpactResult.upsert({
      where: {
        assessmentId_phase: {
          assessmentId: supplierRequest.assessmentId,
          phase: "manufacturing",
        },
      },
      update: {
        gwpKgCO2eq:
          (existingManufacturing?.gwpKgCO2eq || 0) + manufacturingImpact.gwp,
        odpKgCFC11eq:
          (existingManufacturing?.odpKgCFC11eq || 0) + manufacturingImpact.odp,
        updatedAt: new Date(),
      },
      create: {
        assessmentId: supplierRequest.assessmentId,
        phase: "manufacturing",
        gwpKgCO2eq: manufacturingImpact.gwp,
        odpKgCFC11eq: manufacturingImpact.odp,
        percentOfTotal: 0, // Will be recalculated
      },
    });

    // Upsert transport impact
    const existingTransport = await prisma.environmentalImpactResult.findUnique(
      {
        where: {
          assessmentId_phase: {
            assessmentId: supplierRequest.assessmentId,
            phase: "transport_to_launch",
          },
        },
      },
    );

    await prisma.environmentalImpactResult.upsert({
      where: {
        assessmentId_phase: {
          assessmentId: supplierRequest.assessmentId,
          phase: "transport_to_launch",
        },
      },
      update: {
        gwpKgCO2eq: (existingTransport?.gwpKgCO2eq || 0) + transportImpact.gwp,
        odpKgCFC11eq:
          (existingTransport?.odpKgCFC11eq || 0) + transportImpact.odp,
        updatedAt: new Date(),
      },
      create: {
        assessmentId: supplierRequest.assessmentId,
        phase: "transport_to_launch",
        gwpKgCO2eq: transportImpact.gwp,
        odpKgCFC11eq: transportImpact.odp,
        percentOfTotal: 0,
      },
    });

    // Recalculate total GWP for the assessment
    const allImpacts = await prisma.environmentalImpactResult.findMany({
      where: { assessmentId: supplierRequest.assessmentId },
    });

    const totalGWP = allImpacts.reduce((sum, i) => sum + i.gwpKgCO2eq, 0);
    const totalODP = allImpacts.reduce((sum, i) => sum + i.odpKgCFC11eq, 0);

    // Update percentages
    for (const impact of allImpacts) {
      await prisma.environmentalImpactResult.update({
        where: { id: impact.id },
        data: {
          percentOfTotal:
            totalGWP > 0 ? (impact.gwpKgCO2eq / totalGWP) * 100 : 0,
        },
      });
    }

    // Update assessment totals
    await prisma.environmentalAssessment.update({
      where: { id: supplierRequest.assessmentId },
      data: {
        totalGWP,
        totalODP,
        carbonIntensity:
          supplierRequest.assessment.spacecraftMassKg > 0
            ? totalGWP / supplierRequest.assessment.spacecraftMassKg
            : null,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "supplier_data_imported",
      entityType: "environmental_assessment",
      entityId: supplierRequest.assessmentId,
      newValue: {
        supplierName: supplierRequest.supplierName,
        componentType: supplierRequest.componentType,
        manufacturingGWP: manufacturingImpact.gwp,
        transportGWP: transportImpact.gwp,
      },
      description: `Imported LCA data from ${supplierRequest.supplierName} for ${supplierRequest.componentType}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      imported: {
        supplierName: supplierRequest.supplierName,
        componentType: supplierRequest.componentType,
        manufacturingImpact,
        transportImpact,
      },
      assessment: {
        totalGWP,
        totalODP,
      },
    });
  } catch (error) {
    console.error("Import supplier data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Calculate manufacturing impact from LCA data
 * Uses simplified emission factors based on industry averages
 */
function calculateManufacturingImpact(lcaData: Record<string, unknown>): {
  gwp: number;
  odp: number;
} {
  // Emission factors (kg CO2eq per kWh or kg)
  const ENERGY_FACTORS: Record<string, number> = {
    grid_avg: 0.4, // kg CO2eq/kWh (EU average)
    renewable: 0.02,
    renewable_partial: 0.2,
    solar: 0.04,
    wind: 0.01,
    gas: 0.45,
    coal: 0.95,
    nuclear: 0.01,
    unknown: 0.5,
  };

  // Material factors (kg CO2eq/kg)
  const MATERIAL_FACTORS: Record<string, number> = {
    aluminum: 10,
    steel: 2,
    titanium: 35,
    carbon_fiber: 25,
    silicon: 50,
    copper: 3,
    gold: 20000,
    platinum: 35000,
    glass: 1,
    ceramic: 5,
    polymer: 3,
    other: 5,
  };

  let gwp = 0;
  let odp = 0;

  // Energy consumption
  const energyKwh = Number(lcaData.manufacturingEnergyKwh) || 0;
  const energySource = String(lcaData.manufacturingEnergySource || "grid_avg");
  const energyFactor = ENERGY_FACTORS[energySource] || ENERGY_FACTORS.grid_avg;
  gwp += energyKwh * energyFactor;

  // Material production
  const primaryMaterial = String(lcaData.primaryMaterial || "other");
  const materialMass = Number(lcaData.primaryMaterialMassKg) || 0;
  const materialFactor =
    MATERIAL_FACTORS[primaryMaterial] || MATERIAL_FACTORS.other;
  gwp += materialMass * materialFactor;

  // Account for waste/scrap (defect rate)
  const defectRate = Number(lcaData.defectRate) || 0;
  if (defectRate > 0) {
    gwp *= 1 + defectRate / 100;
  }

  // ODP is typically very small for manufacturing
  odp = gwp * 0.00001; // Simplified factor

  return { gwp: Math.round(gwp * 100) / 100, odp };
}

/**
 * Calculate transport impact from LCA data
 */
function calculateTransportImpact(lcaData: Record<string, unknown>): {
  gwp: number;
  odp: number;
} {
  // Transport emission factors (kg CO2eq per kg-km)
  const TRANSPORT_FACTORS: Record<string, number> = {
    air: 0.0006,
    sea: 0.00003,
    road: 0.0001,
    rail: 0.00003,
    multimodal: 0.0002,
  };

  const distanceKm = Number(lcaData.transportDistanceKm) || 0;
  const mode = String(lcaData.transportMode || "road");
  const componentMass = Number(lcaData.componentMassKg) || 0;
  const factor = TRANSPORT_FACTORS[mode] || TRANSPORT_FACTORS.road;

  const gwp = distanceKm * componentMass * factor;
  const odp = gwp * 0.000001; // Simplified factor

  return { gwp: Math.round(gwp * 100) / 100, odp };
}
