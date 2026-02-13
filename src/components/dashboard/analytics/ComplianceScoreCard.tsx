"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle,
} from "lucide-react";

interface ComplianceScoreCardProps {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  status: string;
  previousScore?: number;
  lastUpdated?: Date;
}

export function ComplianceScoreCard({
  score,
  grade,
  status,
  previousScore,
  lastUpdated,
}: ComplianceScoreCardProps) {
  const trend = previousScore !== undefined ? score - previousScore : 0;

  const getGradeColor = (g: string) => {
    switch (g) {
      case "A":
        return "text-green-400";
      case "B":
        return "text-emerald-400";
      case "C":
        return "text-yellow-400";
      case "D":
        return "text-orange-400";
      case "F":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "compliant":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "mostly_compliant":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "partial":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "non_compliant":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "compliant":
        return "Compliant";
      case "mostly_compliant":
        return "Mostly Compliant";
      case "partial":
        return "Partial Compliance";
      case "non_compliant":
        return "Non-Compliant";
      case "not_assessed":
        return "Not Assessed";
      default:
        return s;
    }
  };

  // Calculate stroke dash for circular progress
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Compliance Score</h2>
          <p className="text-sm text-slate-400">EU Space Act Compliance</p>
        </div>
        <div
          className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(status)}`}
        >
          {getStatusLabel(status)}
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Circular Progress */}
        <div className="relative">
          <svg width="200" height="200" className="-rotate-90">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-navy-700"
            />
            {/* Progress circle */}
            <motion.circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              className={
                score >= 80
                  ? "text-green-500"
                  : score >= 60
                    ? "text-yellow-500"
                    : "text-red-500"
              }
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          {/* Score in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-4xl font-bold text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {score}
            </motion.span>
            <span className="text-slate-400 text-sm">out of 100</span>
          </div>
        </div>

        {/* Score Details */}
        <div className="flex-1 space-y-4">
          {/* Grade */}
          <div className="flex items-center gap-3">
            <Award className={`w-8 h-8 ${getGradeColor(grade)}`} />
            <div>
              <span className={`text-3xl font-bold ${getGradeColor(grade)}`}>
                Grade {grade}
              </span>
              <p className="text-sm text-slate-400">Overall Rating</p>
            </div>
          </div>

          {/* Trend */}
          {previousScore !== undefined && (
            <div className="flex items-center gap-2">
              {trend > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : trend < 0 ? (
                <TrendingDown className="w-5 h-5 text-red-400" />
              ) : (
                <Minus className="w-5 h-5 text-slate-400" />
              )}
              <span
                className={
                  trend > 0
                    ? "text-green-400"
                    : trend < 0
                      ? "text-red-400"
                      : "text-slate-400"
                }
              >
                {trend > 0 ? "+" : ""}
                {trend} points
              </span>
              <span className="text-slate-500">vs previous period</span>
            </div>
          )}

          {/* Warning for low score */}
          {score < 60 && (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">
                Action required to improve compliance
              </span>
            </div>
          )}

          {/* Last updated */}
          {lastUpdated && (
            <p className="text-xs text-slate-500">
              Last calculated:{" "}
              {lastUpdated.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
