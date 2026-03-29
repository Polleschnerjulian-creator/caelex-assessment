import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation — Caelex",
  description:
    "Caelex API v1 documentation. Available to authenticated users only.",
  robots: { index: false, follow: false },
};

export default async function DocsApiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/docs/api");
  }

  return children;
}
