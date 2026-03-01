"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import ScenarioAnalysisCard from "@/components/assure/ScenarioAnalysisCard";

// ─── Types ───

interface Scenario {
  id: string;
  name: string;
  description: string;
  financialImpact: {
    bestCase: number;
    mostLikely: number;
    worstCase: number;
  };
  timeToRecover: string;
  mitigationEffectiveness: number;
  triggeredRisks: number;
}

// ─── Default Scenarios ───

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "regulatory-delay",
    name: "Regulatory Authorization Delay",
    description:
      "Major authorization process delayed by 12+ months due to regulatory backlog or additional requirements.",
    financialImpact: {
      bestCase: 500000,
      mostLikely: 2000000,
      worstCase: 5000000,
    },
    timeToRecover: "12-18 months",
    mitigationEffectiveness: 0,
    triggeredRisks: 0,
  },
  {
    id: "market-downturn",
    name: "Space Market Downturn",
    description:
      "Significant reduction in space industry investment and customer spending over 2-3 quarters.",
    financialImpact: {
      bestCase: 1000000,
      mostLikely: 3000000,
      worstCase: 8000000,
    },
    timeToRecover: "6-12 months",
    mitigationEffectiveness: 0,
    triggeredRisks: 0,
  },
  {
    id: "key-person-departure",
    name: "Key Person Departure",
    description:
      "Loss of a critical founder or technical lead, impacting execution and investor confidence.",
    financialImpact: {
      bestCase: 200000,
      mostLikely: 1000000,
      worstCase: 3000000,
    },
    timeToRecover: "3-6 months",
    mitigationEffectiveness: 0,
    triggeredRisks: 0,
  },
  {
    id: "launch-failure",
    name: "Launch or Deployment Failure",
    description:
      "Primary payload fails during launch or deployment, requiring replacement and insurance claims.",
    financialImpact: {
      bestCase: 5000000,
      mostLikely: 15000000,
      worstCase: 50000000,
    },
    timeToRecover: "18-24 months",
    mitigationEffectiveness: 0,
    triggeredRisks: 0,
  },
  {
    id: "cyber-incident",
    name: "Cybersecurity Incident",
    description:
      "Critical security breach affecting ground or space systems, requiring incident response and remediation.",
    financialImpact: {
      bestCase: 300000,
      mostLikely: 2000000,
      worstCase: 10000000,
    },
    timeToRecover: "3-9 months",
    mitigationEffectiveness: 0,
    triggeredRisks: 0,
  },
];

// ─── Component ───

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScenarios() {
      try {
        const res = await fetch("/api/assure/risks/scenarios");
        if (res.ok) {
          const data = await res.json();
          if (data.scenarios && data.scenarios.length > 0) {
            setScenarios(data.scenarios);
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    fetchScenarios();
  }, []);

  const handleRunScenario = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch(`/api/assure/risks/scenarios/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
      });
      if (res.ok) {
        const result = await res.json();
        setScenarios((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  mitigationEffectiveness:
                    result.mitigationEffectiveness ?? s.mitigationEffectiveness,
                  triggeredRisks: result.triggeredRisks ?? s.triggeredRisks,
                  financialImpact: result.financialImpact ?? s.financialImpact,
                  timeToRecover: result.timeToRecover ?? s.timeToRecover,
                }
              : s,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to run scenario:", err);
    } finally {
      setRunningId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status">
        <div className="h-10 bg-white/5 rounded-lg w-1/3" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-48 bg-white/5 rounded-xl" />
          ))}
        </div>
        <span className="sr-only">Loading scenarios...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-display font-bold text-white mb-2"
        >
          Scenario Analysis
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body-lg text-white/40"
        >
          Stress-test your risk posture against common scenarios. Run each
          scenario to see its impact on your risk register and IRS score.
        </motion.p>
      </div>

      {/* Scenarios */}
      <div className="space-y-5">
        {scenarios.map((scenario, index) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <ScenarioAnalysisCard
              scenario={scenario}
              triggeredRisks={scenario.triggeredRisks}
            />
          </motion.div>
        ))}
      </div>

      {scenarios.length === 0 && (
        <div className="text-center py-16">
          <AlertTriangle size={32} className="text-white/15 mx-auto mb-4" />
          <h3 className="text-heading font-semibold text-white mb-2">
            No Scenarios Available
          </h3>
          <p className="text-body text-white/40">
            Scenarios will be available once you have risks in your register.
          </p>
        </div>
      )}
    </div>
  );
}
