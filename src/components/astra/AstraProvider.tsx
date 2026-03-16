"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type {
  AstraMessage,
  AstraContext,
  AstraArticleContext,
  AstraCategoryContext,
  AstraMissionData,
  AstraChatResponse,
  AstraResponse,
  ConfidenceLevel,
} from "@/lib/astra/types";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Conversation Summary ───

export interface ConversationSummary {
  id: string;
  mode: string;
  messageCount: number;
  lastMessage: string;
  updatedAt: string;
}

// ─── Context Type ───

interface AstraContextType {
  messages: AstraMessage[];
  context: AstraContext | null;
  missionData: AstraMissionData;
  isTyping: boolean;
  conversationId: string | null;
  remainingQueries: number | null;
  error: string | null;
  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  setArticleContext: (
    articleId: string,
    articleRef: string,
    title: string,
    severity: string,
    regulationType: string,
  ) => void;
  setCategoryContext: (
    category: string,
    categoryLabel: string,
    articles: Array<{
      id: string;
      articleRef: string;
      title: string;
      severity: string;
    }>,
    regulationType: string,
  ) => void;
  setGeneralContext: () => void;
  sendMessage: (text: string) => void;
  resetChat: () => void;
  updateMissionData: (data: Partial<AstraMissionData>) => void;
  clearError: () => void;
  fetchConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setConversationId: (id: string | null) => void;
}

const AstraCtx = createContext<AstraContextType | null>(null);

// ─── Helper: Convert API Response to Legacy Message Format ───

function responseToMessage(
  response: AstraResponse,
  conversationId: string,
): AstraMessage {
  return {
    id: `${conversationId}-${Date.now()}`,
    role: "astra",
    type: "text",
    content: response.message,
    timestamp: new Date(),
    metadata: {
      sources: response.sources,
      actions: response.actions,
      confidence: response.confidence,
      complianceImpact: response.complianceImpact,
      toolCalls: response.metadata?.toolCalls,
    },
  };
}

// ─── Helper: Create Local Greeting ───

function createLocalGreeting(ctx: AstraContext): AstraMessage {
  let content: string;

  if (ctx.mode === "article") {
    const articleCtx = ctx as AstraArticleContext;
    content = `I'm here to help you understand **${articleCtx.articleRef}** - ${articleCtx.title}. What would you like to know about this regulation?`;
  } else if (ctx.mode === "category") {
    const catCtx = ctx as AstraCategoryContext;
    content = `Let me help you navigate **${catCtx.categoryLabel}** which covers ${catCtx.articles.length} articles. What specific aspect interests you?`;
  } else {
    content = `Your AI compliance copilot. I have access to your compliance data, assessments, and regulatory frameworks.\n\nI can help with EU Space Act, NIS2, national space laws, and your organization's compliance status.`;
  }

  return {
    id: `greeting-${Date.now()}`,
    role: "astra",
    type: "text",
    content,
    timestamp: new Date(),
    metadata: {
      confidence: "HIGH" as ConfidenceLevel,
    },
  };
}

// ─── Provider Component ───

