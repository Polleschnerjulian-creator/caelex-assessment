import { prisma } from "@/lib/prisma";
import { trackSignup } from "@/lib/logsnag";
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

    const { name, email, password, organization } = validation.data;

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

      return { user, org };
    });

    // Track signup event
    await trackSignup({
      userId: result.user.id,
      email: result.user.email || "",
      provider: "credentials",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
