"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";

export default function NoAccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F7F8FA]">
      <div className="max-w-md text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <Building2 size={28} className="text-gray-400" />
        </div>
        <h1 className="text-[20px] font-semibold text-gray-900 mb-2">
          ATLAS Zugang erforderlich
        </h1>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
          Um ATLAS zu nutzen, benötigen Sie eine Kanzlei-Lizenz. Kontaktieren
          Sie uns oder bitten Sie den Kanzlei-Inhaber, Sie einzuladen.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex px-6 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-black transition-colors"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
