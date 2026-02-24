"use client";

import { motion } from "framer-motion";

// ─── Types ───

interface PeerBenchmarkData {
  count: number;
  meanScore: number;
  medianScore: number;
  p25Score: number;
  p75Score: number;
  gradeDistribution: Record<string, number>;
}

interface PeerBenchmarkChartProps {
  benchmark: PeerBenchmarkData;
  orgScore: number;
  orgGrade: string;
}

// ─── Grade Color Mapping (for bar chart) ───

function getGradeBarColor(grade: string): string {
  const g = grade.toUpperCase().replace(/[+-]/g, "");

  if (g === "AAA" || g === "AA") return "#10B981"; // emerald-500
  if (g === "A") return "#34D399"; // emerald-400
  if (g === "BBB") return "#F59E0B"; // amber-500
  if (g === "BB") return "#FBBF24"; // amber-400
  if (g === "B") return "#F97316"; // orange-500
  if (g === "CCC") return "#EF4444"; // red-500
  if (g === "CC") return "#DC2626"; // red-600
  if (g === "D") return "#991B1B"; // red-800

  return "#94A3B8"; // slate-400
}

// ─── Ordered Grades ───

const GRADE_ORDER = [
  "AAA",
  "AA+",
  "AA",
  "AA-",
  "A+",
  "A",
  "A-",
  "BBB+",
  "BBB",
  "BBB-",
  "BB+",
  "BB",
  "BB-",
  "B+",
  "B",
  "B-",
  "CCC+",
  "CCC",
  "CCC-",
  "CC",
  "D",
];

// ─── Component ───

