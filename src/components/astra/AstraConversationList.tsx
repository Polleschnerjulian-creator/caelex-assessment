"use client";

import { useEffect } from "react";
import { X, MessageSquare, Trash2, Plus, Loader2 } from "lucide-react";
import { useAstra } from "./AstraProvider";

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

interface AstraConversationListProps {
  onClose: () => void;
}

export default function AstraConversationList({
  onClose,
}: AstraConversationListProps) {
  const {
    conversations,
    conversationsLoading,
    conversationId: activeId,
    fetchConversations,
    loadConversation,
    deleteConversation,
    resetChat,
  } = useAstra();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <div className="w-[280px] flex-shrink-0 border-r border-white/10 bg-[#08080A] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-white/10 flex-shrink-0">
        <span className="text-body font-medium text-white/70">
          Conversations
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
          aria-label="Close conversation list"
        >
          <X size={14} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-2 border-b border-white/[0.06]">
        <button
          onClick={resetChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/[0.06] hover:bg-cyan-500/10 border border-cyan-500/15 text-cyan-400 text-small font-medium transition-colors"
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="text-white/20 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare size={20} className="text-white/10 mx-auto mb-2" />
            <p className="text-caption text-white/20">No conversations yet</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <div
                key={conv.id}
                className={`group mx-2 mb-0.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-cyan-500/[0.08] border border-cyan-500/15"
                    : "hover:bg-white/[0.02] border border-transparent"
                }`}
              >
                <button
                  onClick={() => loadConversation(conv.id)}
                  className="w-full text-left px-3 py-2.5"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-micro uppercase tracking-wider font-medium ${
                        isActive ? "text-cyan-400/70" : "text-white/25"
                      }`}
                    >
                      {conv.mode}
                    </span>
                    <span className="text-[9px] text-white/15">
                      {formatRelativeDate(conv.updatedAt)}
                    </span>
                  </div>
                  <p
                    className={`text-caption line-clamp-2 ${
                      isActive ? "text-white/70" : "text-white/45"
                    }`}
                  >
                    {conv.lastMessage || "Empty conversation"}
                  </p>
                  <span className="text-[9px] text-white/15 mt-0.5 block">
                    {conv.messageCount} messages
                  </span>
                </button>
                {/* Delete button (visible on hover) */}
                <div className="hidden group-hover:flex absolute right-2 top-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="p-1 rounded text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
