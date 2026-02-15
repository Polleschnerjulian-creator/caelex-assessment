import { prisma } from "@/lib/prisma";
import { trackSignup } from "@/lib/logsnag";
import { serverAnalytics } from "@/lib/analytics";
import { generateUniqueSlug } from "@/lib/services/organization-service";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { RegisterSchema, formatZodErrors } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input using the centralized schema
    const validation = RegisterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodErrors(validation.error),
        },
        { status: 400 },
      );
    }

    const { name, email, password, organization, acceptAnalytics } =
      validation.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "Account already exists" },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    // Determine organization name
    const orgName = organization || `${name}'s Organization`;
    const orgSlug = await generateUniqueSlug(orgName);

    // Create User + Organization + Membership + Subscription in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashed,
          organization: orgName,
        },
      });

      // 2. Create organization with FREE plan defaults
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          plan: "FREE",
          maxUsers: 1,
          maxSpacecraft: 1,
        },
      });

      // 3. Add user as organization owner
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "OWNER",
          permissions: ["*"],
        },
      });

      // 4. Create FREE subscription (no Stripe customer needed)
      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: "FREE",
          status: "ACTIVE",
          stripeCustomerId: null,
          currentPeriodStart: new Date(),
        },
      });

      // 5. Record consent (GDPR Art. 7)
      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";

      await tx.userConsent.createMany({
        data: [
          {
            userId: user.id,
            consentType: "terms",
            granted: true,
            version: "2026-02",
            ipAddress,
            userAgent,
          },
          {
            userId: user.id,
            consentType: "privacy",
            granted: true,
            version: "2026-02",
            ipAddress,
            userAgent,
          },
          ...(acceptAnalytics
            ? [
                {
                  userId: user.id,
                  consentType: "analytics",
                  granted: true,
                  version: "2026-02",
                  ipAddress,
                  userAgent,
                },
              ]
            : []),
        ],
      });

      return { user, org };
    });

    // Track signup event
    await trackSignup({
      userId: result.user.id,
      email: result.user.email || "",
      provider: "credentials",
    });

    // Analytics tracking
    serverAnalytics.track(
      "signup",
      {
        provider: "credentials",
        plan: "FREE",
      },
      {
        userId: result.user.id,
        organizationId: result.org.id,
        category: "conversion",
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
