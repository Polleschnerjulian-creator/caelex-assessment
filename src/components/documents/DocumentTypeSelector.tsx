"use client";

import {
  Trash2,
  Shield,
  Leaf,
  Scale,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";

const DOCUMENT_TYPES: Array<{
  type: DocumentGenerationType;
  title: string;
  description: string;
  icon: React.ReactNode;
  regulation: string;
}> = [
  {
    type: "DEBRIS_MITIGATION_PLAN",
    title: "Debris Mitigation Plan",
    description:
      "Comprehensive plan compliant with EU Space Act Art. 31-37 and IADC guidelines",
    icon: <Trash2 size={20} />,
    regulation: "EU Space Act Art. 31-37",
  },
  {
    type: "CYBERSECURITY_FRAMEWORK",
    title: "Cybersecurity Framework",
    description:
      "Security architecture and implementation plan per EU Space Act Art. 27-30",
    icon: <Shield size={20} />,
    regulation: "EU Space Act Art. 27-30",
  },
  {
    type: "ENVIRONMENTAL_FOOTPRINT",
    title: "Environmental Footprint Declaration",
    description:
      "Lifecycle environmental assessment per EU Space Act Art. 44-46",
    icon: <Leaf size={20} />,
    regulation: "EU Space Act Art. 44-46",
  },
  {
    type: "INSURANCE_COMPLIANCE",
    title: "Insurance Compliance Report",
    description:
      "TPL analysis and coverage assessment per EU Space Act Art. 47-50",
    icon: <Scale size={20} />,
    regulation: "EU Space Act Art. 47-50",
  },
  {
    type: "NIS2_ASSESSMENT",
    title: "NIS2 Compliance Assessment",
    description:
      "Entity classification and requirement status per NIS2 Directive",
    icon: <ShieldCheck size={20} />,
    regulation: "NIS2 Directive (EU 2022/2555)",
  },
  {
    type: "AUTHORIZATION_APPLICATION",
    title: "Authorization Application Package",
    description:
      "Complete NCA submission package with all supporting documentation",
    icon: <FileCheck size={20} />,
    regulation: "EU Space Act Art. 4-12",
  },
];

interface DocumentTypeSelectorProps {
  onSelect: (type: DocumentGenerationType) => void;
}

export function DocumentTypeSelector({ onSelect }: DocumentTypeSelectorProps) {
  return (
    <div>
      <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
        Select Document Type
      </h2>
      <p className="text-sm text-slate-500 dark:text-white/50 mb-6">
        Choose the type of compliance document to generate
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCUMENT_TYPES.map((doc) => (
          <button
            key={doc.type}
            onClick={() => onSelect(doc.type)}
            className="group text-left p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/[0.04] transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
                {doc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-1 line-clamp-2">
                  {doc.description}
                </p>
                <span className="inline-block text-[10px] text-slate-400 dark:text-white/30 mt-2 font-mono">
                  {doc.regulation}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
