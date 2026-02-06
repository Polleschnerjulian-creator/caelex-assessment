import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requiredDocuments } from "@/data/document-vault";

// GET /api/documents/compliance-check - Check document completeness per module
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all user documents
    const userDocuments = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        isLatest: true,
        status: { notIn: ["ARCHIVED", "REJECTED", "EXPIRED"] },
      },
    });

    // Check completeness per module
    const modules = [
      "AUTHORIZATION",
      "DEBRIS",
      "CYBERSECURITY",
      "INSURANCE",
      "ENVIRONMENTAL",
      "SUPERVISION",
    ];

    const moduleCompliance: {
      module: string;
      required: number;
      present: number;
      completeness: number;
      missing: {
        category: string;
        subcategory?: string;
        name: string;
        criticality: string;
        regulatoryRef?: string;
      }[];
      documents: {
        id: string;
        name: string;
        category: string;
        status: string;
        expiryDate: Date | null;
      }[];
    }[] = [];

    for (const moduleName of modules) {
      const required = requiredDocuments[moduleName] || [];
      const present: typeof userDocuments = [];
      const missing: {
        category: string;
        subcategory?: string;
        name: string;
        criticality: string;
        regulatoryRef?: string;
      }[] = [];

      for (const req of required) {
        // Find matching document
        const match = userDocuments.find((doc) => {
          const categoryMatch = doc.category === req.category;
          const subcategoryMatch =
            !req.subcategory || doc.subcategory === req.subcategory;
          return categoryMatch && subcategoryMatch;
        });

        if (match) {
          present.push(match);
        } else if (req.criticality === "MANDATORY") {
          missing.push({
            category: req.category,
            subcategory: req.subcategory,
            name: req.name,
            criticality: req.criticality,
            regulatoryRef: req.regulatoryRef,
          });
        }
      }

      // Only count mandatory documents for completeness
      const mandatoryRequired = required.filter(
        (r) => r.criticality === "MANDATORY",
      ).length;
      const mandatoryPresent = present.filter((p) =>
        required.some(
          (r) =>
            r.criticality === "MANDATORY" &&
            r.category === p.category &&
            (!r.subcategory || r.subcategory === p.subcategory),
        ),
      ).length;

      const completeness =
        mandatoryRequired > 0
          ? Math.round((mandatoryPresent / mandatoryRequired) * 100)
          : 100;

      moduleCompliance.push({
        module: moduleName,
        required: mandatoryRequired,
        present: mandatoryPresent,
        completeness,
        missing,
        documents: present.map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          status: d.status,
          expiryDate: d.expiryDate,
        })),
      });
    }

    // Calculate overall completeness
    const overallRequired = moduleCompliance.reduce(
      (sum, m) => sum + m.required,
      0,
    );
    const overallPresent = moduleCompliance.reduce(
      (sum, m) => sum + m.present,
      0,
    );
    const overallCompleteness =
      overallRequired > 0
        ? Math.round((overallPresent / overallRequired) * 100)
        : 100;

    // Get critical missing documents
    const criticalMissing = moduleCompliance
      .flatMap((m) =>
        m.missing.map((doc) => ({
          ...doc,
          module: m.module,
        })),
      )
      .filter((doc) => doc.criticality === "MANDATORY");

    return NextResponse.json({
      overallCompleteness,
      moduleCompliance,
      criticalMissing,
      totalRequired: overallRequired,
      totalPresent: overallPresent,
    });
  } catch (error) {
    console.error("Error checking document compliance:", error);
    return NextResponse.json(
      { error: "Failed to check document compliance" },
      { status: 500 },
    );
  }
}
