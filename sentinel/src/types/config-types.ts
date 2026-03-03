export interface SentinelConfig {
  sentinel: {
    operator_id: string;
    operator_name: string;
    satellites: SatelliteConfig[];
  };
  collectors: {
    orbit_debris: CollectorConfig;
    cybersecurity: CollectorConfig;
    ground_station: CollectorConfig;
    document_watch: CollectorConfig;
  };
  transport: {
    caelex_api_url: string;
    sentinel_token: string;
    retry_max_attempts: number;
    retry_max_delay_ms: number;
    buffer_max_days: number;
  };
  dashboard: {
    enabled: boolean;
    port: number;
  };
  mode: "simulator" | "production";
}

export interface SatelliteConfig {
  norad_id: string;
  name: string;
  orbit_type: "LEO" | "MEO" | "GEO" | "SSO" | "HEO";
  initial_altitude_km?: number;
  initial_inclination_deg?: number;
}

export interface CollectorConfig {
  enabled: boolean;
  schedule: string; // cron expression
}
