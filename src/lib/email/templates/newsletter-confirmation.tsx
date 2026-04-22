import { Text, Button, Section, Hr, Link } from "@react-email/components";
import * as React from "react";
import { render } from "@react-email/render";
import { BaseLayout, styles } from "./base-layout";
import { sendEmail } from "../index";
import type { EmailResult } from "../types";

// ─── Email Component ───

interface NewsletterConfirmationEmailProps {
  confirmationUrl: string;
}

function NewsletterConfirmationEmail({
  confirmationUrl,
}: NewsletterConfirmationEmailProps) {
  return (
    <BaseLayout previewText="Bitte bestätige deine Newsletter-Anmeldung / Please confirm your newsletter subscription">
      {/* German version */}
      <Text style={styles.heading}>Newsletter-Anmeldung bestätigen</Text>

      <Text style={styles.text}>
        Vielen Dank für dein Interesse am Caelex Newsletter. Um deine Anmeldung
        abzuschließen, bestätige bitte deine E-Mail-Adresse mit dem folgenden
        Button:
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={confirmationUrl} style={styles.button}>
          Anmeldung bestätigen
        </Button>
      </Section>

      <Text style={styles.mutedText}>
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen
        Browser:
      </Text>
      <Text
        style={{
          ...styles.mutedText,
          wordBreak: "break-all" as const,
          fontSize: "12px",
        }}
      >
        <Link href={confirmationUrl} style={styles.link}>
          {confirmationUrl}
        </Link>
      </Text>

      <Hr style={styles.hr} />

      {/* English version */}
      <Text style={styles.heading}>Confirm your subscription</Text>

      <Text style={styles.text}>
        Thank you for your interest in the Caelex newsletter. To complete your
        subscription, please confirm your email address by clicking the button
        below:
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={confirmationUrl} style={styles.button}>
          Confirm subscription
        </Button>
      </Section>

      <Text style={styles.mutedText}>
        If the button does not work, copy and paste this link into your browser:
      </Text>
      <Text
        style={{
          ...styles.mutedText,
          wordBreak: "break-all" as const,
          fontSize: "12px",
        }}
      >
        <Link href={confirmationUrl} style={styles.link}>
          {confirmationUrl}
        </Link>
      </Text>

      <Hr style={styles.hr} />

      {/* Legal notice */}
      <Section style={styles.card}>
        <Text style={{ ...styles.mutedText, margin: 0, fontSize: "11px" }}>
          This link expires in 24 hours. If you did not request this
          subscription, you can safely ignore this email — no action is required
          and your address will not be added to our mailing list.
        </Text>
      </Section>
    </BaseLayout>
  );
}

// ─── Render & Send Function ───

export async function sendNewsletterConfirmation(
  to: string,
  token: string,
): Promise<EmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.caelex.eu";
  const confirmationUrl = `${baseUrl}/api/newsletter/confirm?token=${token}`;

  const html = await render(
    <NewsletterConfirmationEmail confirmationUrl={confirmationUrl} />,
  );

  return sendEmail({
    to,
    subject:
      "Bitte bestätige deine Newsletter-Anmeldung / Please confirm your newsletter subscription",
    html,
  });
}
