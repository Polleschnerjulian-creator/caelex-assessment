import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const position = formData.get("position") as string;
    const positionId = formData.get("positionId") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const linkedin = formData.get("linkedin") as string;
    const location = formData.get("location") as string;
    const experience = formData.get("experience") as string;
    const motivation = formData.get("motivation") as string;
    const availability = formData.get("availability") as string;
    const salary = formData.get("salary") as string;
    const referral = formData.get("referral") as string;
    const resumeFile = formData.get("resume") as File | null;

    // Prepare attachments (with file validation)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_MIME_TYPES = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

    const attachments: { filename: string; content: Buffer }[] = [];
    if (resumeFile) {
      // Validate file size
      if (resumeFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Resume file exceeds maximum size of 10 MB" },
          { status: 400 },
        );
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(resumeFile.type)) {
        return NextResponse.json(
          {
            error: "Resume must be a PDF or Word document (.pdf, .doc, .docx)",
          },
          { status: 400 },
        );
      }

      // Validate file extension
      const ext = resumeFile.name.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          {
            error: "Resume must be a PDF or Word document (.pdf, .doc, .docx)",
          },
          { status: 400 },
        );
      }

      // Sanitize filename (strip path components and special characters)
      const safeName = resumeFile.name.replace(/[^\w.\-]/g, "_");

      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      attachments.push({
        filename: safeName,
        content: buffer,
      });
    }

    // Send email
    const resend = getResend();
    await resend.emails.send({
      from: "Caelex Careers <careers@caelex.eu>",
      to: ["careers@caelex.eu"],
      replyTo: email,
      subject: `New Application: ${escapeHtml(position)} - ${escapeHtml(firstName)} ${escapeHtml(lastName)}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="font-size: 24px; font-weight: 500; color: #111; margin-bottom: 24px;">
            New Co-Founder Application
          </h1>

          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0;">
              Position
            </h2>
            <p style="font-size: 18px; color: #111; margin: 0;">
              ${escapeHtml(position)}
            </p>
          </div>

          <div style="margin-bottom: 32px;">
            <h2 style="font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0;">
              Personal Information
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 140px;">Name</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Email</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">
                  <a href="mailto:${escapeHtml(email)}" style="color: #111;">${escapeHtml(email)}</a>
                </td>
              </tr>
              ${
                phone
                  ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Phone</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${escapeHtml(phone)}</td>
              </tr>
              `
                  : ""
              }
              ${
                linkedin
                  ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">LinkedIn</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">
                  <a href="${escapeHtml(linkedin)}" style="color: #111;">${escapeHtml(linkedin)}</a>
                </td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Location</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${escapeHtml(location)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Experience</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${escapeHtml(experience)} years</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 32px;">
            <h2 style="font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0;">
              Motivation
            </h2>
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; color: #333; line-height: 1.6; white-space: pre-wrap;">
${escapeHtml(motivation)}
            </div>
          </div>

          <div style="margin-bottom: 32px;">
            <h2 style="font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0;">
              Availability & Expectations
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 140px;">Start Date</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${escapeHtml(availability)}</td>
              </tr>
              ${
                salary
                  ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Salary</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${escapeHtml(salary)}</td>
              </tr>
              `
                  : ""
              }
              ${
                referral
                  ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Referral Source</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #111;">${escapeHtml(referral)}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>

          ${
            resumeFile
              ? `
          <div style="margin-bottom: 32px;">
            <h2 style="font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0;">
              Attachment
            </h2>
            <p style="color: #666;">Resume attached: ${escapeHtml(resumeFile.name)}</p>
          </div>
          `
              : ""
          }

          <div style="border-top: 1px solid #eee; padding-top: 24px; margin-top: 32px;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              This application was submitted via the Caelex careers page.
              <br />
              Position: ${escapeHtml(position)} (${escapeHtml(positionId)})
            </p>
          </div>
        </div>
      `,
      attachments,
    });

    // Send confirmation email to applicant
    await resend.emails.send({
      from: "Caelex Careers <careers@caelex.eu>",
      to: [email],
      subject: `Application Received - ${escapeHtml(position)}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="font-size: 24px; font-weight: 500; color: #111; margin-bottom: 24px;">
            Thank you for your application
          </h1>

          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
            Dear ${escapeHtml(firstName)},
          </p>

          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
            Thank you for your interest in joining Caelex as <strong>${escapeHtml(position)}</strong>.
            We have received your application and will review it carefully.
          </p>

          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
            You can expect to hear from us within 5 business days regarding next steps.
          </p>

          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
            Best regards,<br />
            The Caelex Team
          </p>

          <div style="border-top: 1px solid #eee; padding-top: 24px; margin-top: 32px;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              Caelex – Space Compliance Platform
              <br />
              <a href="https://caelex.eu" style="color: #666;">www.caelex.eu</a>
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Application submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 },
    );
  }
}
