import { prisma } from "@/lib/prisma";
import { trackSignup } from "@/lib/logsnag";
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

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        organization: organization || null,
      },
    });

    // Track signup event
    await trackSignup({
      userId: user.id,
      email: user.email || "",
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
