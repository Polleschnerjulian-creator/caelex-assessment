import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_OPERATOR_TYPES = [
  "SCO",
  "LO",
  "LSO",
  "ISOS",
  "CAP",
  "PDP",
  "TCO",
] as const;

// Sprint UF8 — accept null/empty operatorType so non-operator personas
// (consultants, auditors, investors) don't have to lie about their org
// being a satellite operator. The User.operatorType column is already
// nullable in the Prisma schema.
const schema = z.object({
  organizationName: z.string().min(1).max(200),
  country: z.string().min(2).max(10),
  operatorType: z.enum(VALID_OPERATOR_TYPES).nullable().optional(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { organizationName, country, operatorType } = parsed.data;

  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  if (!member) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 404 },
    );
  }

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: member.organizationId },
      data: { name: organizationName },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        // Sprint UF8 — explicitly set null when caller sends null /
        // omits the field, so the column stays in sync with the
        // wizard's "Not applicable" choice (vs leaving stale data).
        operatorType: operatorType ?? null,
        establishmentCountry: country,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
