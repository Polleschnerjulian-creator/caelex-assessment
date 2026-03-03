export interface EvidencePacket {
  packet_id: string;
  version: "1.0";
  sentinel_id: string;
  operator_id: string;
  satellite_norad_id: string | null;

  data: {
    data_point: string;
    values: Record<string, unknown>;
    source_system: string;
    collection_method: string;
    collection_timestamp: string;
    compliance_notes: string[];
  };

  regulation_mapping: RegulationMapping[];

  integrity: {
    content_hash: string;
    previous_hash: string;
    chain_position: number;
    signature: string;
    agent_public_key: string;
    timestamp_source: string;
  };

  metadata: {
    sentinel_version: string;
    collector: string;
    config_hash: string;
    uptime_seconds: number;
    packets_sent_total: number;
  };
}

export interface RegulationMapping {
  ref: string;
  status: "COMPLIANT" | "NON_COMPLIANT" | "WARNING" | "MONITORED" | "CRITICAL";
  note: string;
}
