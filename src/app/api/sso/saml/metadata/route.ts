/**
 * SAML SP Metadata API
 * GET - Get SAML Service Provider metadata XML
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSAMLMetadataXML } from "@/lib/services/sso-service";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("orgId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Get the base URL from headers
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const metadataXml = generateSAMLMetadataXML(baseUrl, organizationId);

    return new NextResponse(metadataXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": 'attachment; filename="saml-metadata.xml"',
      },
    });
  } catch (error) {
    console.error("Error generating SAML metadata:", error);
    return NextResponse.json(
      { error: "Failed to generate SAML metadata" },
      { status: 500 },
    );
  }
}
