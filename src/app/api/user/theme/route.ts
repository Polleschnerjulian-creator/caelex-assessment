import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Force Node.js runtime (Prisma doesn't support Edge)
export const runtime = "nodejs";

const themeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { theme } = themeSchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { theme },
    });

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid theme value. Must be 'light', 'dark', or 'system'." },
        { status: 400 },
      );
    }
    console.error("Failed to update theme:", error);
    return NextResponse.json(
      { error: "Failed to update theme" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { theme: true },
    });

    return NextResponse.json({ theme: user?.theme || "system" });
  } catch (error) {
    console.error("Failed to get theme:", error);
    return NextResponse.json({ error: "Failed to get theme" }, { status: 500 });
  }
}
