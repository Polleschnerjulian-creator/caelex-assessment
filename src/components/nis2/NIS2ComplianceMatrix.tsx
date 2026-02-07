"use client";

import { motion } from "framer-motion";
import { Grid3X3, CheckCircle2, Circle, MinusCircle } from "lucide-react";

interface NIS2ComplianceMatrixProps {
  penalties: {
    essential: string;
    important: string;
    applicable: string;
  };
  registrationRequired: boolean;
  registrationDeadline: string;
  keyDates: { date: string; description: string }[];
  supervisoryAuthority: string;
  supervisoryAuthorityNote: string;
}

export default function NIS2ComplianceMatrix({
  penalties,
  registrationRequired,
  registrationDeadline,
  keyDates,
  supervisoryAuthority,
  supervisoryAuthorityNote,
}: NIS2ComplianceMatrixProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Grid3X3 className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">
          Compliance Overview
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Penalties */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider">
            Penalty Exposure
          </h4>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="text-lg font-mono font-bold text-red-400 mb-1">
              {penalties.applicable}
            </div>
            <div className="text-xs text-red-400/60">
              Maximum administrative fine
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-xs text-white/40 mb-1">Essential</div>
              <div className="text-sm font-mono text-white">
                {penalties.essential}
              </div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-xs text-white/40 mb-1">Important</div>
              <div className="text-sm font-mono text-white">
                {penalties.important}
              </div>
            </div>
          </div>
        </div>

        {/* Registration & Authority */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider">
            Registration & Supervision
          </h4>

          {/* Registration */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {registrationRequired ? (
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              ) : (
                <MinusCircle className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm text-white font-medium">
                Registration{" "}
                {registrationRequired ? "Required" : "Not Required"}
              </span>
            </div>
            {registrationRequired && (
              <p className="text-xs text-white/40">
                Deadline: {registrationDeadline}
              </p>
            )}
          </div>

          {/* Authority */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <div className="text-xs text-white/40 mb-1">
              Supervisory Authority
            </div>
            <div className="text-sm text-white font-medium mb-1">
              {supervisoryAuthority}
            </div>
            <p className="text-xs text-white/50">{supervisoryAuthorityNote}</p>
          </div>
        </div>
      </div>

      {/* Key Dates */}
      {keyDates.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
            Key Dates
          </h4>
          <div className="space-y-2">
            {keyDates.map((date, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg"
              >
                <Circle className="w-2 h-2 text-blue-400 fill-blue-400 flex-shrink-0" />
                <span className="font-mono text-sm text-blue-400 w-28 flex-shrink-0">
                  {date.date}
                </span>
                <span className="text-sm text-white/60">
                  {date.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
