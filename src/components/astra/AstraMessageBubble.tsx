"use client";

import { Zap } from "lucide-react";
import type { AstraMessage } from "@/lib/astra/types";
import AstraDocumentCard from "./AstraDocumentCard";
import AstraInteractiveInput from "./AstraInteractiveInput";
import AstraBulkProgress from "./AstraBulkProgress";

interface AstraMessageBubbleProps {
  message: AstraMessage;
}

export default function AstraMessageBubble({
  message,
}: AstraMessageBubbleProps) {
  const isAstra = message.role === "astra";

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
        {/* Text content */}
        {message.content && (
          <div
            className={`text-[12px] leading-relaxed whitespace-pre-wrap ${
              isAstra ? "text-white/80" : "text-cyan-100"
            }`}
          >
            {message.content}
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
