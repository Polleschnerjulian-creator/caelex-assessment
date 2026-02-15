"use client";

import { useState } from "react";
import { Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import LCADataFields from "./LCADataFields";
import ComponentDataFields from "./ComponentDataFields";

interface SupplierDataFormProps {
  componentType: string;
  dataRequired: string[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export interface LCAFormData {
  // Manufacturing
  manufacturingCountry: string;
  manufacturingEnergyKwh: number | null;
  manufacturingEnergySource: string;
  rawMaterialsMassKg: number | null;

  // Materials
  primaryMaterial: string;
  primaryMaterialMassKg: number | null;
  secondaryMaterials: string[];
  hazardousMaterials: boolean;
  hazardousMaterialTypes: string[];

  // Transport
  transportDistanceKm: number | null;
  transportMode: string;

  // Component Specifics
  componentMassKg: number | null;
  componentLifespanYears: number | null;
  testedComponents: number | null;
  defectRate: number | null;

  // Certifications
  hasCertifications: boolean;
  certifications: string[];

  // Additional
  supplierNotes: string;
  confidentialData: boolean;
}

const defaultFormData: LCAFormData = {
  manufacturingCountry: "",
  manufacturingEnergyKwh: null,
  manufacturingEnergySource: "",
  rawMaterialsMassKg: null,
  primaryMaterial: "",
  primaryMaterialMassKg: null,
  secondaryMaterials: [],
  hazardousMaterials: false,
  hazardousMaterialTypes: [],
  transportDistanceKm: null,
  transportMode: "",
  componentMassKg: null,
  componentLifespanYears: null,
  testedComponents: null,
  defectRate: null,
  hasCertifications: false,
  certifications: [],
  supplierNotes: "",
  confidentialData: false,
};

export default function SupplierDataForm({
  componentType,
  dataRequired,
  onSubmit,
}: SupplierDataFormProps) {
  const [formData, setFormData] = useState<LCAFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    manufacturing: true,
    materials: true,
    transport: false,
    component: true,
    certifications: false,
    additional: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateField = <K extends keyof LCAFormData>(
    field: K,
    value: LCAFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.manufacturingCountry) {
      setError("Please select a manufacturing country.");
      return;
    }
    if (!formData.componentMassKg || formData.componentMassKg <= 0) {
      setError("Please enter a valid component mass.");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        componentType,
        lcaData: formData,
        submittedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const SectionHeader = ({
    title,
    section,
    required = false,
  }: {
    title: string;
    section: string;
    required?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      aria-expanded={expandedSections[section]}
      aria-controls={`section-${section}`}
      className="w-full flex items-center justify-between py-3 text-left"
    >
      <span className="text-white font-medium">
        {title}
        {required && <span className="text-red-400 ml-1">*</span>}
      </span>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-white/40" aria-hidden="true" />
      ) : (
        <ChevronDown className="w-5 h-5 text-white/40" aria-hidden="true" />
      )}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Manufacturing Section */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 border-b border-white/10">
          <SectionHeader
            title="Manufacturing Information"
            section="manufacturing"
            required
          />
        </div>
        {expandedSections.manufacturing && (
          <div className="p-6" id="section-manufacturing">
            <LCADataFields
              formData={formData}
              updateField={updateField}
              section="manufacturing"
            />
          </div>
        )}
      </div>

      {/* Materials Section */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 border-b border-white/10">
          <SectionHeader
            title="Materials & Composition"
            section="materials"
            required
          />
        </div>
        {expandedSections.materials && (
          <div className="p-6" id="section-materials">
            <LCADataFields
              formData={formData}
              updateField={updateField}
              section="materials"
            />
          </div>
        )}
      </div>

      {/* Transport Section */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 border-b border-white/10">
          <SectionHeader title="Transport & Logistics" section="transport" />
        </div>
        {expandedSections.transport && (
          <div className="p-6" id="section-transport">
            <LCADataFields
              formData={formData}
              updateField={updateField}
              section="transport"
            />
          </div>
        )}
      </div>

      {/* Component Specifics Section */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 border-b border-white/10">
          <SectionHeader
            title="Component Specifications"
            section="component"
            required
          />
        </div>
        {expandedSections.component && (
          <div className="p-6" id="section-component">
            <ComponentDataFields
              componentType={componentType}
              formData={formData}
              updateField={updateField}
            />
          </div>
        )}
      </div>

      {/* Certifications Section */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 border-b border-white/10">
          <SectionHeader
            title="Certifications & Standards"
            section="certifications"
          />
        </div>
        {expandedSections.certifications && (
          <div className="p-6" id="section-certifications">
            <LCADataFields
              formData={formData}
              updateField={updateField}
              section="certifications"
            />
          </div>
        )}
      </div>

      {/* Additional Notes Section */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 border-b border-white/10">
          <SectionHeader title="Additional Information" section="additional" />
        </div>
        {expandedSections.additional && (
          <div className="p-6 space-y-4" id="section-additional">
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Additional Notes or Comments
              </label>
              <textarea
                value={formData.supplierNotes}
                onChange={(e) => updateField("supplierNotes", e.target.value)}
                rows={4}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
                placeholder="Any additional information about your component or manufacturing process..."
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.confidentialData}
                onChange={(e) =>
                  updateField("confidentialData", e.target.checked)
                }
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/[0.04] text-blue-500 focus:ring-blue-500/50"
              />
              <span className="text-sm text-white/60">
                This data contains confidential or proprietary information that
                should be handled with additional care.
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3"
          role="alert"
        >
          <AlertCircle
            className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="text-red-400 font-medium">Submission Error</p>
            <p className="text-red-400/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-6 py-3 transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            Submitting Data...
          </>
        ) : (
          "Submit Environmental Data"
        )}
      </button>
    </form>
  );
}
