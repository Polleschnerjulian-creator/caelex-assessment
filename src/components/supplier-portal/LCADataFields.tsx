"use client";

import type { LCAFormData } from "./SupplierDataForm";

interface LCADataFieldsProps {
  formData: LCAFormData;
  updateField: <K extends keyof LCAFormData>(
    field: K,
    value: LCAFormData[K],
  ) => void;
  section: "manufacturing" | "materials" | "transport" | "certifications";
}

const COUNTRIES = [
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "GB", name: "United Kingdom" },
  { code: "CH", name: "Switzerland" },
  { code: "US", name: "United States" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "KR", name: "South Korea" },
  { code: "TW", name: "Taiwan" },
  { code: "OTHER", name: "Other" },
];

const ENERGY_SOURCES = [
  { value: "grid_avg", label: "Grid Average" },
  { value: "renewable", label: "100% Renewable" },
  { value: "renewable_partial", label: "Partially Renewable (specify %)" },
  { value: "solar", label: "On-site Solar" },
  { value: "wind", label: "On-site Wind" },
  { value: "gas", label: "Natural Gas" },
  { value: "coal", label: "Coal" },
  { value: "nuclear", label: "Nuclear" },
  { value: "unknown", label: "Unknown" },
];

const MATERIALS = [
  { value: "aluminum", label: "Aluminum Alloy" },
  { value: "steel", label: "Steel" },
  { value: "titanium", label: "Titanium" },
  { value: "carbon_fiber", label: "Carbon Fiber Composite" },
  { value: "silicon", label: "Silicon" },
  { value: "copper", label: "Copper" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "glass", label: "Glass / Fused Silica" },
  { value: "ceramic", label: "Ceramic" },
  { value: "polymer", label: "Polymer / Plastic" },
  { value: "other", label: "Other" },
];

const HAZARDOUS_MATERIALS = [
  { value: "hydrazine", label: "Hydrazine" },
  { value: "monomethylhydrazine", label: "Monomethylhydrazine (MMH)" },
  { value: "nitrogen_tetroxide", label: "Nitrogen Tetroxide (NTO)" },
  { value: "beryllium", label: "Beryllium" },
  { value: "cadmium", label: "Cadmium" },
  { value: "lead", label: "Lead" },
  { value: "mercury", label: "Mercury" },
  { value: "radioactive", label: "Radioactive Materials" },
  { value: "other", label: "Other Hazardous" },
];

const TRANSPORT_MODES = [
  { value: "air", label: "Air Freight" },
  { value: "sea", label: "Sea Freight" },
  { value: "road", label: "Road Transport" },
  { value: "rail", label: "Rail Transport" },
  { value: "multimodal", label: "Multi-modal" },
];

const CERTIFICATIONS = [
  { value: "iso9001", label: "ISO 9001 (Quality Management)" },
  { value: "iso14001", label: "ISO 14001 (Environmental Management)" },
  { value: "as9100", label: "AS9100 (Aerospace Quality)" },
  { value: "ecss", label: "ECSS Standards Compliant" },
  { value: "itar", label: "ITAR Registered" },
  { value: "ear", label: "EAR Compliant" },
  { value: "reach", label: "REACH Compliant" },
  { value: "rohs", label: "RoHS Compliant" },
];

