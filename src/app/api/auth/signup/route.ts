import { prisma } from "@/lib/prisma";
import { trackSignup } from "@/lib/logsnag";
import { serverAnalytics } from "@/lib/analytics";
import {
  generateUniqueSlug,
  getDefaultPermissionsForRole,
} from "@/lib/services/organization-service";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { RegisterSchema, formatZodErrors } from "@/lib/validations";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    // Rate limit signup to prevent mass account creation
    const identifier = getIdentifier(request);
    const rateLimit = await checkRateLimit("auth", identifier);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 },
      );
    }

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

    const {
      name,
      email,
      password,
      organization,
      acceptAnalytics,
      inviteToken,
      intent,
    } = validation.data;

    // Atlas-funnel signups create a LAW_FIRM org so `(atlas)/atlas/layout`
    // (which requires orgType IN ("LAW_FIRM","BOTH")) lets the user in.
    // Caelex-funnel signups stay OPERATOR — the dashboard expects that.
    // Ignored on the invite path because the org already exists.
    const orgTypeForNewOrg: "OPERATOR" | "LAW_FIRM" =
      intent === "atlas" ? "LAW_FIRM" : "OPERATOR";

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      // H5: Generic error to prevent account enumeration
      return NextResponse.json(
        {
          error: "Validation failed",
          details: { email: ["This email cannot be used"] },
        },
        { status: 400 },
      );
    }

    // If signup was launched from an invitation link, validate the token
    // BEFORE hashing the password / starting the transaction. Reject any
    // mismatch early so we don't create a stranded user without org.
    let invitation: Awaited<
      ReturnType<typeof prisma.organizationInvitation.findUnique>
    > = null;
    if (inviteToken) {
      invitation = await prisma.organizationInvitation.findUnique({
        where: { token: inviteToken },
      });
      if (!invitation) {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 400 },
        );
      }
      if (invitation.acceptedAt) {
        return NextResponse.json(
          { error: "Invitation has already been accepted" },
          { status: 400 },
        );
      }
      if (invitation.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Invitation has expired" },
          { status: 400 },
        );
      }
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          {
            error: `This invitation is addressed to ${invitation.email}. Use that email address to accept it.`,
          },
          { status: 400 },
        );
      }
    }

    const hashed = await bcrypt.hash(password, 12);

    // Create User + Organization + Membership + Subscription in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user (select only needed fields — avoid password hash in memory)
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashed,
          organization: invitation
            ? undefined
            : organization || `${name}'s Organization`,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      let orgId: string;
      if (invitation) {
        // Invitation flow — don't create a new org. Join the inviter's
        // org as the role the invitation specifies, and mark the
        // invitation itself accepted in the same transaction.
        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });
        await tx.organizationMember.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
            invitedBy: invitation.invitedBy,
            permissions: getDefaultPermissionsForRole(invitation.role),
          },
        });
        orgId = invitation.organizationId;
      } else {
        // Regular new-org signup path.
        const orgName = organization || `${name}'s Organization`;
        const orgSlug = await generateUniqueSlug(orgName);

        // 2. Create organization with FREE plan defaults
        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
            plan: "FREE",
            maxUsers: 1,
            maxSpacecraft: 1,
            orgType: orgTypeForNewOrg,
          },
        });
        orgId = org.id;

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
      }

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

      return { user, orgId };
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
        invitation: invitation ? true : false,
      },
      {
        userId: result.user.id,
        organizationId: result.orgId,
        category: "conversion",
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Signup error", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
