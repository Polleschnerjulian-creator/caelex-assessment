import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Caelex Contact <noreply@caelex.eu>",
      to: "cs@caelex.eu",
      replyTo: email,
      subject: `New Contact Form: ${escapeHtml(name)}${company ? ` (${escapeHtml(company)})` : ""}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111; margin-bottom: 24px;">New Contact Form Submission</h2>

          <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p style="margin: 0 0 12px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            ${company ? `<p style="margin: 0 0 12px 0;"><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
          </div>

          <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #666;">Message:</p>
            <p style="margin: 0; white-space: pre-wrap; color: #333;">${escapeHtml(message)}</p>
          </div>

          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            This message was sent via the Caelex contact form.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
