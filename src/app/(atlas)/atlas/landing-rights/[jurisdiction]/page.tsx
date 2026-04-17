import { notFound } from "next/navigation";
import {
  ALL_LANDING_RIGHTS_PROFILES,
  getProfile,
  type JurisdictionCode,
} from "@/data/landing-rights";
import { JurisdictionProfileView } from "@/components/atlas/landing-rights/JurisdictionProfileView";

export function generateStaticParams() {
  return ALL_LANDING_RIGHTS_PROFILES.map((p) => ({
    jurisdiction: p.jurisdiction.toLowerCase(),
  }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ jurisdiction: string }>;
}) {
  const { jurisdiction } = await params;
  const code = jurisdiction.toUpperCase() as JurisdictionCode;
  const profile = getProfile(code);
  if (!profile) return notFound();
  return <JurisdictionProfileView profile={profile} />;
}
