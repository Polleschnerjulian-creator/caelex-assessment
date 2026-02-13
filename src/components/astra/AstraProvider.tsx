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

// ─── Context Type ───

interface AstraContextType {
  isOpen: boolean;
  messages: AstraMessage[];
  context: AstraContext | null;
  missionData: AstraMissionData;
  isTyping: boolean;
  conversationId: string | null;
  remainingQueries: number | null;
  error: string | null;
  openWithArticle: (
    articleId: string,
    articleRef: string,
    title: string,
    severity: string,
    regulationType: string,
  ) => void;
  openWithCategory: (
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
  openGeneral: () => void;
  close: () => void;
  sendMessage: (text: string) => void;
  resetChat: () => void;
  updateMissionData: (data: Partial<AstraMissionData>) => void;
  clearError: () => void;
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
    content = `Hello! I'm **ASTRA**, your AI compliance copilot for space regulations. I can help you with:\n\n• EU Space Act requirements (119 articles)\n• NIS2 cybersecurity obligations\n• National space laws (10 jurisdictions)\n• Your Caelex compliance status\n\nWhat would you like to know?`;
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
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AstraMessage[]>([]);
  const [context, setContext] = useState<AstraContext | null>(null);
  const [missionData, setMissionData] = useState<AstraMissionData>({});
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [remainingQueries, setRemainingQueries] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const openWithArticle = useCallback(
    (
      articleId: string,
      articleRef: string,
      title: string,
      severity: string,
      regulationType: string,
    ) => {
      // If same article is already loaded, just re-open
      if (
        context &&
        context.mode === "article" &&
        (context as AstraArticleContext).articleId === articleId
      ) {
        setIsOpen(true);
        return;
      }

      // Different article: new chat
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
      setIsOpen(true);
    },
    [context],
  );

  const openWithCategory = useCallback(
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
      setIsOpen(true);
    },
    [],
  );

  const openGeneral = useCallback(() => {
    // If messages exist, just re-open (preserve history)
    if (messages.length > 0) {
      setIsOpen(true);
      return;
    }

    const ctx: AstraContext = { mode: "general" };
    setContext(ctx);
    setMessages([createLocalGreeting(ctx)]);
    setMissionData({});
    setConversationId(null);
    setError(null);
    setIsOpen(true);
  }, [messages.length]);

  const close = useCallback(() => {
    setIsOpen(false);
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

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
        // Build request payload
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

        // Update conversation ID if this is a new conversation
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Update remaining queries
        if (data.remainingQueries !== undefined) {
          setRemainingQueries(data.remainingQueries);
        }

        // Add assistant message
        const assistantMsg = responseToMessage(
          data.response,
          data.conversationId,
        );
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled, don't show error
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(errorMessage);

        // Add error message to chat
        const errorMsg: AstraMessage = {
          id: crypto.randomUUID(),
          role: "astra",
          type: "text",
          content: `I encountered an issue: ${errorMessage}`,
          timestamp: new Date(),
          metadata: {
            confidence: "HIGH" as ConfidenceLevel,
          },
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

  return (
    <AstraCtx.Provider
      value={{
        isOpen,
        messages,
        context,
        missionData,
        isTyping,
        conversationId,
        remainingQueries,
        error,
        openWithArticle,
        openWithCategory,
        openGeneral,
        close,
        sendMessage,
        resetChat,
        updateMissionData,
        clearError,
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
