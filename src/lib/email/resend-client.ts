import { Resend } from "resend";

// Singleton Resend client
let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "notifications@caelex.eu";
}

export function getEmailFromName(): string {
  return process.env.EMAIL_FROM_NAME || "Caelex Compliance";
}
