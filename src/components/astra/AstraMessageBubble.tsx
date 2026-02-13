"use client";

import {
  Zap,
  ExternalLink,
  ArrowRight,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  AstraMessage,
  ConfidenceLevel,
  AstraSource,
  AstraAction,
  ComplianceImpact,
} from "@/lib/astra/types";
import AstraDocumentCard from "./AstraDocumentCard";
import AstraInteractiveInput from "./AstraInteractiveInput";
import AstraBulkProgress from "./AstraBulkProgress";

interface AstraMessageBubbleProps {
  message: AstraMessage;
}

// ─── Markdown Renderer (simple) ───

function renderMarkdown(text: string): React.ReactNode {
  // Split into lines for processing
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let inList = false;
  let key = 0;

  const processInlineMarkdown = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let partKey = 0;

    // Process bold (**text**)
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(
            <span key={partKey++}>{remaining.slice(0, boldMatch.index)}</span>,
          );
        }
        parts.push(
          <strong key={partKey++} className="font-semibold text-white">
            {boldMatch[1]}
          </strong>,
        );
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      } else {
        // Check for inline code (`code`)
        const codeMatch = remaining.match(/`([^`]+)`/);
        if (codeMatch && codeMatch.index !== undefined) {
          if (codeMatch.index > 0) {
            parts.push(
              <span key={partKey++}>
                {remaining.slice(0, codeMatch.index)}
              </span>,
            );
          }
          parts.push(
            <code
              key={partKey++}
              className="px-1 py-0.5 rounded bg-white/10 text-cyan-300 text-[11px] font-mono"
            >
              {codeMatch[1]}
            </code>,
          );
          remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
        } else {
          parts.push(<span key={partKey++}>{remaining}</span>);
          break;
        }
      }
    }

    return parts;
  };

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-2 ml-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-white/70">
              {processInlineMarkdown(item)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Bullet list item
    if (
      trimmed.startsWith("• ") ||
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ")
    ) {
      inList = true;
      listItems.push(trimmed.slice(2));
      continue;
    }

    // Numbered list item
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      inList = true;
      listItems.push(numberedMatch[1]);
      continue;
    }

    // If we were in a list, flush it
    flushList();

    // Headers
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={key++} className="font-semibold text-white/90 mt-3 mb-1">
          {processInlineMarkdown(trimmed.slice(4))}
        </h4>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={key++} className="font-semibold text-white mt-3 mb-1.5">
          {processInlineMarkdown(trimmed.slice(3))}
        </h3>,
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={key++} className="font-bold text-white mt-3 mb-2">
          {processInlineMarkdown(trimmed.slice(2))}
        </h2>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="my-1">
        {processInlineMarkdown(trimmed)}
      </p>,
    );
  }

  // Flush any remaining list items
  flushList();

  return elements;
}

// ─── Confidence Badge ───

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const config = {
    HIGH: {
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      text: "text-green-400",
      icon: CheckCircle,
      label: "High Confidence",
    },
    MEDIUM: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      text: "text-amber-400",
      icon: Info,
      label: "Medium Confidence",
    },
    LOW: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-400",
      icon: AlertTriangle,
      label: "Low Confidence",
    },
  }[level];

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${config.bg} border ${config.border}`}
      title={config.label}
    >
      <Icon size={10} className={config.text} />
      <span className={`text-[9px] font-medium ${config.text}`}>{level}</span>
    </div>
  );
}

// ─── Source Badge ───

function SourceBadge({ source }: { source: AstraSource }) {
  const confidenceColor = {
    HIGH: "border-green-500/30 hover:bg-green-500/10",
    MEDIUM: "border-amber-500/30 hover:bg-amber-500/10",
    LOW: "border-red-500/30 hover:bg-red-500/10",
  }[source.confidence];

  return (
    <a
      href={source.url || "#"}
      target={source.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border ${confidenceColor} transition-colors cursor-pointer group`}
      title={`${source.regulation} ${source.article}${source.title ? ` - ${source.title}` : ""}`}
    >
      <span className="text-[10px] text-white/60 group-hover:text-white/80 transition-colors">
        {source.regulation}
      </span>
      <span className="text-[10px] font-medium text-cyan-400">
        {source.article}
      </span>
      {source.url && (
        <ExternalLink
          size={9}
          className="text-white/30 group-hover:text-white/50"
        />
      )}
    </a>
  );
}

// ─── Action Button ───

function ActionButton({
  action,
  onClick,
}: {
  action: AstraAction;
  onClick: () => void;
}) {
  const priorityStyles = {
    high: "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-400",
    medium:
      "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-white/70",
    low: "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] text-white/50",
  }[action.priority];

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${priorityStyles} transition-all text-[11px] font-medium`}
    >
      {action.label}
      <ArrowRight size={12} />
    </button>
  );
}

// ─── Compliance Impact Card ───

