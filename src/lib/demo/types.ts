export interface DemoSeedResult {
  success: boolean;
  created: {
    spacecraft: number;
    conjunctionEvents: number;
    cdmRecords: number;
    documents: number;
    attestations: number;
    sentinelAgents: number;
    sentinelPackets: number;
    ncaSubmissions: number;
    deadlines: number;
  };
  duration: number;
  errors: string[];
}

export interface DemoCleanupResult {
  success: boolean;
  deleted: Record<string, number>;
  duration: number;
}
