"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Article } from "@/lib/types";
import {
  COMPLIANCE_TYPE_MAP,
  COMPLIANCE_CATEGORY_DISPLAY,
} from "@/data/modules";
import Card from "@/components/ui/Card";

interface ArticleBreakdownProps {
  articles: Article[];
}

export default function ArticleBreakdown({ articles }: ArticleBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayArticles = isExpanded ? articles : articles.slice(0, 5);

  // Group by compliance category
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
        <h3 className="text-xl font-semibold text-white">
          Applicable Articles
        </h3>
        <div className="text-sm text-slate-500">{articles.length} articles</div>
      </div>

      {/* Category summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categoryOrder.map((category) => {
          const count = groupedArticles[category]?.length || 0;
          if (count === 0) return null;

          const display = COMPLIANCE_CATEGORY_DISPLAY[category];
          return (
            <div
              key={category}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${display.bgColor} ${display.color} border ${display.borderColor}`}
            >
              {display.label}: {count}
            </div>
          );
        })}
      </div>

      <Card variant="default" padding="none">
        {/* Article list */}
        <div className="divide-y divide-navy-700">
          <AnimatePresence mode="wait">
            {displayArticles.map((article, index) => {
              const normalized =
                COMPLIANCE_TYPE_MAP[article.compliance_type] || "informational";
              const display = COMPLIANCE_CATEGORY_DISPLAY[normalized];

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
                      <span className="font-mono text-sm font-semibold text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                        Art. {article.number}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-white font-medium text-sm">
                          {article.title}
                        </h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${display.bgColor} ${display.color}`}
                        >
                          {display.label}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                      {article.operator_action &&
                        article.operator_action !== "none" && (
                          <p className="text-slate-500 text-xs mt-2 italic">
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
            className="w-full px-4 py-3 bg-navy-900/50 border-t border-navy-700 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
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
      </Card>

      {/* EUR-Lex link */}
      <div className="mt-4 text-center">
        <a
          href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-400 transition-colors"
        >
          View full regulation on EUR-Lex
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}
