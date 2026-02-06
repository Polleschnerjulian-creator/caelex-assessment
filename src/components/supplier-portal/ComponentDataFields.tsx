"use client";

import type { LCAFormData } from "./SupplierDataForm";

interface ComponentDataFieldsProps {
  componentType: string;
  formData: LCAFormData;
  updateField: <K extends keyof LCAFormData>(
    field: K,
    value: LCAFormData[K],
  ) => void;
}

export default function ComponentDataFields({
  componentType,
  formData,
  updateField,
}: ComponentDataFieldsProps) {
  const inputClassName =
    "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";

  const labelClassName = "block text-sm text-white/70 mb-2";

  // Get component-specific help text
  const getComponentHelp = () => {
    const type = componentType.toLowerCase();
    if (type.includes("solar") || type.includes("panel")) {
      return "Include the mass of solar cells, substrate, and any deployment mechanisms.";
    }
    if (type.includes("battery") || type.includes("power")) {
      return "Include battery cells, housing, thermal management, and wiring harness.";
    }
    if (type.includes("propulsion") || type.includes("thruster")) {
      return "Include thruster assembly, valves, and any propellant tanks (empty mass).";
    }
    if (type.includes("structure") || type.includes("frame")) {
      return "Include primary structure, brackets, and any integrated thermal hardware.";
    }
    if (type.includes("antenna") || type.includes("communication")) {
      return "Include antenna elements, reflector, feed horn, and deployment mechanism.";
    }
    if (type.includes("sensor") || type.includes("payload")) {
      return "Include optical elements, detectors, housing, and thermal control.";
    }
    return "Total mass of the delivered component including all sub-assemblies.";
  };

  return (
    <div className="space-y-5">
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-300 text-sm">
          <strong>Component Type:</strong> {componentType}
        </p>
        <p className="text-blue-300/70 text-xs mt-1">{getComponentHelp()}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClassName}>
            Component Mass (kg) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={formData.componentMassKg ?? ""}
            onChange={(e) =>
              updateField(
                "componentMassKg",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
            className={inputClassName}
            placeholder="e.g., 12.5"
            min="0"
            step="0.001"
            required
          />
          <p className="text-white/40 text-xs mt-1">
            Delivered mass of the component
          </p>
        </div>

        <div>
          <label className={labelClassName}>Expected Lifespan (years)</label>
          <input
            type="number"
            value={formData.componentLifespanYears ?? ""}
            onChange={(e) =>
              updateField(
                "componentLifespanYears",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
            className={inputClassName}
            placeholder="e.g., 15"
            min="0"
            step="0.5"
          />
          <p className="text-white/40 text-xs mt-1">
            Design lifetime or qualification life
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClassName}>
            Units Tested for Qualification
          </label>
          <input
            type="number"
            value={formData.testedComponents ?? ""}
            onChange={(e) =>
              updateField(
                "testedComponents",
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
            className={inputClassName}
            placeholder="e.g., 3"
            min="0"
          />
          <p className="text-white/40 text-xs mt-1">
            Number of units consumed during testing
          </p>
        </div>

        <div>
          <label className={labelClassName}>
            Manufacturing Defect Rate (%)
          </label>
          <input
            type="number"
            value={formData.defectRate ?? ""}
            onChange={(e) =>
              updateField(
                "defectRate",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
            className={inputClassName}
            placeholder="e.g., 2.5"
            min="0"
            max="100"
            step="0.1"
          />
          <p className="text-white/40 text-xs mt-1">
            Percentage of units scrapped during manufacturing
          </p>
        </div>
      </div>

      {/* Component-specific fields based on type */}
      {componentType.toLowerCase().includes("solar") && (
        <div className="border-t border-white/10 pt-5">
          <h4 className="text-white/90 font-medium mb-4">
            Solar Panel Specifics
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClassName}>Cell Technology</label>
              <select className={inputClassName}>
                <option value="">Select technology...</option>
                <option value="gaas">GaAs Triple Junction</option>
                <option value="si_mono">Silicon Monocrystalline</option>
                <option value="si_poly">Silicon Polycrystalline</option>
                <option value="thin_film">Thin Film (CIGS/CdTe)</option>
                <option value="perovskite">Perovskite</option>
              </select>
            </div>
            <div>
              <label className={labelClassName}>Efficiency (%)</label>
              <input
                type="number"
                className={inputClassName}
                placeholder="e.g., 30"
                min="0"
                max="50"
                step="0.1"
              />
            </div>
          </div>
        </div>
      )}

      {componentType.toLowerCase().includes("battery") && (
        <div className="border-t border-white/10 pt-5">
          <h4 className="text-white/90 font-medium mb-4">Battery Specifics</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClassName}>Chemistry</label>
              <select className={inputClassName}>
                <option value="">Select chemistry...</option>
                <option value="li_ion">Lithium-Ion</option>
                <option value="li_polymer">Lithium Polymer</option>
                <option value="ni_h2">Nickel-Hydrogen</option>
                <option value="ni_cd">Nickel-Cadmium</option>
              </select>
            </div>
            <div>
              <label className={labelClassName}>Capacity (Wh)</label>
              <input
                type="number"
                className={inputClassName}
                placeholder="e.g., 500"
                min="0"
              />
            </div>
          </div>
        </div>
      )}

      {componentType.toLowerCase().includes("propulsion") && (
        <div className="border-t border-white/10 pt-5">
          <h4 className="text-white/90 font-medium mb-4">
            Propulsion Specifics
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClassName}>Propulsion Type</label>
              <select className={inputClassName}>
                <option value="">Select type...</option>
                <option value="chemical_mono">Chemical Monopropellant</option>
                <option value="chemical_bi">Chemical Bipropellant</option>
                <option value="electric_hall">Electric (Hall Effect)</option>
                <option value="electric_ion">Electric (Ion)</option>
                <option value="electric_ppt">Electric (PPT)</option>
                <option value="cold_gas">Cold Gas</option>
              </select>
            </div>
            <div>
              <label className={labelClassName}>Total Impulse (Ns)</label>
              <input
                type="number"
                className={inputClassName}
                placeholder="e.g., 10000"
                min="0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
