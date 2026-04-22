// ⚠️  TEMPORARY: /atlas is publicly accessible without login.
// Reason: emailed external reviewer — they won't go through login setup.
// Revert by uncommenting the auth guard below. Do not leave this open.
// Opened: 2026-04-20 — close again within a few days.

// import { redirect } from "next/navigation";
// import { auth } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";
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
  // ⚠️  TEMPORARY — auth guard disabled. Restore this block to re-lock /atlas.
  //
  // const session = await auth();
  //
  // if (!session?.user) {
  //   redirect("/login");
  // }
  //
  // // Check organization membership
  // const membership = await prisma.organizationMember.findFirst({
  //   where: { userId: session.user.id },
  //   include: {
  //     organization: {
  //       select: { isActive: true },
  //     },
  //   },
  // });
  //
  // if (!membership || !membership.organization.isActive) {
  //   redirect("/atlas-no-access");
  // }

  return (
    <LanguageProvider>
      <AtlasThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: flashGuardScript }} />
        <AtlasShell>{children}</AtlasShell>
      </AtlasThemeProvider>
    </LanguageProvider>
  );
}
