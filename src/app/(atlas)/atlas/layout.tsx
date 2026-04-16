import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import AtlasShell from "./AtlasShell";

export const metadata = {
  title: "ATLAS — Space Law Database",
  description:
    "Comprehensive space law database covering 17 jurisdictions, 315 legal sources, and 202 regulatory authorities across Europe.",
};

export default async function AtlasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check organization membership
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
      <AtlasShell>{children}</AtlasShell>
    </LanguageProvider>
  );
}
