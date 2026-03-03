import { createHash } from "node:crypto";
import { BaseCollector } from "./base-collector.js";
import type {
  CollectorOutput,
  CronSchedule,
  DocumentEvent,
} from "../types/collector-types.js";
import type { SentinelConfig } from "../types/config-types.js";

const DOC_TYPES: DocumentEvent["detected_type"][] = [
  "CERTIFICATE",
  "INSURANCE_POLICY",
  "EXPORT_LICENSE",
  "TRAINING_CERT",
  "AUDIT_REPORT",
  "POLICY_DOCUMENT",
];

const DOC_NAMES: Record<string, string[]> = {
  CERTIFICATE: [
    "ISO_27001_Certificate_2026.pdf",
    "SOC2_Type_II_Report.pdf",
    "ITAR_Authorization.pdf",
  ],
  INSURANCE_POLICY: [
    "TPL_Launch_Policy_AXA.pdf",
    "InOrbit_Coverage_Lloyds.pdf",
    "ReEntry_Liability_Munich_Re.pdf",
  ],
  EXPORT_LICENSE: [
    "EAR_License_NLR.pdf",
    "ITAR_TAA_Approval.pdf",
    "EU_Dual_Use_Authorization.pdf",
  ],
  TRAINING_CERT: [
    "NIS2_Security_Training_Q1.pdf",
    "Incident_Response_Drill_Report.pdf",
    "SATCOM_Operations_Certification.pdf",
  ],
  AUDIT_REPORT: [
    "Annual_Compliance_Audit_2025.pdf",
    "NCA_Inspection_Report.pdf",
    "Internal_Security_Review.pdf",
  ],
  POLICY_DOCUMENT: [
    "Information_Security_Policy_v3.pdf",
    "Debris_Mitigation_Plan.pdf",
    "Business_Continuity_Plan.pdf",
  ],
};

export class DocumentWatchCollector extends BaseCollector {
  readonly name = "Document Watch";
  readonly id = "document_watch";

  private tickCount = 0;

  constructor(_config: SentinelConfig) {
    super();
  }

  getSchedule(): CronSchedule {
    return { expression: "0 0 * * *", description: "Daily at midnight" };
  }

  async collect(): Promise<CollectorOutput[]> {
    try {
      this.tickCount++;

      // Generate 0–2 document events per collection (not every day has docs)
      const eventCount = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2;

      const outputs: CollectorOutput[] = [];

      for (let i = 0; i < eventCount; i++) {
        const event = this.generateEvent();
        const notes: string[] = [];

        if (event.expiry_date) {
          const daysUntilExpiry = Math.floor(
            (new Date(event.expiry_date).getTime() - Date.now()) / 86400000,
          );
          if (daysUntilExpiry < 0) notes.push("Document has expired");
          else if (daysUntilExpiry < 30)
            notes.push(`Document expires in ${daysUntilExpiry} days`);
          else if (daysUntilExpiry < 90)
            notes.push(`Document expires in ${daysUntilExpiry} days`);
        }

        outputs.push({
          data_point: "document_event",
          source_system: "document_monitor",
          collection_method: "inotify_simulator",
          compliance_notes: notes,
          values: {
            ...event,
            collection_timestamp: new Date().toISOString(),
          },
        });
      }

      this.markSuccess();
      return outputs;
    } catch (err) {
      this.markError(err);
      throw err;
    }
  }

  private generateEvent(): DocumentEvent {
    const type = DOC_TYPES[Math.floor(Math.random() * DOC_TYPES.length)]!;
    const names = DOC_NAMES[type]!;
    const filename = names[Math.floor(Math.random() * names.length)]!;
    const fileSize = 50000 + Math.floor(Math.random() * 5000000);
    const fileHash = createHash("sha256")
      .update(`${filename}-${Date.now()}-${Math.random()}`)
      .digest("hex");

    // Some documents have expiry dates
    let expiryDate: string | null = null;
    if (["CERTIFICATE", "INSURANCE_POLICY", "EXPORT_LICENSE"].includes(type)) {
      const daysUntil = 30 + Math.floor(Math.random() * 335); // 30-365 days out
      expiryDate = new Date(Date.now() + daysUntil * 86400000)
        .toISOString()
        .split("T")[0]!;
    }

    return {
      filename,
      file_hash: `sha256:${fileHash}`,
      file_size_bytes: fileSize,
      detected_type: type,
      expiry_date: expiryDate,
      detected_at: new Date().toISOString(),
    };
  }
}
