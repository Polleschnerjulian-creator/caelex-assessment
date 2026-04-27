import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import AtlasShell from "./AtlasShell";
import { AtlasThemeProvider } from "./_components/AtlasThemeProvider";

/**
 * Pre-hydration theme script — runs synchronously before React paints
 * the atlas shell. Reads the user's stored atlas-theme preference from
 * localStorage (falls back to OS preference), then sets a data attribute
 * on <html> that CSS uses to apply the correct token palette BEFORE the
 * atlas-themed div even exists in the DOM. Kills the light-mode flash
 * that happens otherwise while React hydrates.
 *
 * Matches what next-themes does for its own theme switching.
 *
 * MED-2 SAFETY CONTRACT — DO NOT INTERPOLATE VARIABLES INTO THIS STRING.
 *   This script is injected via `dangerouslySetInnerHTML` below, which
 *   bypasses React's auto-escape. The current implementation is a static
 *   literal, so it is XSS-safe. ANY future change that interpolates a
 *   server-side value (user prefs, locale, org slug, …) into this string
 *   would create an XSS vector. If you need dynamic data, render it onto
 *   a `data-*` attribute on <html> server-side and have the script read
 *   from there — never via string concat.
 */
const flashGuardScript = `(function(){try{var t=localStorage.getItem('atlas-theme');var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(t==='dark'||(t!=='light'&&d))?'dark':'light';document.documentElement.setAttribute('data-atlas-preload',r);}catch(e){}})();`;

export const metadata = {
  title: "ATLAS — Space Law Database",
  description:
    "Space law reference covering UN treaties, EU instruments, and national space legislation with deep-links to official sources.",
};

export default async function AtlasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth gate — /atlas is no longer publicly accessible. The invite-
  // redemption path at /accept-invite and /atlas-invite/[token] are
  // outside this (atlas) route group, so invitees can still reach the
  // accept flow without being signed in first.
  const session = await auth();
  if (!session?.user?.id) {
    // ATLAS gets its own dark-stage login — /login is the normal
    // Caelex compliance-platform sign-in and must not be used here,
    // otherwise ATLAS prospects land on a different brand experience.
    redirect("/atlas-login?callbackUrl=%2Fatlas");
  }

  // Super-admin bypass — platform owners reach Atlas regardless of
  // org membership / orgType. Skips the membership query entirely so
  // a super-admin can debug a fresh signup or an empty-DB env without
  // first joining a LAW_FIRM org.
  if (!isSuperAdmin(session.user.email)) {
    // Membership check — a user with an account but no active org
    // membership lands on /atlas-no-access which explains the situation
    // (rather than a generic redirect loop).
    //
    // HIGH-1: must require an Atlas-flavored org (LAW_FIRM or BOTH),
    // otherwise SATELLITE_OPERATOR/SPACE_AGENCY customers of the Caelex
    // compliance platform could see the Atlas shell just because they
    // have any org membership at all. The API layer already scopes via
    // getAtlasAuth(), but the layout shell is the visible-to-user gate
    // and must match that constraint.
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organization: {
          isActive: true,
          orgType: { in: ["LAW_FIRM", "BOTH"] },
        },
      },
      select: { id: true },
    });
    if (!membership) {
      redirect("/atlas-no-access");
    }
  }

  return (
    <LanguageProvider>
      <AtlasThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: flashGuardScript }} />
        <AtlasShell>{children}</AtlasShell>
      </AtlasThemeProvider>
    </LanguageProvider>
  );
}
