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
} from "@/lib/astra/types";
import { MockAstraEngine } from "@/lib/astra/engine";

interface AstraContextType {
  isOpen: boolean;
  messages: AstraMessage[];
  context: AstraContext | null;
  missionData: AstraMissionData;
  isTyping: boolean;
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
}

const AstraCtx = createContext<AstraContextType | null>(null);

export function AstraProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AstraMessage[]>([]);
  const [context, setContext] = useState<AstraContext | null>(null);
  const [missionData, setMissionData] = useState<AstraMissionData>({});
  const [isTyping, setIsTyping] = useState(false);
  const engineRef = useRef(new MockAstraEngine());

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
        context.articleId === articleId
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
      const greeting = engineRef.current.getGreeting(ctx);
      setMessages([greeting]);
      setMissionData({});
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
      const greeting = engineRef.current.getGreeting(ctx);
      setMessages([greeting]);
      setMissionData({});
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
    const greeting = engineRef.current.getGreeting(ctx);
    setMessages([greeting]);
    setMissionData({});
    setIsOpen(true);
  }, [messages.length]);

  const close = useCallback(() => {
    setIsOpen(false);
    // History is preserved — user can re-open to continue
  }, []);

  const resetChat = useCallback(() => {
    const ctx: AstraContext = { mode: "general" };
    setContext(ctx);
    const greeting = engineRef.current.getGreeting(ctx);
    setMessages([greeting]);
    setMissionData({});
    setIsTyping(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!context || !text.trim() || isTyping) return;

      const userMsg: AstraMessage = {
        id: crypto.randomUUID(),
        role: "user",
        type: "text",
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const responses = await engineRef.current.processMessage(
          text.trim(),
          context,
          missionData,
        );
        setMessages((prev) => [...prev, ...responses]);
      } finally {
        setIsTyping(false);
      }
    },
    [context, missionData, isTyping],
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
        openWithArticle,
        openWithCategory,
        openGeneral,
        close,
        sendMessage,
        resetChat,
        updateMissionData,
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