function ComplianceImpactCard({ impact }: { impact: ComplianceImpact }) {
  const scoreDiff = impact.projectedScore - impact.currentScore;
  const isImprovement = scoreDiff > 0;

  const riskColors = {
    low: "text-green-400",
    medium: "text-amber-400",
    high: "text-orange-400",
    critical: "text-red-400",
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={14} className="text-cyan-400" />
        <span className="text-[11px] font-medium text-white/80">
          Compliance Impact: {impact.module}
        </span>
        {impact.riskLevel && (
          <span
            className={`text-[9px] font-medium ${riskColors[impact.riskLevel]}`}
          >
            {impact.riskLevel.toUpperCase()} RISK
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">Current:</span>
          <span className="text-[12px] font-medium text-white">
            {impact.currentScore}%
          </span>
        </div>
        {scoreDiff !== 0 && (
          <>
            <ArrowRight size={12} className="text-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">Projected:</span>
              <span
                className={`text-[12px] font-medium ${isImprovement ? "text-green-400" : "text-amber-400"}`}
              >
                {impact.projectedScore}%
              </span>
              <span
                className={`text-[9px] ${isImprovement ? "text-green-400" : "text-amber-400"}`}
              >
                ({isImprovement ? "+" : ""}
                {scoreDiff}%)
              </span>
            </div>
          </>
        )}
      </div>

      {impact.affectedArticles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[9px] text-white/40">Affected:</span>
          {impact.affectedArticles.map((article, idx) => (
            <span
              key={idx}
              className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/60"
            >
              {article}
            </span>
          ))}
        </div>
      )}

      {impact.deadline && (
        <div className="mt-2 text-[9px] text-amber-400">
          Deadline: {new Date(impact.deadline).toLocaleDateString("de-DE")}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export default function AstraMessageBubble({
  message,
}: AstraMessageBubbleProps) {
  const router = useRouter();
  const isAstra = message.role === "astra";

  // Handle action clicks
  const handleActionClick = (action: AstraAction) => {
    if (action.type === "navigate" && action.target.startsWith("/")) {
      router.push(action.target);
    } else if (action.type === "generate") {
      // Could trigger document generation
      console.log("Generate action:", action.target);
    } else if (action.type === "api_call") {
      // Could make API call
      console.log("API action:", action.target);
    }
  };

  // Extract metadata
  const sources = message.metadata?.sources || [];
  const actions = message.metadata?.actions || [];
  const confidence = message.metadata?.confidence;
  const complianceImpact = message.metadata?.complianceImpact;

  return (
    <div
      className={`flex gap-2.5 ${isAstra ? "justify-start" : "justify-end"}`}
    >
      {/* ASTRA avatar */}
      {isAstra && (
        <div className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Zap size={13} className="text-cyan-400" />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={`max-w-[85%] ${
          isAstra
            ? "bg-white/[0.03] border border-white/[0.06] border-l-2 border-l-cyan-500/40 rounded-tr-xl rounded-br-xl rounded-bl-xl"
            : "bg-cyan-500/10 border border-cyan-500/20 rounded-tl-xl rounded-bl-xl rounded-br-xl"
        } ${message.type === "text" ? "px-3.5 py-2.5" : "px-3.5 pt-2.5 pb-1"}`}
      >
        {/* Confidence indicator (for ASTRA messages) */}
        {isAstra && confidence && (
          <div className="flex justify-end mb-1.5">
            <ConfidenceBadge level={confidence} />
          </div>
        )}

        {/* Text content with markdown rendering */}
        {message.content && (
          <div
            className={`text-[12px] leading-relaxed ${
              isAstra ? "text-white/80" : "text-cyan-100 whitespace-pre-wrap"
            }`}
          >
            {isAstra ? renderMarkdown(message.content) : message.content}
          </div>
        )}

        {/* Sources */}
        {isAstra && sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/[0.06]">
            <p className="text-[9px] text-white/30 mb-1.5">Sources:</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((source, idx) => (
                <SourceBadge key={idx} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* Compliance Impact */}
        {isAstra && complianceImpact && (
          <ComplianceImpactCard impact={complianceImpact} />
        )}

        {/* Actions */}
        {isAstra && actions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/[0.06]">
            <p className="text-[9px] text-white/30 mb-1.5">
              Suggested Actions:
            </p>
            <div className="flex flex-wrap gap-2">
              {actions.map((action, idx) => (
                <ActionButton
                  key={idx}
                  action={action}
                  onClick={() => handleActionClick(action)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Document Card */}
        {message.type === "document_card" && message.metadata?.documentMeta && (
          <AstraDocumentCard meta={message.metadata.documentMeta} />
        )}

        {/* Interactive Input */}
        {message.type === "interactive_input" &&
          message.metadata?.interactiveOptions &&
          message.metadata.interactiveField && (
            <AstraInteractiveInput
              field={message.metadata.interactiveField}
              options={message.metadata.interactiveOptions}
            />
          )}

        {/* Bulk Progress */}
        {message.type === "bulk_progress" && message.metadata?.bulkItems && (
          <AstraBulkProgress initialItems={message.metadata.bulkItems} />
        )}

        {/* Timestamp */}
        <p
          className={`text-[9px] mt-1.5 ${
            isAstra ? "text-white/20" : "text-cyan-400/30"
          }`}
        >
          {message.timestamp.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
