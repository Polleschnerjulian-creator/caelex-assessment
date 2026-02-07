"use client";

import { motion } from "framer-motion";
import { Clock, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";

interface TimelineStep {
  deadline: string;
  description: string;
}

interface NIS2IncidentTimelineProps {
  timeline: {
    earlyWarning: TimelineStep;
    notification: TimelineStep;
    intermediateReport: TimelineStep;
    finalReport: TimelineStep;
  };
}

const steps = [
  {
    key: "earlyWarning",
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    dotColor: "bg-red-500",
  },
  {
    key: "notification",
    icon: Clock,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    dotColor: "bg-amber-500",
  },
  {
    key: "intermediateReport",
    icon: FileText,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    dotColor: "bg-blue-500",
  },
  {
    key: "finalReport",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    dotColor: "bg-green-500",
  },
];

export default function NIS2IncidentTimeline({
  timeline,
}: NIS2IncidentTimelineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-1">
        Incident Reporting Timeline
      </h3>
      <p className="text-sm text-white/40 mb-6">
        NIS2 Art. 23 — Mandatory reporting for significant incidents
      </p>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-white/[0.1]" />

        <div className="space-y-4">
          {steps.map((step, index) => {
            const timelineData = timeline[step.key as keyof typeof timeline];
            const IconComponent = step.icon;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                className="relative flex items-start gap-4 pl-0"
              >
                {/* Dot on timeline */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-xl ${step.bgColor} border ${step.borderColor} flex items-center justify-center`}
                  >
                    <IconComponent className={`w-5 h-5 ${step.color}`} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-sm font-semibold ${step.color}`}>
                      {timelineData.deadline}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {timelineData.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
