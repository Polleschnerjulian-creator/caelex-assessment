"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Article } from "@/lib/types";
import {
  COMPLIANCE_TYPE_MAP,
  COMPLIANCE_CATEGORY_DISPLAY,
} from "@/data/modules";

interface ArticleBreakdownProps {
  articles: Article[];
}

// Monochrome display styles for the new branding
const monoDisplay: Record<string, { label: string; opacity: string }> = {
  mandatory_pre_activity: { label: "Pre-Activity", opacity: "text-white" },
  mandatory_ongoing: { label: "Ongoing", opacity: "text-white/90" },
  design_technical: { label: "Technical", opacity: "text-white/80" },
  conditional_simplified: { label: "Conditional", opacity: "text-white/70" },
  informational: { label: "Info", opacity: "text-white/60" },
};

export default function ArticleBreakdown({ articles }: ArticleBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayArticles = isExpanded ? articles : articles.slice(0, 5);

  const groupedArticles = articles.reduce(
    (acc, article) => {
      const normalized =
        COMPLIANCE_TYPE_MAP[article.compliance_type] || "informational";
      if (!acc[normalized]) {
        acc[normalized] = [];
      }
      acc[normalized].push(article);
      return acc;
    },
    {} as Record<string, Article[]>,
  );

  const categoryOrder = [
    "mandatory_pre_activity",
    "mandatory_ongoing",
    "design_technical",
    "conditional_simplified",
    "informational",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
          Applicable Articles
        </span>
        <span className="font-mono text-[11px] text-white/50">
          {articles.length} articles
        </span>
      </div>

      {/* Category summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categoryOrder.map((category) => {
          const count = groupedArticles[category]?.length || 0;
          if (count === 0) return null;

          const display = monoDisplay[category];
          return (
            <div
              key={category}
              className={`px-3 py-1.5 rounded-full font-mono text-[11px] bg-white/[0.08] border border-white/[0.12] ${display.opacity}`}
            >
              {display.label}: {count}
            </div>
          );
        })}
      </div>

      <div className="bg-white/[0.05] border border-white/[0.12] rounded-xl overflow-hidden">
        {/* Article list */}
        <div className="divide-y divide-white/[0.08]">
          <AnimatePresence mode="wait">
            {displayArticles.map((article, index) => {
              const normalized =
                COMPLIANCE_TYPE_MAP[article.compliance_type] || "informational";
              const display = monoDisplay[normalized];

              return (
                <motion.div
                  key={`${article.number}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Article number */}
                    <div className="flex-shrink-0">
                      <span className="font-mono text-[11px] text-white/80 bg-white/[0.08] px-2 py-1 rounded">
                        Art. {article.number}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[14px] text-white font-medium">
                          {article.title}
                        </h4>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.08] flex-shrink-0 ${display.opacity}`}
                        >
                          {display.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-white/70 mt-1 line-clamp-2 leading-relaxed">
                        {article.summary}
                      </p>
                      {article.operator_action &&
                        article.operator_action !== "none" && (
                          <p className="text-[11px] text-white/60 mt-2 italic">
                            Action: {article.operator_action}
                          </p>
                        )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Expand/collapse */}
        {articles.length > 5 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-3 bg-white/[0.03] border-t border-white/[0.08] flex items-center justify-center gap-2 text-[13px] text-white/70 hover:text-white transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show all {articles.length} articles
              </>
            )}
          </button>
        )}
      </div>

      {/* EUR-Lex link */}
      <div className="mt-4 text-center">
        <a
          href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-white/60 hover:text-white transition-colors"
        >
          View full regulation on EUR-Lex
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </motion.div>
  );
}
