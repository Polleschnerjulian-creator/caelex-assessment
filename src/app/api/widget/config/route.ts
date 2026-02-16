/**
 * GET/POST/PATCH /api/widget/config
 *
 * Widget configuration management.
 * Requires authenticated session with organization membership.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateWidgetSchema = z.object({
  widgetType: z
    .enum(["quick_check", "compliance_badge", "nis2_classifier"])
    .default("quick_check"),
  theme: z.enum(["dark", "light"]).default("dark"),
  allowedDomains: z.array(z.string().url()).default([]),
  customCta: z.string().max(100).nullable().optional(),
  ctaUrl: z.string().url().nullable().optional(),
});

const UpdateWidgetSchema = CreateWidgetSchema.partial();

async function getOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const config = await prisma.widgetConfig.findFirst({
    where: { organizationId: orgId },
    include: { apiKey: { select: { keyPrefix: true, isActive: true } } },
  });

  return NextResponse.json({ data: config });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  // Check if config already exists
  const existing = await prisma.widgetConfig.findFirst({
    where: { organizationId: orgId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Widget config already exists. Use PATCH to update." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateWidgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Generate a widget API key
  const crypto = await import("crypto");
  const rawKey = `caelex_wgt_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);

  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId: orgId,
      name: "Widget API Key",
      keyHash,
      keyPrefix,
      scopes: ["read:compliance"],
      rateLimit: 100,
      keyType: "widget",
      createdById: session.user.id,
    },
  });

  const config = await prisma.widgetConfig.create({
    data: {
      organizationId: orgId,
      apiKeyId: apiKey.id,
      widgetType: parsed.data.widgetType,
      theme: parsed.data.theme,
      allowedDomains: parsed.data.allowedDomains,
      customCta: parsed.data.customCta ?? null,
      ctaUrl: parsed.data.ctaUrl ?? null,
    },
  });

  return NextResponse.json(
    {
      data: {
        ...config,
        apiKeyPrefix: keyPrefix,
        // Only show the full key once
        apiKey: rawKey,
      },
    },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const existing = await prisma.widgetConfig.findFirst({
    where: { organizationId: orgId },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "No widget config found. Use POST to create." },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateWidgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updated = await prisma.widgetConfig.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.widgetType && { widgetType: parsed.data.widgetType }),
      ...(parsed.data.theme && { theme: parsed.data.theme }),
      ...(parsed.data.allowedDomains && {
        allowedDomains: parsed.data.allowedDomains,
      }),
      ...(parsed.data.customCta !== undefined && {
        customCta: parsed.data.customCta,
      }),
      ...(parsed.data.ctaUrl !== undefined && { ctaUrl: parsed.data.ctaUrl }),
    },
  });

  return NextResponse.json({ data: updated });
}
