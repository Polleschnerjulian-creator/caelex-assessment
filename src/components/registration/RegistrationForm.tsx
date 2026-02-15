"use client";

import { useState } from "react";
import { X, ChevronRight, ChevronLeft, RefreshCw, Wand2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

interface Spacecraft {
  id: string;
  name: string;
  cosparId: string | null;
  noradId: string | null;
  missionType: string;
  orbitType: string;
  status: string;
}

interface RegistrationFormProps {
  organizationId: string;
  spacecraft: Spacecraft[];
  onClose: () => void;
  onSuccess: () => void;
}

const OBJECT_TYPES = [
  { value: "SATELLITE", label: "Satellite" },
  { value: "SPACE_STATION", label: "Space Station" },
  { value: "SPACE_PROBE", label: "Space Probe" },
  { value: "CREWED_SPACECRAFT", label: "Crewed Spacecraft" },
  { value: "LAUNCH_VEHICLE_STAGE", label: "Launch Vehicle Stage" },
  { value: "DEBRIS", label: "Debris" },
  { value: "OTHER", label: "Other" },
];

const ORBITAL_REGIMES = [
  { value: "LEO", label: "LEO - Low Earth Orbit (< 2,000 km)" },
  { value: "MEO", label: "MEO - Medium Earth Orbit (2,000 - 35,786 km)" },
  { value: "GEO", label: "GEO - Geostationary Orbit (~35,786 km)" },
  { value: "HEO", label: "HEO - Highly Elliptical Orbit" },
  { value: "SSO", label: "SSO - Sun-Synchronous Orbit" },
  { value: "POLAR", label: "Polar Orbit" },
  { value: "BEYOND", label: "Beyond Earth Orbit (Lunar, Interplanetary)" },
];

const EU_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
];

