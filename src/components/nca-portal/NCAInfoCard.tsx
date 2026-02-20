"use client";

import { Globe, Mail, Building2 } from "lucide-react";

interface NCAInfoCardProps {
  authority: string;
  name: string;
  country: string;
  portalUrl?: string;
  email?: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  Germany: "🇩🇪",
  France: "🇫🇷",
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  Netherlands: "🇳🇱",
  Belgium: "🇧🇪",
  Austria: "🇦🇹",
  Poland: "🇵🇱",
  Sweden: "🇸🇪",
  Denmark: "🇩🇰",
  Finland: "🇫🇮",
  Portugal: "🇵🇹",
  Ireland: "🇮🇪",
  Luxembourg: "🇱🇺",
  "Czech Republic": "🇨🇿",
  Romania: "🇷🇴",
  Greece: "🇬🇷",
  EU: "🇪🇺",
};

export default function NCAInfoCard({
  name,
  country,
  portalUrl,
  email,
  description,
  selected,
  onClick,
}: NCAInfoCardProps) {
  const flag = COUNTRY_FLAGS[country] || "🏳️";

  return (
    <div
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
      className={`
        p-4 rounded-xl border transition-all duration-150
        ${onClick ? "cursor-pointer" : ""}
        ${
          selected
            ? "border-emerald-500 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] ring-1 ring-emerald-500/30"
            : "border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-dark-border"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{flag}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {name}
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {country}
          </p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-micro text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Globe size={10} aria-hidden="true" />
                Portal
              </a>
            )}
            {email && (
              <span className="flex items-center gap-1 text-micro text-slate-400">
                <Mail size={10} aria-hidden="true" />
                {email}
              </span>
            )}
            {!portalUrl && !email && (
              <span className="flex items-center gap-1 text-micro text-slate-400">
                <Building2 size={10} aria-hidden="true" />
                Contact via official channels
              </span>
            )}
          </div>
        </div>
        {selected && (
          <div
            className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3 text-white">
              <path
                d="M13.333 4L6 11.333 2.667 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
