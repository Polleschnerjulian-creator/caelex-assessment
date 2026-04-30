// Global kill-switch for ALL outbound email (Resend + SMTP).
//
// Fail-safe default: dispatch is HALTED unless EMAIL_DISPATCH_HALTED is
// explicitly set to "false" in the environment. This ensures that an
// unset env var blocks email — never the other way around.
//
// Reactivate (per environment) by setting:
//   EMAIL_DISPATCH_HALTED=false
//
// Touched call-sites: src/lib/email/index.ts (central sendEmail),
// src/lib/email/resend-client.ts (singleton), and every direct
// `new Resend(...)` site under src/app/api/**.

export function isEmailDispatchHalted(): boolean {
  const flag = process.env.EMAIL_DISPATCH_HALTED;
  if (flag === undefined) return true;
  const normalized = flag.trim().toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "no";
}

export function logHaltedEmail(context: {
  to: string | string[] | null | undefined;
  subject?: string;
  from?: string;
  origin?: string;
}): void {
  const recipients = Array.isArray(context.to)
    ? context.to.join(",")
    : (context.to ?? "(unknown)");
  console.warn(
    `[email-halt] suppressed outbound email origin=${context.origin ?? "(unknown)"} to=${recipients} subject=${JSON.stringify(context.subject ?? "")}`,
  );
}
