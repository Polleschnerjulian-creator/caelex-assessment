"use client";

import { ExternalLink } from "lucide-react";

interface Integration {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "available" | "coming-soon" | "beta";
  href?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    name: "Slack",
    description:
      "Get compliance alerts and deadline reminders in Slack channels",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
          fill="currentColor"
        />
      </svg>
    ),
    status: "coming-soon",
  },
  {
    name: "Microsoft Teams",
    description: "Receive notifications and compliance updates in Teams",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M20.625 8.5h-3.75c-.207 0-.375.168-.375.375v3.75c0 1.657 1.343 3 3 3s3-1.343 3-3v-2.25c0-.828-.672-1.875-1.875-1.875zM19.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14.25 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17.4 8.5H11.1c-.607 0-1.1.493-1.1 1.1v5.65c0 2.348 1.903 4.25 4.25 4.25s4.25-1.902 4.25-4.25V9.6c0-.607-.493-1.1-1.1-1.1zM8.125 10H5v5.5a3.5 3.5 0 0 0 5.95 2.507A5.727 5.727 0 0 1 9 14.25v-3.875c0-.145.012-.255.027-.375H8.125z"
          fill="currentColor"
        />
      </svg>
    ),
    status: "coming-soon",
  },
  {
    name: "Jira",
    description: "Auto-create compliance tasks and track remediation work",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.577 24V12.518a1.005 1.005 0 0 0-1.006-1.005z"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M17.786 5.218H6.214a5.185 5.185 0 0 0 5.215 5.232h2.13v2.04a5.2 5.2 0 0 0 5.232 5.215V6.223a1.005 1.005 0 0 0-1.005-1.005z"
          fill="currentColor"
          opacity="0.7"
        />
        <path
          d="M24 0H12.429a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.218 5.218 0 0 0 25.006 12.5V1.005A1.005 1.005 0 0 0 24 0z"
          fill="currentColor"
        />
      </svg>
    ),
    status: "coming-soon",
  },
  {
    name: "Zapier",
    description: "Connect Caelex to 5,000+ apps with custom automations",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M15.535 8.465l-1.415 1.414-2.12-2.121-2.122 2.121-1.414-1.414 2.121-2.122-2.121-2.12 1.414-1.415 2.122 2.121 2.12-2.121 1.415 1.414-2.121 2.121 2.121 2.122z"
          fill="currentColor"
        />
        <path
          d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"
          fill="currentColor"
        />
      </svg>
    ),
    status: "coming-soon",
  },
  {
    name: "GitHub",
    description: "Track compliance-as-code changes and policy updates",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    status: "coming-soon",
  },
  {
    name: "Webhooks",
    description: "Send real-time events to any URL endpoint",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
        <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
        <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8H12" />
      </svg>
    ),
    status: "available",
    href: "/dashboard/settings",
  },
];

export function IntegrationsCard() {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Connect Caelex with your existing tools to streamline compliance
          workflows. Receive alerts where your team already works, automate task
          creation, and keep everyone in sync.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.name}
            className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] hover:bg-white/60 dark:hover:bg-white/[0.05] transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center text-slate-600 dark:text-slate-400">
                {integration.icon}
              </div>
              {integration.status === "coming-soon" ? (
                <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500 border border-black/[0.04] dark:border-white/[0.06]">
                  Coming Soon
                </span>
              ) : integration.status === "beta" ? (
                <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20">
                  Beta
                </span>
              ) : (
                <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Available
                </span>
              )}
            </div>
            <h4 className="text-[13px] font-semibold text-slate-800 dark:text-white mb-1 flex items-center gap-1.5">
              {integration.name}
              {integration.href && (
                <ExternalLink size={11} className="text-slate-400" />
              )}
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              {integration.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
