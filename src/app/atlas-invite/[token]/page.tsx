import { redirect } from "next/navigation";

/**
 * Legacy invitation path — kept only so invite emails sent before the
 * /accept-invite rename don't 404. The canonical page lives at
 * /accept-invite?token=... and owns all the flow logic. This file is a
 * 308 redirect and nothing more.
 *
 * Once older-than-14-days invitations have all either been accepted or
 * expired, this file can be deleted safely.
 */

interface LegacyInvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function LegacyAtlasInvitePage({
  params,
}: LegacyInvitePageProps) {
  const { token } = await params;
  redirect(`/accept-invite?token=${encodeURIComponent(token)}`);
}