export default function RegistrationForm({
  organizationId,
  spacecraft,
  onClose,
  onSuccess,
}: RegistrationFormProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    spacecraftId: "",
    objectName: "",
    objectType: "SATELLITE",
    ownerOperator: "",
    stateOfRegistry: "DE",

    // Step 2: Launch Info
    launchDate: "",
    launchSite: "",
    launchVehicle: "",
    launchState: "",

    // Step 3: Orbital Parameters
    orbitalRegime: "LEO",
    perigee: "",
    apogee: "",
    inclination: "",
    period: "",
    nodeLongitude: "",

    // Step 4: Identifiers
    internationalDesignator: "",
    noradCatalogNumber: "",
    generalFunction: "",
  });

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSpacecraftSelect = (spacecraftId: string) => {
    const selected = spacecraft.find((s) => s.id === spacecraftId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        spacecraftId,
        objectName: prev.objectName || selected.name,
        internationalDesignator: selected.cosparId || "",
        noradCatalogNumber: selected.noradId || "",
        orbitalRegime:
          (selected.orbitType as typeof prev.orbitalRegime) || "LEO",
      }));
    }
  };

  const generateCOSPAR = async () => {
    try {
      const year = formData.launchDate
        ? new Date(formData.launchDate).getFullYear()
        : new Date().getFullYear();

      const response = await fetch("/api/registration/generate-cospar", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ launchYear: year }),
      });

      if (response.ok) {
        const data = await response.json();
        updateFormData("internationalDesignator", data.suggestedId);
      }
    } catch (err) {
      console.error("Error generating COSPAR:", err);
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (!formData.spacecraftId) {
          setError("Please select a spacecraft");
          return false;
        }
        if (!formData.objectName) {
          setError("Object name is required");
          return false;
        }
        if (!formData.ownerOperator) {
          setError("Owner/Operator is required");
          return false;
        }
        break;
      case 3:
        if (formData.perigee && formData.apogee) {
          if (parseFloat(formData.perigee) > parseFloat(formData.apogee)) {
            setError("Perigee cannot be greater than apogee");
            return false;
          }
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        organizationId,
        spacecraftId: formData.spacecraftId,
        objectName: formData.objectName,
        objectType: formData.objectType,
        ownerOperator: formData.ownerOperator,
        stateOfRegistry: formData.stateOfRegistry,
        orbitalRegime: formData.orbitalRegime,
        launchDate: formData.launchDate || undefined,
        launchSite: formData.launchSite || undefined,
        launchVehicle: formData.launchVehicle || undefined,
        launchState: formData.launchState || undefined,
        perigee: formData.perigee ? parseFloat(formData.perigee) : undefined,
        apogee: formData.apogee ? parseFloat(formData.apogee) : undefined,
        inclination: formData.inclination
          ? parseFloat(formData.inclination)
          : undefined,
        period: formData.period ? parseFloat(formData.period) : undefined,
        nodeLongitude: formData.nodeLongitude
          ? parseFloat(formData.nodeLongitude)
          : undefined,
        internationalDesignator: formData.internationalDesignator || undefined,
        noradCatalogNumber: formData.noradCatalogNumber || undefined,
        generalFunction: formData.generalFunction || undefined,
      };

      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create registration");
      }

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create registration",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-form-title"
    >
      <div className="bg-navy-900 border border-navy-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-navy-700">
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="registration-form-title"
                className="text-xl font-semibold text-white"
              >
                New URSO Registration
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Step {step} of 4: {getStepTitle(step)}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Progress bar */}
          <div
            className="flex gap-2 mt-4"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label={`Registration step ${step} of 4`}
          >
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  s <= step ? "bg-blue-500" : "bg-navy-700"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <Step1BasicInfo
              formData={formData}
              spacecraft={spacecraft}
              onUpdate={updateFormData}
              onSpacecraftSelect={handleSpacecraftSelect}
            />
          )}

          {step === 2 && (
            <Step2LaunchInfo formData={formData} onUpdate={updateFormData} />
          )}

          {step === 3 && (
            <Step3OrbitalParams formData={formData} onUpdate={updateFormData} />
          )}

          {step === 4 && (
            <Step4Identifiers
              formData={formData}
              onUpdate={updateFormData}
              onGenerateCOSPAR={generateCOSPAR}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-navy-700 flex justify-between">
          <button
            onClick={step > 1 ? prevStep : onClose}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            {step > 1 ? "Back" : "Cancel"}
          </button>

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving && (
                <RefreshCw
                  className="w-4 h-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Create Registration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getStepTitle(step: number): string {
  switch (step) {
    case 1:
      return "Basic Information";
    case 2:
      return "Launch Information";
    case 3:
      return "Orbital Parameters";
    case 4:
      return "Identifiers & Review";
    default:
      return "";
  }
}

function Step1BasicInfo({
  formData,
  spacecraft,
  onUpdate,
  onSpacecraftSelect,
}: {
  formData: {
    spacecraftId: string;
    objectName: string;
    objectType: string;
    ownerOperator: string;
    stateOfRegistry: string;
  };
  spacecraft: Spacecraft[];
  onUpdate: (field: string, value: string) => void;
  onSpacecraftSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="reg-spacecraft"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Linked Spacecraft *
        </label>
        <select
          id="reg-spacecraft"
          value={formData.spacecraftId}
          onChange={(e) => onSpacecraftSelect(e.target.value)}
          aria-required="true"
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Select spacecraft...</option>
          {spacecraft.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.cosparId ? `(${s.cosparId})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="reg-object-name"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Object Name *
        </label>
        <input
          id="reg-object-name"
          type="text"
          value={formData.objectName}
          onChange={(e) => onUpdate("objectName", e.target.value)}
          aria-required="true"
          placeholder="e.g., EUMETSAT Meteosat-12"
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="reg-object-type"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Object Type *
        </label>
        <select
          id="reg-object-type"
          value={formData.objectType}
          onChange={(e) => onUpdate("objectType", e.target.value)}
          aria-required="true"
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {OBJECT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="reg-owner-operator"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Owner/Operator *
        </label>
        <input
          id="reg-owner-operator"
          type="text"
          value={formData.ownerOperator}
          onChange={(e) => onUpdate("ownerOperator", e.target.value)}
          aria-required="true"
          placeholder="e.g., European Space Agency"
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="reg-state-of-registry"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          State of Registry *
        </label>
        <select
          id="reg-state-of-registry"
          value={formData.stateOfRegistry}
          onChange={(e) => onUpdate("stateOfRegistry", e.target.value)}
          aria-required="true"
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {EU_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Step2LaunchInfo({
  formData,
  onUpdate,
}: {
  formData: {
    launchDate: string;
    launchSite: string;
    launchVehicle: string;
    launchState: string;
  };
  onUpdate: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="reg-launch-date"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Launch Date
        </label>
        <input
          id="reg-launch-date"
          type="date"
          value={formData.launchDate}
          onChange={(e) => onUpdate("launchDate", e.target.value)}
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="reg-launch-site"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Launch Site
        </label>
        <input
          id="reg-launch-site"
          type="text"
          value={formData.launchSite}
          onChange={(e) => onUpdate("launchSite", e.target.value)}
          placeholder="e.g., Kourou, French Guiana"
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="reg-launch-vehicle"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Launch Vehicle
        </label>
        <input
          id="reg-launch-vehicle"
          type="text"
          value={formData.launchVehicle}
          onChange={(e) => onUpdate("launchVehicle", e.target.value)}
          placeholder="e.g., Ariane 6"
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="reg-launch-state"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Launch State (ISO Country Code)
        </label>
        <select
          id="reg-launch-state"
          value={formData.launchState}
          onChange={(e) => onUpdate("launchState", e.target.value)}
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Select country...</option>
          {EU_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Step3OrbitalParams({
  formData,
  onUpdate,
}: {
  formData: {
    orbitalRegime: string;
    perigee: string;
    apogee: string;
    inclination: string;
    period: string;
    nodeLongitude: string;
  };
  onUpdate: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="reg-orbital-regime"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Orbital Regime *
        </label>
        <select
          id="reg-orbital-regime"
          value={formData.orbitalRegime}
          onChange={(e) => onUpdate("orbitalRegime", e.target.value)}
          aria-required="true"
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {ORBITAL_REGIMES.map((regime) => (
            <option key={regime.value} value={regime.value}>
              {regime.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="reg-perigee"
            className="block text-sm font-medium text-slate-300 mb-1"
          >
            Perigee (km)
          </label>
          <input
            id="reg-perigee"
            type="number"
            value={formData.perigee}
            onChange={(e) => onUpdate("perigee", e.target.value)}
            placeholder="e.g., 400"
            className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="reg-apogee"
            className="block text-sm font-medium text-slate-300 mb-1"
          >
            Apogee (km)
          </label>
          <input
            id="reg-apogee"
            type="number"
            value={formData.apogee}
            onChange={(e) => onUpdate("apogee", e.target.value)}
            placeholder="e.g., 410"
            className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="reg-inclination"
            className="block text-sm font-medium text-slate-300 mb-1"
          >
            Inclination (degrees)
          </label>
          <input
            id="reg-inclination"
            type="number"
            step="0.1"
            value={formData.inclination}
            onChange={(e) => onUpdate("inclination", e.target.value)}
            placeholder="e.g., 51.6"
            className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="reg-period"
            className="block text-sm font-medium text-slate-300 mb-1"
          >
            Period (minutes)
          </label>
          <input
            id="reg-period"
            type="number"
            step="0.1"
            value={formData.period}
            onChange={(e) => onUpdate("period", e.target.value)}
            placeholder="e.g., 92.5"
            className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {formData.orbitalRegime === "GEO" && (
        <div>
          <label
            htmlFor="reg-node-longitude"
            className="block text-sm font-medium text-slate-300 mb-1"
          >
            Node Longitude (degrees)
          </label>
          <input
            id="reg-node-longitude"
            type="number"
            step="0.1"
            value={formData.nodeLongitude}
            onChange={(e) => onUpdate("nodeLongitude", e.target.value)}
            placeholder="e.g., 0.0"
            className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}
    </div>
  );
}

function Step4Identifiers({
  formData,
  onUpdate,
  onGenerateCOSPAR,
}: {
  formData: {
    internationalDesignator: string;
    noradCatalogNumber: string;
    generalFunction: string;
  };
  onUpdate: (field: string, value: string) => void;
  onGenerateCOSPAR: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="reg-cospar-id"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          International Designator (COSPAR ID)
        </label>
        <div className="flex gap-2">
          <input
            id="reg-cospar-id"
            type="text"
            value={formData.internationalDesignator}
            onChange={(e) =>
              onUpdate("internationalDesignator", e.target.value.toUpperCase())
            }
            placeholder="YYYY-NNNXXX (e.g., 2025-042A)"
            className="flex-1 px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={onGenerateCOSPAR}
            className="flex items-center gap-2 px-3 py-2 bg-navy-700 text-slate-300 rounded-lg hover:bg-navy-600 transition-colors"
            title="Generate suggestion"
            aria-label="Generate COSPAR ID suggestion"
          >
            <Wand2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Format: YYYY-NNNXXX (Year-LaunchNumber-Sequence)
        </p>
      </div>

      <div>
        <label
          htmlFor="reg-norad"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          NORAD Catalog Number
        </label>
        <input
          id="reg-norad"
          type="text"
          value={formData.noradCatalogNumber}
          onChange={(e) => onUpdate("noradCatalogNumber", e.target.value)}
          placeholder="e.g., 54321"
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          5-digit number assigned by NORAD/Space-Track
        </p>
      </div>

      <div>
        <label
          htmlFor="reg-general-function"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          General Function / Mission Description
        </label>
        <textarea
          id="reg-general-function"
          value={formData.generalFunction}
          onChange={(e) => onUpdate("generalFunction", e.target.value)}
          placeholder="Describe the general function and purpose of the space object..."
          rows={4}
          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>
    </div>
  );
}
