/**
 * Realistic seed data for demo satellites.
 * Each satellite has an initial orbital state that will evolve over time.
 */
export interface SatelliteState {
  norad_id: string;
  name: string;
  altitude_km: number;
  semi_major_axis_km: number;
  eccentricity: number;
  inclination_deg: number;
  remaining_fuel_kg: number;
  initial_fuel_kg: number;
  thruster_status: "NOMINAL" | "DEGRADED" | "FAILED";
  attitude_status: "NOMINAL" | "SAFE_MODE" | "TUMBLING";
  solar_array_power_w: number;
  battery_soc_pct: number;
  last_maneuver_timestamp: string;
  last_maneuver_delta_v: number;
  ca_events_log: Array<{ date: string; pc: number; maneuvered: boolean }>;
  orbit_type: "LEO" | "SSO" | "MEO" | "GEO" | "HEO";
}

const EARTH_RADIUS_KM = 6371;

export function createInitialState(
  norad_id: string,
  name: string,
  orbit_type: string,
  altitude_km?: number,
  inclination_deg?: number,
): SatelliteState {
  const alt = altitude_km ?? getDefaultAltitude(orbit_type);
  const inc = inclination_deg ?? getDefaultInclination(orbit_type);

  return {
    norad_id,
    name,
    altitude_km: alt,
    semi_major_axis_km: EARTH_RADIUS_KM + alt,
    eccentricity: 0.0001 + Math.random() * 0.0005,
    inclination_deg: inc,
    remaining_fuel_kg: 42.5,
    initial_fuel_kg: 50.0,
    thruster_status: "NOMINAL",
    attitude_status: "NOMINAL",
    solar_array_power_w: 850 + Math.random() * 100,
    battery_soc_pct: 92 + Math.random() * 8,
    last_maneuver_timestamp: new Date(
      Date.now() - 7 * 86400000 - Math.random() * 14 * 86400000,
    ).toISOString(),
    last_maneuver_delta_v: 0.02 + Math.random() * 0.08,
    ca_events_log: [],
    orbit_type: orbit_type as SatelliteState["orbit_type"],
  };
}

function getDefaultAltitude(orbit_type: string): number {
  switch (orbit_type) {
    case "SSO":
      return 540 + Math.random() * 20;
    case "LEO":
      return 400 + Math.random() * 50;
    case "MEO":
      return 20200 + Math.random() * 200;
    case "GEO":
      return 35786;
    case "HEO":
      return 500 + Math.random() * 100;
    default:
      return 550;
  }
}

function getDefaultInclination(orbit_type: string): number {
  switch (orbit_type) {
    case "SSO":
      return 97.4 + Math.random() * 0.4;
    case "LEO":
      return 51.6 + Math.random() * 1.0;
    case "MEO":
      return 55 + Math.random() * 2;
    case "GEO":
      return 0.05 + Math.random() * 0.1;
    case "HEO":
      return 63.4;
    default:
      return 51.6;
  }
}

// Ground station seed data
export interface GroundStationState {
  station_id: string;
  station_name: string;
  location: string;
  latitude: number;
  longitude: number;
  availability_pct: number;
  contacts_today: number;
  successes_today: number;
}

export const GROUND_STATIONS: GroundStationState[] = [
  {
    station_id: "GS-SVALBARD",
    station_name: "Svalbard SvalSat",
    location: "Svalbard, Norway",
    latitude: 78.23,
    longitude: 15.39,
    availability_pct: 99.2,
    contacts_today: 0,
    successes_today: 0,
  },
  {
    station_id: "GS-KIRUNA",
    station_name: "Kiruna Esrange",
    location: "Kiruna, Sweden",
    latitude: 67.89,
    longitude: 21.06,
    availability_pct: 98.5,
    contacts_today: 0,
    successes_today: 0,
  },
  {
    station_id: "GS-DARMSTADT",
    station_name: "ESOC Darmstadt",
    location: "Darmstadt, Germany",
    latitude: 49.87,
    longitude: 8.63,
    availability_pct: 97.8,
    contacts_today: 0,
    successes_today: 0,
  },
  {
    station_id: "GS-PERTH",
    station_name: "New Norcia",
    location: "Perth, Australia",
    latitude: -31.05,
    longitude: 116.19,
    availability_pct: 99.0,
    contacts_today: 0,
    successes_today: 0,
  },
];
