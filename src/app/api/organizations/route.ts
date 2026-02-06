/**
 * Organizations API
 * GET: List user's organizations
 * POST: Create a new organization
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  getUserOrganizations,
  createOrganization,
  generateUniqueSlug,
  isSlugAvailable,
} from "@/lib/services/organization-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await getUserOrganizations(session.user.id);

    return NextResponse.json({
      organizations: organizations.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        logoUrl: membership.organization.logoUrl,
        primaryColor: membership.organization.primaryColor,
        plan: membership.organization.plan,
        role: membership.role,
        joinedAt: membership.joinedAt,
        memberCount: membership.organization._count.members,
        spacecraftCount: membership.organization._count.spacecraft,
      })),
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug: providedSlug,
      logoUrl,
      timezone,
      defaultLanguage,
      billingEmail,
    } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Organization name must be at least 2 characters" },
        { status: 400 },
      );
    }

    // Generate or validate slug
    let slug = providedSlug;
    if (slug) {
      // Validate provided slug format
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return NextResponse.json(
          {
            error:
              "Slug can only contain lowercase letters, numbers, and hyphens",
          },
          { status: 400 },
        );
      }
      if (!(await isSlugAvailable(slug))) {
        return NextResponse.json(
          { error: "This slug is already taken" },
          { status: 400 },
        );
      }
    } else {
      slug = await generateUniqueSlug(name);
    }

    const organization = await createOrganization(session.user.id, {
      name: name.trim(),
      slug,
      logoUrl,
      timezone,
      defaultLanguage,
      billingEmail,
    });

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
      },
      message: "Organization created successfully",
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create organization") },
      { status: 500 },
    );
  }
}
