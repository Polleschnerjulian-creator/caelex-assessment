import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NCAPortalClient from "./client";

export const metadata = {
  title: "NCA Portal — Caelex",
  description:
    "Manage regulatory submissions to National Competent Authorities",
};

export default async function NCAPortalPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  return <NCAPortalClient />;
}
