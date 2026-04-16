"use client";

import { useState } from "react";
import {
  X,
  Search,
  ChevronDown,
  BarChart3,
  ClipboardCheck,
  FileText,
  BookOpen,
  Lightbulb,
  Building2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import {
  TOOL_CATEGORIES,
  ALL_TOOLS,
  TOOL_BY_NAME,
} from "@/lib/astra/tool-definitions";

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> =
  {
    compliance: { label: "Compliance Analysis", icon: <BarChart3 size={14} /> },
    assessment: { label: "Assessment", icon: <ClipboardCheck size={14} /> },
    document: { label: "Documents & Reports", icon: <FileText size={14} /> },
    knowledge: { label: "Knowledge Base", icon: <BookOpen size={14} /> },
    advisory: { label: "Advisory", icon: <Lightbulb size={14} /> },
    nca_portal: { label: "NCA Portal", icon: <Building2 size={14} /> },
    incident: {
      label: "Incident Management",
      icon: <AlertTriangle size={14} />,
    },
    digital_twin: { label: "Digital Twin", icon: <Layers size={14} /> },
  };

function humanizeToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AstraToolBrowserProps {
  onClose: () => void;
}

export default function AstraToolBrowser({ onClose }: AstraToolBrowserProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const lowerSearch = search.toLowerCase();

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredCategories = Object.entries(TOOL_CATEGORIES)
    .map(([cat, toolNames]) => {
      const tools = toolNames
        .map((name) => TOOL_BY_NAME[name])
        .filter(Boolean)
        .filter(
          (t) =>
            !search ||
            t.name.toLowerCase().includes(lowerSearch) ||
            t.description.toLowerCase().includes(lowerSearch),
        );
      return { cat, tools };
    })
    .filter((c) => c.tools.length > 0);

  return (
    <div className="w-[320px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 flex-shrink-0">
        <span className="text-body font-medium text-gray-700">
          Tools & Functions
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close tool browser"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full rounded-lg border border-gray-200 bg-[#F7F8FA] pl-8 pr-3 py-1.5 text-caption text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredCategories.map(({ cat, tools }) => {
          const meta = CATEGORY_META[cat];
          const isExpanded = expandedCategories[cat] || !!search;

          return (
            <div key={cat} className="mb-1">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-500">{meta?.icon}</span>
                <span className="text-caption font-medium text-gray-600 flex-1">
                  {meta?.label || cat}
                </span>
                <span className="text-micro text-gray-400 mr-1">
                  {tools.length}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && (
                <div className="px-2 pb-1">
                  {tools.map((tool) => {
                    const isToolExpanded = expandedTool === tool.name;
                    const params = tool.input_schema.properties;
                    const requiredParams = tool.input_schema.required || [];

                    return (
                      <div
                        key={tool.name}
                        className="mx-2 mb-1 rounded-lg border border-gray-100 bg-white"
                      >
                        <button
                          onClick={() =>
                            setExpandedTool(isToolExpanded ? null : tool.name)
                          }
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors rounded-lg"
                        >
                          <div className="text-caption font-medium text-gray-700">
                            {humanizeToolName(tool.name)}
                          </div>
                          <div className="text-micro text-gray-400 mt-0.5 line-clamp-2">
                            {tool.description}
                          </div>
                        </button>

                        {isToolExpanded && Object.keys(params).length > 0 && (
                          <div className="px-3 pb-2 pt-1 border-t border-gray-100">
                            <p className="text-[9px] text-gray-400 mb-1 uppercase tracking-wider font-medium">
                              Parameters
                            </p>
                            <div className="space-y-1">
                              {Object.entries(params).map(([key, schema]) => {
                                const s = schema as Record<string, unknown>;
                                const isRequired = requiredParams.includes(key);
                                return (
                                  <div key={key} className="flex gap-1.5">
                                    <span className="text-micro font-mono text-gray-700">
                                      {key}
                                      {isRequired && (
                                        <span className="text-red-500">*</span>
                                      )}
                                    </span>
                                    <span className="text-micro text-gray-400">
                                      {(s.type as string) || "object"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Total tools count */}
        <div className="px-4 py-3 text-micro text-gray-400 text-center">
          {ALL_TOOLS.length} tools available
        </div>
      </div>
    </div>
  );
}
