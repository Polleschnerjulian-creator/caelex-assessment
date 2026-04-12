/**
 * Company Profile Types
 * Shared between CompanyProfileBar, ProfileSlideOver, and the profile API route.
 */

export interface CompanyProfileData {
  companyName: string | null;
  establishmentCountry: string | null;
  entitySize: "micro" | "small" | "medium" | "large" | null;
  isResearchInstitution: boolean;
  isStartup: boolean;
  activityTypes: string[];
  serviceTypes: string[];
  primaryOrbitalRegime: string | null;
  operatesConstellation: boolean;
  constellationSize: string | null;
  spacecraftCount: number | null;
  missionDuration: string | null;
  isDefenseOnly: boolean;
}

export const COUNTRY_OPTIONS: { code: string; flag: string; name: string }[] = [
  { code: "AT", flag: "\u{1F1E6}\u{1F1F9}", name: "Austria" },
  { code: "BE", flag: "\u{1F1E7}\u{1F1EA}", name: "Belgium" },
  { code: "BG", flag: "\u{1F1E7}\u{1F1EC}", name: "Bulgaria" },
  { code: "HR", flag: "\u{1F1ED}\u{1F1F7}", name: "Croatia" },
  { code: "CY", flag: "\u{1F1E8}\u{1F1FE}", name: "Cyprus" },
  { code: "CZ", flag: "\u{1F1E8}\u{1F1FF}", name: "Czech Republic" },
  { code: "DK", flag: "\u{1F1E9}\u{1F1F0}", name: "Denmark" },
  { code: "EE", flag: "\u{1F1EA}\u{1F1EA}", name: "Estonia" },
  { code: "FI", flag: "\u{1F1EB}\u{1F1EE}", name: "Finland" },
  { code: "FR", flag: "\u{1F1EB}\u{1F1F7}", name: "France" },
  { code: "DE", flag: "\u{1F1E9}\u{1F1EA}", name: "Germany" },
  { code: "GR", flag: "\u{1F1EC}\u{1F1F7}", name: "Greece" },
  { code: "HU", flag: "\u{1F1ED}\u{1F1FA}", name: "Hungary" },
  { code: "IE", flag: "\u{1F1EE}\u{1F1EA}", name: "Ireland" },
  { code: "IT", flag: "\u{1F1EE}\u{1F1F9}", name: "Italy" },
  { code: "LV", flag: "\u{1F1F1}\u{1F1FB}", name: "Latvia" },
  { code: "LT", flag: "\u{1F1F1}\u{1F1F9}", name: "Lithuania" },
  { code: "LU", flag: "\u{1F1F1}\u{1F1FA}", name: "Luxembourg" },
  { code: "MT", flag: "\u{1F1F2}\u{1F1F9}", name: "Malta" },
  { code: "NL", flag: "\u{1F1F3}\u{1F1F1}", name: "Netherlands" },
  { code: "PL", flag: "\u{1F1F5}\u{1F1F1}", name: "Poland" },
  { code: "PT", flag: "\u{1F1F5}\u{1F1F9}", name: "Portugal" },
  { code: "RO", flag: "\u{1F1F7}\u{1F1F4}", name: "Romania" },
  { code: "SK", flag: "\u{1F1F8}\u{1F1F0}", name: "Slovakia" },
  { code: "SI", flag: "\u{1F1F8}\u{1F1EE}", name: "Slovenia" },
  { code: "ES", flag: "\u{1F1EA}\u{1F1F8}", name: "Spain" },
  { code: "SE", flag: "\u{1F1F8}\u{1F1EA}", name: "Sweden" },
  { code: "UK", flag: "\u{1F1EC}\u{1F1E7}", name: "United Kingdom" },
  { code: "NO", flag: "\u{1F1F3}\u{1F1F4}", name: "Norway" },
  { code: "CH", flag: "\u{1F1E8}\u{1F1ED}", name: "Switzerland" },
  { code: "US", flag: "\u{1F1FA}\u{1F1F8}", name: "United States" },
];

export const ACTIVITY_TYPE_OPTIONS: {
  code: string;
  label: string;
  short: string;
}[] = [
  { code: "SCO", label: "Spacecraft Operator", short: "Spacecraft" },
  { code: "LO", label: "Launch Operator", short: "Launch" },
  { code: "LSO", label: "Launch Site Operator", short: "Launch Site" },
  { code: "ISOS", label: "In-Space Service Operator", short: "In-Space" },
  { code: "CAP", label: "Collision Avoidance Provider", short: "Collision" },
  { code: "PDP", label: "Positional Data Provider", short: "Data Provider" },
  { code: "TCO", label: "Third Country Operator", short: "Third Country" },
];

export const SERVICE_TYPE_OPTIONS: { code: string; label: string }[] = [
  { code: "SATCOM", label: "Satellite Communications" },
  { code: "EO", label: "Earth Observation" },
  { code: "NAV", label: "Navigation / GNSS" },
  { code: "ISR", label: "ISR" },
  { code: "SSA", label: "Space Situational Awareness" },
  { code: "RELAY", label: "Data Relay" },
  { code: "IOD", label: "In-Orbit Demonstration" },
  { code: "MANUFACTURING", label: "In-Space Manufacturing" },
  { code: "TOURISM", label: "Space Tourism" },
  { code: "DEBRIS_REMOVAL", label: "Active Debris Removal" },
  { code: "SERVICING", label: "On-Orbit Servicing" },
  { code: "OTHER", label: "Other" },
];

export const ORBIT_OPTIONS: { code: string; label: string }[] = [
  { code: "LEO", label: "Low Earth Orbit" },
  { code: "MEO", label: "Medium Earth Orbit" },
  { code: "GEO", label: "Geostationary Orbit" },
  { code: "HEO", label: "Highly Elliptical Orbit" },
  { code: "SSO", label: "Sun-Synchronous Orbit" },
  { code: "CISLUNAR", label: "Cislunar" },
  { code: "MULTIPLE", label: "Multiple Regimes" },
];

export const ENTITY_SIZE_LABELS: Record<string, string> = {
  micro: "Micro",
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export const MISSION_DURATION_OPTIONS: { code: string; label: string }[] = [
  { code: "short", label: "Short (< 2 years)" },
  { code: "medium", label: "Medium (2 - 7 years)" },
  { code: "long", label: "Long (7 - 25 years)" },
  { code: "extended", label: "Extended (> 25 years)" },
];

export function getCountryFlag(code: string | null): string {
  if (!code) return "";
  const country = COUNTRY_OPTIONS.find((c) => c.code === code);
  return country?.flag ?? "";
}

export function getCountryName(code: string | null): string {
  if (!code) return "";
  const country = COUNTRY_OPTIONS.find((c) => c.code === code);
  return country?.name ?? code;
}

export const DEFAULT_PROFILE_DATA: CompanyProfileData = {
  companyName: null,
  establishmentCountry: null,
  entitySize: null,
  isResearchInstitution: false,
  isStartup: false,
  activityTypes: [],
  serviceTypes: [],
  primaryOrbitalRegime: null,
  operatesConstellation: false,
  constellationSize: null,
  spacecraftCount: null,
  missionDuration: null,
  isDefenseOnly: false,
};
