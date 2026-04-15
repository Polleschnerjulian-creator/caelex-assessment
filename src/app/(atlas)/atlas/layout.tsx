import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

  return (
    <LanguageProvider>
      <AtlasShell>{children}</AtlasShell>
    </LanguageProvider>
  );
}