export default function LCADataFields({
  formData,
  updateField,
  section,
}: LCADataFieldsProps) {
  const inputClassName =
    "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

  const labelClassName = "block text-sm text-white/70 mb-2";

  if (section === "manufacturing") {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClassName}>
              Manufacturing Country <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.manufacturingCountry}
              onChange={(e) =>
                updateField("manufacturingCountry", e.target.value)
              }
              className={inputClassName}
              required
            >
              <option value="">Select country...</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>Energy Source</label>
            <select
              value={formData.manufacturingEnergySource}
              onChange={(e) =>
                updateField("manufacturingEnergySource", e.target.value)
              }
              className={inputClassName}
            >
              <option value="">Select energy source...</option>
              {ENERGY_SOURCES.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClassName}>
              Manufacturing Energy (kWh per unit)
            </label>
            <input
              type="number"
              value={formData.manufacturingEnergyKwh ?? ""}
              onChange={(e) =>
                updateField(
                  "manufacturingEnergyKwh",
                  e.target.value ? parseFloat(e.target.value) : null,
                )
              }
              className={inputClassName}
              placeholder="e.g., 1500"
              min="0"
              step="0.1"
            />
            <p className="text-white/40 text-xs mt-1">
              Total energy consumed to manufacture one unit
            </p>
          </div>

          <div>
            <label className={labelClassName}>Raw Materials Mass (kg)</label>
            <input
              type="number"
              value={formData.rawMaterialsMassKg ?? ""}
              onChange={(e) =>
                updateField(
                  "rawMaterialsMassKg",
                  e.target.value ? parseFloat(e.target.value) : null,
                )
              }
              className={inputClassName}
              placeholder="e.g., 25"
              min="0"
              step="0.01"
            />
            <p className="text-white/40 text-xs mt-1">
              Total mass of raw materials before processing
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (section === "materials") {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClassName}>
              Primary Material <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.primaryMaterial}
              onChange={(e) => updateField("primaryMaterial", e.target.value)}
              className={inputClassName}
            >
              <option value="">Select material...</option>
              {MATERIALS.map((mat) => (
                <option key={mat.value} value={mat.value}>
                  {mat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>Primary Material Mass (kg)</label>
            <input
              type="number"
              value={formData.primaryMaterialMassKg ?? ""}
              onChange={(e) =>
                updateField(
                  "primaryMaterialMassKg",
                  e.target.value ? parseFloat(e.target.value) : null,
                )
              }
              className={inputClassName}
              placeholder="e.g., 15"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className={labelClassName}>Secondary Materials</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MATERIALS.filter((m) => m.value !== formData.primaryMaterial).map(
              (mat) => (
                <label
                  key={mat.value}
                  className="flex items-center gap-2 text-sm text-white/70 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.secondaryMaterials.includes(mat.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateField("secondaryMaterials", [
                          ...formData.secondaryMaterials,
                          mat.value,
                        ]);
                      } else {
                        updateField(
                          "secondaryMaterials",
                          formData.secondaryMaterials.filter(
                            (m) => m !== mat.value,
                          ),
                        );
                      }
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-blue-500 focus:ring-blue-500/50"
                  />
                  {mat.label}
                </label>
              ),
            )}
          </div>
        </div>

        <div className="border-t border-white/10 pt-5">
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={formData.hazardousMaterials}
              onChange={(e) =>
                updateField("hazardousMaterials", e.target.checked)
              }
              className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-blue-500 focus:ring-blue-500/50"
            />
            <span className="text-sm text-white/70">
              Component contains hazardous materials
            </span>
          </label>

          {formData.hazardousMaterials && (
            <div className="pl-7">
              <label className={labelClassName}>Hazardous Material Types</label>
              <div className="grid grid-cols-2 gap-2">
                {HAZARDOUS_MATERIALS.map((mat) => (
                  <label
                    key={mat.value}
                    className="flex items-center gap-2 text-sm text-white/70 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.hazardousMaterialTypes.includes(
                        mat.value,
                      )}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateField("hazardousMaterialTypes", [
                            ...formData.hazardousMaterialTypes,
                            mat.value,
                          ]);
                        } else {
                          updateField(
                            "hazardousMaterialTypes",
                            formData.hazardousMaterialTypes.filter(
                              (m) => m !== mat.value,
                            ),
                          );
                        }
                      }}
                      className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-blue-500 focus:ring-blue-500/50"
                    />
                    {mat.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (section === "transport") {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClassName}>Transport Mode</label>
            <select
              value={formData.transportMode}
              onChange={(e) => updateField("transportMode", e.target.value)}
              className={inputClassName}
            >
              <option value="">Select transport mode...</option>
              {TRANSPORT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>Transport Distance (km)</label>
            <input
              type="number"
              value={formData.transportDistanceKm ?? ""}
              onChange={(e) =>
                updateField(
                  "transportDistanceKm",
                  e.target.value ? parseFloat(e.target.value) : null,
                )
              }
              className={inputClassName}
              placeholder="e.g., 5000"
              min="0"
            />
            <p className="text-white/40 text-xs mt-1">
              Approximate distance from manufacturing to integration site
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (section === "certifications") {
    return (
      <div className="space-y-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hasCertifications}
            onChange={(e) => updateField("hasCertifications", e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-blue-500 focus:ring-blue-500/50"
          />
          <span className="text-sm text-white/70">
            Our facility/products have relevant certifications
          </span>
        </label>

        {formData.hasCertifications && (
          <div>
            <label className={labelClassName}>
              Select Applicable Certifications
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CERTIFICATIONS.map((cert) => (
                <label
                  key={cert.value}
                  className="flex items-center gap-2 text-sm text-white/70 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.certifications.includes(cert.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateField("certifications", [
                          ...formData.certifications,
                          cert.value,
                        ]);
                      } else {
                        updateField(
                          "certifications",
                          formData.certifications.filter(
                            (c) => c !== cert.value,
                          ),
                        );
                      }
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-blue-500 focus:ring-blue-500/50"
                  />
                  {cert.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
