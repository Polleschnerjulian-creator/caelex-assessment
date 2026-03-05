/**
 * Organizations API
 * GET: List user's organizations
 * POST: Create a new organization
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  getUserOrganizations,
  createOrganization,
  generateUniqueSlug,
  isSlugAvailable,
} from "@/lib/services/organization-service";
import { logger } from "@/lib/logger";

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
    logger.error("Error fetching organizations", error);
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

    const createOrgSchema = z.object({
      name: z
        .string()
        .min(2, "Organization name must be at least 2 characters"),
      slug: z
        .string()
        .regex(
          /^[a-z0-9-]+$/,
          "Slug can only contain lowercase letters, numbers, and hyphens",
        )
        .optional(),
      logoUrl: z.string().url().optional(),
      timezone: z.string().optional(),
      defaultLanguage: z.string().optional(),
      billingEmail: z.string().email().optional(),
    });

    const body = await request.json();
    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      name,
      slug: providedSlug,
      logoUrl,
      timezone,
      defaultLanguage,
      billingEmail,
    } = parsed.data;

    // Generate or validate slug
    let slug = providedSlug;
    if (slug) {
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
    logger.error("Error creating organization", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create organization") },
      { status: 500 },
    );
  }
}
