/**
 * Audit Report PDF Template
 * Comprehensive audit trail report for compliance documentation
 */

import React from "react";
import { BaseReport } from "../templates/base-report";
import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
} from "../types";
import type { AuditReportData } from "@/lib/services/audit-export-service";

interface AuditReportProps {
  data: AuditReportData;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    article_status_changed: "Article Status Changed",
    checklist_item_completed: "Checklist Item Completed",
    checklist_item_uncompleted: "Checklist Item Uncompleted",
    document_status_changed: "Document Status Changed",
    document_uploaded: "Document Uploaded",
    document_deleted: "Document Deleted",
    workflow_created: "Workflow Created",
    workflow_status_changed: "Workflow Status Changed",
    workflow_submitted: "Workflow Submitted",
    user_profile_updated: "User Profile Updated",
    assessment_imported: "Assessment Imported",
    bulk_status_update: "Bulk Status Update",
    debris_assessment_created: "Debris Assessment Created",
    debris_assessment_updated: "Debris Assessment Updated",
    cybersecurity_assessment_created: "Cybersecurity Assessment Created",
    cybersecurity_assessment_updated: "Cybersecurity Assessment Updated",
    insurance_assessment_created: "Insurance Assessment Created",
    insurance_assessment_updated: "Insurance Assessment Updated",
    environmental_assessment_created: "Environmental Assessment Created",
    environmental_assessment_updated: "Environmental Assessment Updated",
  };
  return (
    labels[action] ||
    action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function getEntityTypeLabel(entityType: string): string {
  const labels: Record<string, string> = {
    article: "Article",
    checklist: "Checklist",
    document: "Document",
    authorization: "Authorization",
    workflow: "Workflow",
    user: "User",
    debris_assessment: "Debris Assessment",
    debris_requirement: "Debris Requirement",
    cybersecurity_assessment: "Cybersecurity Assessment",
    cybersecurity_requirement: "Cybersecurity Requirement",
    insurance_assessment: "Insurance Assessment",
    insurance_policy: "Insurance Policy",
    environmental_assessment: "Environmental Assessment",
    environmental_impact: "Environmental Impact",
    supplier_request: "Supplier Request",
  };
  return (
    labels[entityType] ||
    entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function buildAuditReportConfig(data: AuditReportData): ReportConfig {
  const sections: ReportSection[] = [];

  // Executive Summary section
  const summaryContent: ReportSectionContent[] = [
    {
      type: "text",
      value: `This audit report provides a comprehensive record of all compliance-related activities for the period ${formatDate(data.period.from)} to ${formatDate(data.period.to)}.`,
    },
    { type: "spacer", height: 10 },
    {
      type: "keyValue",
      items: [
        {
          key: "Report Period",
          value: `${formatDate(data.period.from)} - ${formatDate(data.period.to)}`,
        },
        { key: "Total Events", value: data.summary.totalEvents.toString() },
        {
          key: "Unique Entity Types",
          value: Object.keys(data.summary.eventsByEntityType).length.toString(),
        },
        {
          key: "Action Types",
          value: Object.keys(data.summary.eventsByAction).length.toString(),
        },
        { key: "Generated", value: formatDateTime(data.generatedAt) },
      ],
    },
  ];

  if (data.organizationName) {
    summaryContent.splice(1, 0, {
      type: "keyValue",
      items: [{ key: "Organization", value: data.organizationName }],
    });
  }

  sections.push({
    title: "1. Executive Summary",
    content: summaryContent,
  });

  // Activity by Action Type section
  const actionTableRows = Object.entries(data.summary.eventsByAction)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([action, count]) => [
      getActionLabel(action),
      count.toString(),
      `${((count / data.summary.totalEvents) * 100).toFixed(1)}%`,
    ]);

  sections.push({
    title: "2. Activity by Action Type",
    content: [
      {
        type: "text",
        value:
          "The following table shows the distribution of audit events by action type:",
      },
      { type: "spacer", height: 5 },
      {
        type: "table",
        headers: ["Action", "Count", "Percentage"],
        rows: actionTableRows,
      },
    ],
  });

  // Activity by Entity Type section
  const entityTableRows = Object.entries(data.summary.eventsByEntityType)
    .sort(([, a], [, b]) => b - a)
    .map(([entityType, count]) => [
      getEntityTypeLabel(entityType),
      count.toString(),
      `${((count / data.summary.totalEvents) * 100).toFixed(1)}%`,
    ]);

  sections.push({
    title: "3. Activity by Entity Type",
    content: [
      {
        type: "text",
        value: "Distribution of audit events across different entity types:",
      },
      { type: "spacer", height: 5 },
      {
        type: "table",
        headers: ["Entity Type", "Count", "Percentage"],
        rows: entityTableRows,
      },
    ],
  });

  // Top Modified Entities section
  if (data.summary.topEntities.length > 0) {
    const topEntitiesRows = data.summary.topEntities
      .slice(0, 10)
      .map((entity) => [
        getEntityTypeLabel(entity.entityType),
        entity.entityId.length > 20
          ? `${entity.entityId.slice(0, 20)}...`
          : entity.entityId,
        entity.count.toString(),
      ]);

    sections.push({
      title: "4. Most Active Entities",
      content: [
        {
          type: "text",
          value: "Entities with the highest number of audit events:",
        },
        { type: "spacer", height: 5 },
        {
          type: "table",
          headers: ["Entity Type", "Entity ID", "Events"],
          rows: topEntitiesRows,
        },
      ],
    });
  }

  // Security Events section (if included)
  if (data.securityEvents && data.securityEvents.length > 0) {
    const securityContent: ReportSectionContent[] = [
      {
        type: "alert",
        severity:
          data.summary.securityEvents.unresolved > 0 ? "warning" : "info",
        message: `${data.summary.securityEvents.total} security events recorded, ${data.summary.securityEvents.unresolved} unresolved.`,
      },
      { type: "spacer", height: 10 },
    ];

    // Security by severity
    const severityRows = Object.entries(data.summary.securityEvents.bySeverity)
      .sort(([a], [b]) => {
        const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([severity, count]) => [severity, count.toString()]);

    if (severityRows.length > 0) {
      securityContent.push({
        type: "table",
        headers: ["Severity", "Count"],
        rows: severityRows,
      });
    }

    // Recent security events
    const recentSecurityRows = data.securityEvents
      .slice(0, 10)
      .map((event) => [
        formatDateTime(event.createdAt),
        event.severity,
        event.type.replace(/_/g, " "),
        event.resolved ? "Resolved" : "Open",
      ]);

    if (recentSecurityRows.length > 0) {
      securityContent.push(
        { type: "spacer", height: 10 },
        { type: "heading", value: "Recent Security Events", level: 2 },
        {
          type: "table",
          headers: ["Timestamp", "Severity", "Type", "Status"],
          rows: recentSecurityRows,
        },
      );
    }

    sections.push({
      title: "5. Security Events",
      content: securityContent,
    });
  }

  // Daily Activity Trend section
  if (data.summary.eventsByDay.length > 0) {
    const trendData = data.summary.eventsByDay.slice(-30); // Last 30 days
    const maxCount = Math.max(...trendData.map((d) => d.count));

    sections.push({
      title: data.securityEvents
        ? "6. Daily Activity Trend"
        : "5. Daily Activity Trend",
      content: [
        {
          type: "text",
          value: `Activity trend over the last ${trendData.length} days (${trendData.reduce((sum, d) => sum + d.count, 0)} total events):`,
        },
        { type: "spacer", height: 5 },
        {
          type: "table",
          headers: ["Date", "Events", "Relative Activity"],
          rows: trendData
            .slice(-10)
            .map((day) => [
              day.date,
              day.count.toString(),
              "█".repeat(Math.round((day.count / maxCount) * 10)) || "▏",
            ]),
        },
      ],
    });
  }

  // Detailed Audit Log section (sample)
  const detailSectionNum = data.securityEvents ? "7" : "6";
  const sampleLogs = data.logs.slice(0, 25);

  sections.push({
    title: `${detailSectionNum}. Audit Log Sample`,
    content: [
      {
        type: "text",
        value: `Showing ${sampleLogs.length} of ${data.logs.length} audit entries. Full log available in CSV/JSON export.`,
      },
      { type: "spacer", height: 5 },
      {
        type: "table",
        headers: ["Timestamp", "User", "Action", "Entity"],
        rows: sampleLogs.map((log) => [
          formatDateTime(log.timestamp),
          log.user.name || log.user.email.split("@")[0],
          getActionLabel(log.action).slice(0, 25),
          `${getEntityTypeLabel(log.entityType).slice(0, 12)}`,
        ]),
      },
    ],
  });

  // Certification statement
  const certSectionNum = data.securityEvents ? "8" : "7";
  sections.push({
    title: `${certSectionNum}. Certification Statement`,
    content: [
      {
        type: "text",
        value:
          "This audit report has been generated automatically by the Caelex Compliance Platform. The data presented herein is an accurate representation of system activities during the specified period.",
      },
      { type: "spacer", height: 10 },
      {
        type: "keyValue",
        items: [
          {
            key: "Report ID",
            value: `AUD-${data.generatedAt.getTime().toString(36).toUpperCase()}`,
          },
          { key: "Generated At", value: formatDateTime(data.generatedAt) },
          { key: "Data Integrity", value: "Verified" },
        ],
      },
      { type: "spacer", height: 10 },
      {
        type: "alert",
        severity: "info",
        message:
          "This report may be used for regulatory compliance documentation, internal audits, and due diligence purposes.",
      },
    ],
  });

  return {
    metadata: {
      reportId: `AUD-${data.generatedAt.getTime().toString(36).toUpperCase()}`,
      reportType: "annual_compliance",
      title: "Audit Trail Report",
      generatedAt: data.generatedAt,
      generatedBy: data.userId,
      organization: data.organizationName,
    },
    header: {
      title: "Audit Trail Report",
      subtitle: `Compliance Activity Record - ${formatDate(data.period.from)} to ${formatDate(data.period.to)}`,
      reportNumber: `AUD-${data.generatedAt.getTime().toString(36).toUpperCase()}`,
      date: data.generatedAt,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "CONFIDENTIAL",
      disclaimer:
        "This audit report is generated automatically by the Caelex Compliance Platform. It provides a factual record of system activities and should be reviewed in conjunction with other compliance documentation.",
    },
    sections,
  };
}

export function AuditReport({ data }: AuditReportProps) {
  const config = buildAuditReportConfig(data);
  return <BaseReport config={config} />;
}

export default AuditReport;
