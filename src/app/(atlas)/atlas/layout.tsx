import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    redirect("/login?callbackUrl=%2Fatlas");
  }

  // Membership check — a user with an account but no active org
  // membership lands on /atlas-no-access which explains the situation
  // (rather than a generic redirect loop). Uses findFirst because a
  // user can belong to multiple orgs; we only need to know one is
  // active.
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: { isActive: true },
      },
    },
  });
  if (!membership || !membership.organization.isActive) {
    redirect("/atlas-no-access");
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