export default function PeerBenchmarkChart({
  benchmark,
  orgScore,
  orgGrade,
}: PeerBenchmarkChartProps) {
  const {
    count,
    meanScore,
    medianScore,
    p25Score,
    p75Score,
    gradeDistribution,
  } = benchmark;

  // ─── Position Chart ───
  // Horizontal bar showing p25/median/p75 range with org's position

  const chartWidth = 600;
  const chartHeight = 80;
  const padding = { left: 40, right: 40, top: 16, bottom: 16 };
  const innerWidth = chartWidth - padding.left - padding.right;

  const minVal = 0;
  const maxVal = 100;
  const scale = (val: number) =>
    padding.left + ((val - minVal) / (maxVal - minVal)) * innerWidth;

  const p25X = scale(p25Score);
  const p75X = scale(p75Score);
  const medianX = scale(medianScore);
  const meanX = scale(meanScore);
  const orgX = scale(orgScore);
  const midY = chartHeight / 2;

  // ─── Grade Distribution Chart ───

  const orderedGrades = GRADE_ORDER.filter(
    (g) => gradeDistribution[g] !== undefined && gradeDistribution[g] > 0,
  );
  const maxCount = Math.max(...Object.values(gradeDistribution), 1);
  const barChartHeight = 140;
  const barAreaHeight = barChartHeight - 32; // leave room for labels
  const barWidth =
    orderedGrades.length > 0
      ? Math.min(
          36,
          (innerWidth - orderedGrades.length * 4) / orderedGrades.length,
        )
      : 36;
  const totalBarsWidth = orderedGrades.length * (barWidth + 4) - 4;
  const barStartX = padding.left + (innerWidth - totalBarsWidth) / 2;

  return (
    <div className="space-y-6">
      {/* ─── Peer Position Chart ─── */}
      <div>
        <h3 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45 mb-3">
          Score Position vs. Peers
        </h3>

        <svg
          width="100%"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="overflow-visible"
          role="img"
          aria-label={`Your score ${orgScore} compared to peer range ${p25Score}-${p75Score}`}
        >
          {/* Background track */}
          <line
            x1={padding.left}
            y1={midY}
            x2={chartWidth - padding.right}
            y2={midY}
            stroke="currentColor"
            strokeWidth={2}
            className="text-slate-200 dark:text-white/10"
          />

          {/* P25-P75 range box */}
          <motion.rect
            x={p25X}
            y={midY - 14}
            width={p75X - p25X}
            height={28}
            rx={4}
            className="fill-slate-100 dark:fill-white/10"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ transformOrigin: `${p25X}px ${midY}px` }}
          />

          {/* Median line */}
          <motion.line
            x1={medianX}
            y1={midY - 14}
            x2={medianX}
            y2={midY + 14}
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="4 2"
            className="text-slate-400 dark:text-white/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          />

          {/* Mean marker */}
          <motion.line
            x1={meanX}
            y1={midY - 10}
            x2={meanX}
            y2={midY + 10}
            stroke="currentColor"
            strokeWidth={2}
            className="text-slate-500 dark:text-white/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          />

          {/* Org position dot */}
          <motion.circle
            cx={orgX}
            cy={midY}
            r={8}
            className="fill-emerald-500"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.7 }}
            filter="url(#org-glow)"
          />
          <motion.circle
            cx={orgX}
            cy={midY}
            r={4}
            className="fill-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.8 }}
          />

          {/* Org label */}
          <motion.text
            x={orgX}
            y={midY - 22}
            textAnchor="middle"
            className="fill-emerald-600 dark:fill-emerald-400"
            style={{ fontSize: 11, fontWeight: 600 }}
            initial={{ opacity: 0, y: midY - 16 }}
            animate={{ opacity: 1, y: midY - 22 }}
            transition={{ delay: 0.9 }}
          >
            You: {orgScore}
          </motion.text>

          {/* P25 label */}
          <text
            x={p25X}
            y={midY + 28}
            textAnchor="middle"
            className="fill-slate-400 dark:fill-white/30"
            style={{ fontSize: 10 }}
          >
            P25: {p25Score}
          </text>

          {/* Median label */}
          <text
            x={medianX}
            y={midY + 28}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-white/40"
            style={{ fontSize: 10 }}
          >
            Median: {medianScore}
          </text>

          {/* P75 label */}
          <text
            x={p75X}
            y={midY + 28}
            textAnchor="middle"
            className="fill-slate-400 dark:fill-white/30"
            style={{ fontSize: 10 }}
          >
            P75: {p75Score}
          </text>

          {/* Glow filter for org dot */}
          <defs>
            <filter id="org-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-3 text-small text-slate-500 dark:text-white/45">
          <span>
            Peer group:{" "}
            <span className="font-medium text-slate-700 dark:text-white/70">
              {count} organizations
            </span>
          </span>
          <span>
            Mean:{" "}
            <span className="font-medium text-slate-700 dark:text-white/70">
              {meanScore.toFixed(1)}
            </span>
          </span>
          <span>
            Your percentile:{" "}
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {orgScore >= medianScore ? "Above" : "Below"} median
            </span>
          </span>
        </div>
      </div>

      {/* ─── Grade Distribution Chart ─── */}
      {orderedGrades.length > 0 && (
        <div>
          <h3 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45 mb-3">
            Grade Distribution
          </h3>

          <svg
            width="100%"
            viewBox={`0 0 ${chartWidth} ${barChartHeight}`}
            className="overflow-visible"
            role="img"
            aria-label="Peer grade distribution chart"
          >
            {orderedGrades.map((grade, i) => {
              const gradeCount = gradeDistribution[grade] || 0;
              const barHeight = (gradeCount / maxCount) * barAreaHeight;
              const x = barStartX + i * (barWidth + 4);
              const y = barAreaHeight - barHeight;
              const isOrg = grade === orgGrade;
              const color = getGradeBarColor(grade);

              return (
                <g key={grade}>
                  {/* Bar */}
                  <motion.rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={3}
                    fill={color}
                    opacity={isOrg ? 1 : 0.6}
                    initial={{ height: 0, y: barAreaHeight }}
                    animate={{ height: barHeight, y }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.03 }}
                  />

                  {/* Org indicator */}
                  {isOrg && (
                    <motion.rect
                      x={x - 2}
                      y={y - 2}
                      width={barWidth + 4}
                      height={barHeight + 4}
                      rx={4}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth={2}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    />
                  )}

                  {/* Count label */}
                  {gradeCount > 0 && (
                    <motion.text
                      x={x + barWidth / 2}
                      y={y - 4}
                      textAnchor="middle"
                      className="fill-slate-500 dark:fill-white/40"
                      style={{ fontSize: 9, fontWeight: 500 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.03 }}
                    >
                      {gradeCount}
                    </motion.text>
                  )}

                  {/* Grade label */}
                  <text
                    x={x + barWidth / 2}
                    y={barAreaHeight + 14}
                    textAnchor="middle"
                    className={`${isOrg ? "fill-emerald-600 dark:fill-emerald-400" : "fill-slate-400 dark:fill-white/30"}`}
                    style={{
                      fontSize: 9,
                      fontWeight: isOrg ? 700 : 400,
                    }}
                  >
                    {grade}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
