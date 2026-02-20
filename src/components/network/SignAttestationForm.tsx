"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { type StakeholderEngagement } from "./StakeholderCard";

interface SignAttestationFormProps {
  onSubmit: (data: AttestationFormData) => void;
  engagement: StakeholderEngagement;
  attestationTypes: { value: string; label: string }[];
}

export interface AttestationFormData {
  type: string;
  title: string;
  statement: string;
  scope: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  signerOrganization: string;
  confirmed: boolean;
}

export default function SignAttestationForm({
  onSubmit,
  engagement,
  attestationTypes,
}: SignAttestationFormProps) {
  const [formData, setFormData] = useState<AttestationFormData>({
    type: attestationTypes[0]?.value || "",
    title: "",
    statement: "",
    scope: "{}",
    signerName: engagement.contactName,
    signerTitle: "",
    signerEmail: engagement.contactEmail,
    signerOrganization: engagement.companyName,
    confirmed: false,
  });

  const updateField = <K extends keyof AttestationFormData>(
    key: K,
    value: AttestationFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.confirmed) return;
    onSubmit(formData);
  };

  const isValid =
    formData.type &&
    formData.title &&
    formData.statement &&
    formData.signerName &&
    formData.signerEmail &&
    formData.signerOrganization &&
    formData.confirmed;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-white/10">
        <ShieldCheck size={20} className="text-emerald-500" />
        <h2 className="text-heading font-semibold text-slate-900 dark:text-white">
          Sign Attestation
        </h2>
      </div>

      {/* Type select */}
      <div>
        <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
          Attestation Type *
        </label>
        <select
          value={formData.type}
          onChange={(e) => updateField("type", e.target.value)}
          className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        >
          {attestationTypes.map((at) => (
            <option key={at.value} value={at.value}>
              {at.label}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="e.g. Q1 2026 Compliance Declaration"
          className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        />
      </div>

      {/* Statement */}
      <div>
        <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
          Formal Statement *
        </label>
        <textarea
          value={formData.statement}
          onChange={(e) => updateField("statement", e.target.value)}
          placeholder="Enter the formal attestation statement..."
          rows={5}
          className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
        />
      </div>

      {/* Scope */}
      <div>
        <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
          Scope (JSON)
        </label>
        <textarea
          value={formData.scope}
          onChange={(e) => updateField("scope", e.target.value)}
          placeholder='{"modules": ["authorization", "insurance"], "period": "Q1 2026"}'
          rows={3}
          className="w-full px-3 py-2 text-small bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none font-mono"
        />
        <p className="text-micro text-slate-400 dark:text-white/30 mt-1">
          Optional JSON object defining the scope of this attestation.
        </p>
      </div>

      {/* Signer info */}
      <div className="space-y-4 p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]">
        <h3 className="text-body font-medium text-slate-900 dark:text-white">
          Signer Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.signerName}
              onChange={(e) => updateField("signerName", e.target.value)}
              className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.signerTitle}
              onChange={(e) => updateField("signerTitle", e.target.value)}
              placeholder="e.g. Chief Compliance Officer"
              className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.signerEmail}
              onChange={(e) => updateField("signerEmail", e.target.value)}
              className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
              Organization *
            </label>
            <input
              type="text"
              value={formData.signerOrganization}
              onChange={(e) =>
                updateField("signerOrganization", e.target.value)
              }
              className="w-full px-3 py-2 text-body bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-amber-50 dark:bg-amber-500/5">
        <input
          type="checkbox"
          id="attestation-confirm"
          checked={formData.confirmed}
          onChange={(e) => updateField("confirmed", e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-white/20 text-emerald-500 focus:ring-emerald-500/30"
        />
        <label
          htmlFor="attestation-confirm"
          className="text-small text-slate-700 dark:text-white/70 leading-relaxed"
        >
          I hereby confirm that this attestation is accurate and complete to the
          best of my knowledge. I understand that this creates a legally binding
          cryptographic record that may be used for compliance verification
          purposes.
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 text-subtitle font-medium bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
      >
        <ShieldCheck size={16} />
        Sign Attestation
      </button>
    </form>
  );
}
