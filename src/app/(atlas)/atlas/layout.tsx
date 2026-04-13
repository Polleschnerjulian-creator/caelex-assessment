import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import AtlasShell from "./AtlasShell";

export const metadata = {
  title: "ATLAS — Space Law Intelligence",
  description:
    "Bloomberg Terminal for Space Law. Real-time regulatory intelligence across jurisdictions, frameworks, and compliance standards.",
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

  return (
    <LanguageProvider>
      <AtlasShell>{children}</AtlasShell>
    </LanguageProvider>
  );
}
