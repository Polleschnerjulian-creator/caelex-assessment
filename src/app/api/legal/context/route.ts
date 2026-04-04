import { getLegalContext } from "@/lib/legal-auth";
import { prisma } from "@/lib/prisma";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/lib/api-response";

export async function GET() {
  try {
    const ctx = await getLegalContext();
    if (!ctx) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    // Fetch attorney's user name
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true },
    });

    return createSuccessResponse({
      attorneyId: ctx.attorneyId,
      firmId: ctx.firmId,
      firmName: ctx.firmName,
      name: user?.name ?? user?.email ?? "Attorney",
      isAdmin: ctx.isAdmin,
    });
  } catch (error) {
    console.error("Failed to fetch legal context:", error);
    return createErrorResponse(
      "Failed to fetch context",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
