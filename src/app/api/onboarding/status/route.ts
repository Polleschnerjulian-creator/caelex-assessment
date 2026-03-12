import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingCompleted: true,
      organizationMemberships: { select: { id: true }, take: 1 },
    },
  });

  // Auto-complete onboarding for existing users who already have an org
  if (
    user &&
    !user.onboardingCompleted &&
    user.organizationMemberships.length > 0
  ) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true },
    });
    return NextResponse.json({ onboardingCompleted: true });
  }

  return NextResponse.json({
    onboardingCompleted: user?.onboardingCompleted ?? false,
  });
}
