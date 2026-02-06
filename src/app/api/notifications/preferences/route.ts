import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for notification preferences
const NotificationPreferencesSchema = z.object({
  enableAutoReminders: z.boolean().optional(),
  notificationMethod: z.enum(["email", "portal", "both"]).optional(),
  reminderDaysAdvance: z.number().int().min(1).max(90).optional(),
  designatedContactEmail: z.string().email().optional().nullable(),
  communicationLanguage: z.enum(["en", "de", "fr", "es", "it"]).optional(),
});

export type NotificationPreferencesInput = z.infer<
  typeof NotificationPreferencesSchema
>;

/**
 * GET /api/notifications/preferences
 * Fetch user's notification preferences from SupervisionConfig
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get or create SupervisionConfig
    let config = await prisma.supervisionConfig.findUnique({
      where: { userId },
      select: {
        enableAutoReminders: true,
        notificationMethod: true,
        reminderDaysAdvance: true,
        designatedContactEmail: true,
        communicationLanguage: true,
        primaryCountry: true,
      },
    });

    // If no config exists, return defaults
    if (!config) {
      config = {
        enableAutoReminders: true,
        notificationMethod: "email",
        reminderDaysAdvance: 14,
        designatedContactEmail: null,
        communicationLanguage: "en",
        primaryCountry: "",
      };
    }

    // Get user email as fallback
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    return NextResponse.json({
      preferences: {
        enableAutoReminders: config.enableAutoReminders,
        notificationMethod: config.notificationMethod,
        reminderDaysAdvance: config.reminderDaysAdvance,
        designatedContactEmail: config.designatedContactEmail,
        communicationLanguage: config.communicationLanguage,
      },
      user: {
        email: user?.email,
        name: user?.name,
      },
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update user's notification preferences
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();

    // Validate input
    const validationResult = NotificationPreferencesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    // Build update data (only include fields that were provided)
    const updateData: Record<string, unknown> = {};
    if (data.enableAutoReminders !== undefined) {
      updateData.enableAutoReminders = data.enableAutoReminders;
    }
    if (data.notificationMethod !== undefined) {
      updateData.notificationMethod = data.notificationMethod;
    }
    if (data.reminderDaysAdvance !== undefined) {
      updateData.reminderDaysAdvance = data.reminderDaysAdvance;
    }
    if (data.designatedContactEmail !== undefined) {
      updateData.designatedContactEmail = data.designatedContactEmail;
    }
    if (data.communicationLanguage !== undefined) {
      updateData.communicationLanguage = data.communicationLanguage;
    }

    // Upsert SupervisionConfig
    const config = await prisma.supervisionConfig.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        primaryCountry: "", // Required field, can be updated later
        ...updateData,
      },
      select: {
        enableAutoReminders: true,
        notificationMethod: true,
        reminderDaysAdvance: true,
        designatedContactEmail: true,
        communicationLanguage: true,
      },
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        userId,
        action: "notification_preferences_updated",
        entityType: "supervision_config",
        entityId: userId,
        newValue: JSON.stringify(updateData),
        description: `User updated notification preferences`,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: config,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Full replacement of notification preferences
 */
export async function PUT(req: Request) {
  // Same as PATCH for now
  return PATCH(req);
}