export function AstraProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<AstraMessage[]>([]);
  const [context, setContext] = useState<AstraContext | null>(null);
  const [missionData, setMissionData] = useState<AstraMissionData>({});
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [remainingQueries, setRemainingQueries] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  // Track abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setArticleContext = useCallback(
    (
      articleId: string,
      articleRef: string,
      title: string,
      severity: string,
      regulationType: string,
    ) => {
      // If same article is already loaded, keep messages
      if (
        context &&
        context.mode === "article" &&
        (context as AstraArticleContext).articleId === articleId
      ) {
        return;
      }

      const ctx: AstraArticleContext = {
        mode: "article",
        articleId,
        articleRef,
        title,
        severity,
        regulationType,
      };
      setContext(ctx);
      setMessages([createLocalGreeting(ctx)]);
      setMissionData({});
      setConversationId(null);
      setError(null);
    },
    [context],
  );

  const setCategoryContext = useCallback(
    (
      category: string,
      categoryLabel: string,
      articles: Array<{
        id: string;
        articleRef: string;
        title: string;
        severity: string;
      }>,
      regulationType: string,
    ) => {
      const ctx: AstraCategoryContext = {
        mode: "category",
        category,
        categoryLabel,
        articles,
        regulationType,
      };
      setContext(ctx);
      setMessages([createLocalGreeting(ctx)]);
      setMissionData({});
      setConversationId(null);
      setError(null);
    },
    [],
  );

  const setGeneralContext = useCallback(() => {
    // If messages exist and we're already in general mode, preserve them
    if (messages.length > 0 && context?.mode === "general") {
      return;
    }

    const ctx: AstraContext = { mode: "general" };
    setContext(ctx);
    setMessages([createLocalGreeting(ctx)]);
    setMissionData({});
    setConversationId(null);
    setError(null);
  }, [messages.length, context?.mode]);

  const resetChat = useCallback(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const ctx: AstraContext = { mode: "general" };
    setContext(ctx);
    setMessages([createLocalGreeting(ctx)]);
    setMissionData({});
    setConversationId(null);
    setIsTyping(false);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!context || !text.trim() || isTyping) return;

      // Add user message immediately
      const userMsg: AstraMessage = {
        id: crypto.randomUUID(),
        role: "user",
        type: "text",
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setError(null);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const payload = {
          message: text.trim(),
          conversationId: conversationId || undefined,
          context: {
            articleId:
              context.mode === "article"
                ? (context as AstraArticleContext).articleId
                : undefined,
            moduleId:
              context.mode === "module"
                ? (context as { mode: "module"; moduleId: string }).moduleId
                : undefined,
            mode: context.mode === "general" ? undefined : context.mode,
          },
          missionData:
            Object.keys(missionData).length > 0 ? missionData : undefined,
        };

        const response = await fetch("/api/astra/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...csrfHeaders(),
          },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 429) {
            throw new Error(
              errorData.message ||
                "Rate limit exceeded. Please try again later.",
            );
          } else if (response.status === 401) {
            throw new Error("Please log in to use ASTRA.");
          } else if (response.status === 403) {
            throw new Error(
              errorData.message ||
                "You need an active organization to use ASTRA.",
            );
          } else {
            throw new Error(
              errorData.message || "An error occurred. Please try again.",
            );
          }
        }

        const data: AstraChatResponse = await response.json();

        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        if (data.remainingQueries !== undefined) {
          setRemainingQueries(data.remainingQueries);
        }

        const assistantMsg = responseToMessage(
          data.response,
          data.conversationId,
        );
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(errorMessage);

        const errorMsg: AstraMessage = {
          id: crypto.randomUUID(),
          role: "astra",
          type: "text",
          content: `I encountered an issue: ${errorMessage}`,
          timestamp: new Date(),
          metadata: { confidence: "HIGH" as ConfidenceLevel },
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
        abortControllerRef.current = null;
      }
    },
    [context, missionData, isTyping, conversationId],
  );

  const updateMissionData = useCallback((data: Partial<AstraMissionData>) => {
    setMissionData((prev) => ({ ...prev, ...data }));
  }, []);

  // ─── Conversation Management ───

  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const res = await fetch("/api/astra/chat?list=true");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // Silently fail
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/astra/chat?conversationId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const conv = data.conversation;

      // Map API messages to AstraMessage format
      const mapped: AstraMessage[] = (conv.messages || []).map(
        (m: {
          id: string;
          role: string;
          content: string;
          sources?: unknown;
          confidence?: ConfidenceLevel;
          createdAt: string;
        }) => ({
          id: m.id,
          role: m.role === "user" ? "user" : "astra",
          type: "text" as const,
          content: m.content,
          timestamp: new Date(m.createdAt),
          metadata: {
            sources: m.sources || undefined,
            confidence: m.confidence || undefined,
          },
        }),
      );

      setMessages(mapped);
      setConversationId(id);
      setContext({ mode: "general" });
      setError(null);
    } catch {
      setError("Failed to load conversation.");
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/astra/chat?conversationId=${id}`, {
          method: "DELETE",
          headers: csrfHeaders(),
        });
        if (!res.ok) return;
        setConversations((prev) => prev.filter((c) => c.id !== id));
        // If we deleted the active conversation, reset
        if (conversationId === id) {
          resetChat();
        }
      } catch {
        // Silently fail
      }
    },
    [conversationId, resetChat],
  );

  return (
    <AstraCtx.Provider
      value={{
        messages,
        context,
        missionData,
        isTyping,
        conversationId,
        remainingQueries,
        error,
        conversations,
        conversationsLoading,
        setArticleContext,
        setCategoryContext,
        setGeneralContext,
        sendMessage,
        resetChat,
        updateMissionData,
        clearError,
        fetchConversations,
        loadConversation,
        deleteConversation,
        setConversationId,
      }}
    >
      {children}
    </AstraCtx.Provider>
  );
}

export function useAstra(): AstraContextType {
  const ctx = useContext(AstraCtx);
  if (!ctx) {
    throw new Error("useAstra must be used within an AstraProvider");
  }
  return ctx;
}
