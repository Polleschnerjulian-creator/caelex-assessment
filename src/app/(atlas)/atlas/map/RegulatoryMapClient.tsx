"use client";

import { useRouter } from "next/navigation";
import RegulatoryMap from "@/components/atlas/RegulatoryMap";

export default function RegulatoryMapClient() {
  const router = useRouter();

  function handleCountryClick(countryCode: string) {
    router.push(`/atlas/jurisdictions/${countryCode.toLowerCase()}`);
  }

  return (
    <div className="w-full aspect-[8/7]">
      <RegulatoryMap onCountryClick={handleCountryClick} />
    </div>
  );
}
