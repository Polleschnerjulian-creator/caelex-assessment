"use client";

import { useState, useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type { JurisdictionLaw } from "@/lib/space-law-types";

// ─── Types ───

interface RegulatoryMapProps {
  onCountryClick: (countryCode: string) => void;
}

interface CountryPath {
  code: string;
  name: string;
  d: string;
  labelX: number;
  labelY: number;
}

type StatusCategory = "enacted" | "draft_pending" | "none" | "non_eu_esa";

// ─── Status Colors (light mode) ───

const STATUS_COLORS: Record<
  StatusCategory,
  {
    fill: string;
    fillOpacity: string;
    stroke: string;
    hoverFill: string;
    label: string;
  }
> = {
  enacted: {
    fill: "#10B981",
    fillOpacity: "0.25",
    stroke: "#059669",
    hoverFill: "rgba(16, 185, 129, 0.50)",
    label: "Enacted",
  },
  draft_pending: {
    fill: "#F59E0B",
    fillOpacity: "0.25",
    stroke: "#D97706",
    hoverFill: "rgba(245, 158, 11, 0.50)",
    label: "Draft / Pending",
  },
  none: {
    fill: "#EF4444",
    fillOpacity: "0.25",
    stroke: "#DC2626",
    hoverFill: "rgba(239, 68, 68, 0.50)",
    label: "No Legislation",
  },
  non_eu_esa: {
    fill: "#3B82F6",
    fillOpacity: "0.25",
    stroke: "#2563EB",
    hoverFill: "rgba(59, 130, 246, 0.50)",
    label: "Non-EU ESA Member",
  },
};

// ─── Non-EU ESA members ───

const NON_EU_ESA_CODES = new Set(["UK", "NO", "CH"]);

// ─── Resolve status category ───

function getStatusCategory(
  law: JurisdictionLaw | undefined,
  code: string,
): StatusCategory {
  if (NON_EU_ESA_CODES.has(code)) return "non_eu_esa";
  if (!law) return "none";
  const s = law.legislation.status;
  if (s === "enacted") return "enacted";
  if (s === "draft" || s === "pending") return "draft_pending";
  return "none";
}

// ─── Check if lastUpdated is within 30 days of today ───

function isRecentlyUpdated(lastUpdated: string): boolean {
  const [year, month] = lastUpdated.split("-").map(Number);
  const updateDate = new Date(year, month - 1, 1);
  const now = new Date();
  const diffMs = now.getTime() - updateDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 45;
}

// ─── Simplified European Country Paths ───

const COUNTRY_PATHS: CountryPath[] = [
  {
    code: "FR",
    name: "France",
    d: "M220,340 L240,310 L260,290 L300,280 L320,290 L340,310 L350,340 L340,370 L330,400 L310,420 L280,430 L250,420 L230,400 L210,380 L205,360 Z",
    labelX: 275,
    labelY: 360,
  },
  {
    code: "DE",
    name: "Germany",
    d: "M340,240 L360,225 L380,220 L400,225 L420,240 L425,260 L420,280 L410,300 L390,310 L370,310 L350,300 L340,280 L335,260 Z",
    labelX: 380,
    labelY: 270,
  },
  {
    code: "IT",
    name: "Italy",
    d: "M370,340 L385,330 L400,340 L410,360 L415,380 L420,400 L425,430 L420,460 L410,480 L395,490 L385,480 L380,460 L375,430 L370,400 L365,370 Z",
    labelX: 398,
    labelY: 410,
  },
  {
    code: "UK",
    name: "United Kingdom",
    d: "M195,200 L210,185 L225,180 L240,185 L250,200 L255,220 L250,240 L240,260 L225,270 L210,265 L200,250 L195,230 Z M215,170 L225,160 L240,165 L235,175 Z",
    labelX: 225,
    labelY: 225,
  },
  {
    code: "LU",
    name: "Luxembourg",
    d: "M310,275 L318,270 L326,275 L326,285 L318,290 L310,285 Z",
    labelX: 318,
    labelY: 280,
  },
  {
    code: "NL",
    name: "Netherlands",
    d: "M310,230 L325,220 L340,225 L345,238 L340,250 L325,255 L310,248 Z",
    labelX: 327,
    labelY: 238,
  },
  {
    code: "BE",
    name: "Belgium",
    d: "M290,260 L305,252 L322,255 L328,268 L322,278 L305,280 L290,273 Z",
    labelX: 308,
    labelY: 266,
  },
  {
    code: "ES",
    name: "Spain",
    d: "M150,400 L180,385 L210,380 L240,385 L260,400 L270,425 L265,450 L250,465 L220,470 L190,465 L165,450 L150,430 Z",
    labelX: 210,
    labelY: 430,
  },
  {
    code: "AT",
    name: "Austria",
    d: "M380,300 L400,295 L425,298 L445,305 L450,318 L440,328 L420,330 L400,328 L385,322 L378,312 Z",
    labelX: 415,
    labelY: 315,
  },
  {
    code: "PL",
    name: "Poland",
    d: "M430,210 L455,200 L480,205 L505,215 L515,235 L510,258 L495,272 L475,278 L455,275 L435,265 L425,245 L425,225 Z",
    labelX: 470,
    labelY: 242,
  },
  {
    code: "DK",
    name: "Denmark",
    d: "M350,180 L365,170 L380,172 L388,185 L385,198 L375,208 L360,210 L348,200 L345,190 Z",
    labelX: 367,
    labelY: 192,
  },
  {
    code: "NO",
    name: "Norway",
    d: "M340,80 L360,60 L380,50 L400,55 L410,70 L405,95 L395,120 L385,145 L370,160 L355,168 L340,160 L335,140 L330,115 L335,95 Z",
    labelX: 370,
    labelY: 110,
  },
  {
    code: "SE",
    name: "Sweden",
    d: "M405,70 L420,60 L440,65 L450,80 L455,105 L450,130 L445,155 L435,175 L420,190 L405,185 L395,170 L390,145 L395,120 L400,95 Z",
    labelX: 425,
    labelY: 130,
  },
  {
    code: "FI",
    name: "Finland",
    d: "M460,50 L480,40 L500,45 L515,60 L520,85 L515,115 L505,140 L490,160 L475,165 L460,155 L455,130 L455,105 L455,80 Z",
    labelX: 487,
    labelY: 105,
  },
  {
    code: "PT",
    name: "Portugal",
    d: "M130,410 L145,400 L155,410 L155,435 L150,458 L140,468 L130,460 L125,440 Z",
    labelX: 142,
    labelY: 438,
  },
  {
    code: "GR",
    name: "Greece",
    d: "M470,380 L490,370 L510,375 L520,390 L518,410 L510,430 L495,440 L480,435 L470,420 L465,400 Z",
    labelX: 493,
    labelY: 405,
  },
  {
    code: "CZ",
    name: "Czech Republic",
    d: "M385,270 L405,262 L425,265 L440,275 L438,290 L425,298 L405,298 L390,292 L383,282 Z",
    labelX: 413,
    labelY: 282,
  },
  {
    code: "IE",
    name: "Ireland",
    d: "M155,215 L170,205 L185,210 L192,225 L188,242 L175,252 L160,248 L150,235 Z",
    labelX: 172,
    labelY: 230,
  },
  {
    code: "CH",
    name: "Switzerland",
    d: "M320,320 L338,312 L358,315 L365,328 L358,340 L338,343 L320,338 L315,328 Z",
    labelX: 340,
    labelY: 328,
  },
];

// ─── Grid Pattern (light mode) ───

function GridPattern() {
  return (
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path
          d="M 20 0 L 0 0 0 20"
          fill="none"
          stroke="rgba(209, 213, 219, 0.4)"
          strokeWidth="0.5"
        />
      </pattern>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="pulse-glow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ─── Pulse Marker (animated circle for recently updated) ───

function PulseMarker({
  cx,
  cy,
  color,
}: {
  cx: number;
  cy: number;
  color: string;
}) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r="4"
        fill={color}
        opacity="0.9"
        filter="url(#pulse-glow)"
      >
        <animate
          attributeName="r"
          values="3;6;3"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.9;0.4;0.9"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx={cx}
        cy={cy}
        r="8"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0"
      >
        <animate
          attributeName="r"
          values="4;14"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.6;0"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

// ─── Tooltip (light mode) ───

interface TooltipData {
  name: string;
  lawName: string;
  authority: string;
  status: string;
  x: number;
  y: number;
}

function MapTooltip({ data }: { data: TooltipData }) {
  const tx = Math.min(Math.max(data.x, 100), 700);
  const ty = Math.max(data.y - 60, 20);

  return (
    <g transform={`translate(${tx}, ${ty})`} style={{ pointerEvents: "none" }}>
      <rect
        x="-110"
        y="-50"
        width="220"
        height="68"
        rx="8"
        fill="white"
        stroke="#E5E7EB"
        strokeWidth="1"
        filter="url(#tooltip-shadow)"
      />
      <text
        x="0"
        y="-30"
        textAnchor="middle"
        fill="#111827"
        fontSize="11"
        fontWeight="600"
      >
        {data.name}
      </text>
      <text
        x="0"
        y="-14"
        textAnchor="middle"
        fill="#6B7280"
        fontSize="9"
        fontFamily="monospace"
      >
        {data.lawName.length > 34
          ? data.lawName.slice(0, 34) + "..."
          : data.lawName}
      </text>
      <text x="0" y="0" textAnchor="middle" fill="#6B7280" fontSize="8.5">
        {data.authority.length > 38
          ? data.authority.slice(0, 38) + "..."
          : data.authority}
      </text>
      <text
        x="0"
        y="14"
        textAnchor="middle"
        fill={
          data.status === "enacted"
            ? "#059669"
            : data.status === "draft" || data.status === "pending"
              ? "#D97706"
              : "#DC2626"
        }
        fontSize="9"
        fontWeight="600"
        fontFamily="monospace"
        style={{ textTransform: "uppercase" }}
      >
        {data.status.toUpperCase()}
      </text>
    </g>
  );
}

// ─── Legend (light mode) ───

function Legend() {
  const items = [
    { color: "#10B981", label: "Enacted" },
    { color: "#F59E0B", label: "Draft / Pending" },
    { color: "#EF4444", label: "No Legislation" },
    { color: "#3B82F6", label: "Non-EU ESA" },
  ];

  return (
    <g transform="translate(620, 570)">
      <rect
        x="0"
        y="0"
        width="160"
        height="105"
        rx="8"
        fill="white"
        stroke="#E5E7EB"
        strokeWidth="1"
      />
      <text
        x="12"
        y="20"
        fill="#6B7280"
        fontSize="9"
        fontWeight="600"
        fontFamily="monospace"
        letterSpacing="0.08em"
        style={{ textTransform: "uppercase" }}
      >
        LEGISLATION STATUS
      </text>
      {items.map((item, i) => (
        <g key={item.label} transform={`translate(12, ${32 + i * 18})`}>
          <rect
            x="0"
            y="0"
            width="10"
            height="10"
            rx="2"
            fill={item.color}
            opacity="0.7"
          />
          <rect
            x="0"
            y="0"
            width="10"
            height="10"
            rx="2"
            fill="none"
            stroke={item.color}
            strokeWidth="1"
          />
          <text x="16" y="9" fill="#374151" fontSize="9">
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}

// ─── Main Component ───

export default function RegulatoryMap({ onCountryClick }: RegulatoryMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  const jurisdictionMap = useMemo(() => {
    const map: Record<
      string,
      { law: JurisdictionLaw; status: StatusCategory }
    > = {};
    for (const cp of COUNTRY_PATHS) {
      const law = JURISDICTION_DATA.get(
        cp.code as Parameters<typeof JURISDICTION_DATA.get>[0],
      );
      map[cp.code] = {
        law: law!,
        status: getStatusCategory(law, cp.code),
      };
    }
    return map;
  }, []);

  const handleMouseEnter = (cp: CountryPath) => {
    setHoveredCountry(cp.code);
    const entry = jurisdictionMap[cp.code];
    if (entry?.law) {
      setTooltipData({
        name: `${entry.law.flagEmoji} ${entry.law.countryName}`,
        lawName: entry.law.legislation.name,
        authority: entry.law.licensingAuthority.name,
        status: entry.law.legislation.status,
        x: cp.labelX,
        y: cp.labelY,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCountry(null);
    setTooltipData(null);
  };

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <svg
        viewBox="0 0 800 700"
        className="w-full h-full"
        style={{ background: "#FFFFFF" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <GridPattern />

        {/* Tooltip shadow filter */}
        <defs>
          <filter
            id="tooltip-shadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="4"
              floodColor="#000"
              floodOpacity="0.1"
            />
          </filter>
        </defs>

        {/* Background grid */}
        <rect width="800" height="700" fill="url(#grid)" />

        {/* Subtle glow gradient at center */}
        <defs>
          <radialGradient id="center-glow" cx="50%" cy="45%" r="40%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="700" fill="url(#center-glow)" />

        {/* Country shapes */}
        {COUNTRY_PATHS.map((cp) => {
          const entry = jurisdictionMap[cp.code];
          const status = entry?.status ?? "none";
          const colors = STATUS_COLORS[status];
          const isHovered = hoveredCountry === cp.code;
          const law = entry?.law;
          const recentlyUpdated = law
            ? isRecentlyUpdated(law.lastUpdated)
            : false;

          return (
            <g key={cp.code}>
              {/* Country fill */}
              <path
                d={cp.d}
                fill={isHovered ? colors.hoverFill : colors.fill}
                fillOpacity={isHovered ? "1" : colors.fillOpacity}
                stroke={colors.stroke}
                strokeWidth={isHovered ? "2" : "1"}
                strokeOpacity={isHovered ? "1" : "0.6"}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  filter: isHovered ? "url(#glow)" : "none",
                }}
                onMouseEnter={() => handleMouseEnter(cp)}
                onMouseLeave={handleMouseLeave}
                onClick={() => onCountryClick(cp.code)}
              />

              {/* Country label */}
              <text
                x={cp.labelX}
                y={cp.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? "#111827" : "#374151"}
                fontSize={cp.code === "LU" ? "7" : "9"}
                fontFamily="monospace"
                fontWeight={isHovered ? "700" : "500"}
                style={{ pointerEvents: "none", transition: "all 0.2s ease" }}
                opacity={isHovered ? 1 : 0.8}
              >
                {cp.code}
              </text>

              {/* Pulse marker for recently updated */}
              {recentlyUpdated && (
                <PulseMarker
                  cx={cp.labelX + 12}
                  cy={cp.labelY - 10}
                  color={colors.stroke}
                />
              )}
            </g>
          );
        })}

        {/* Legend */}
        <Legend />

        {/* Tooltip */}
        {tooltipData && <MapTooltip data={tooltipData} />}

        {/* Title overlay */}
        <text
          x="20"
          y="28"
          fill="#111827"
          fontSize="13"
          fontWeight="700"
          fontFamily="monospace"
        >
          REGULATORY MAP
        </text>
        <text x="20" y="44" fill="#6B7280" fontSize="9" fontFamily="monospace">
          {COUNTRY_PATHS.length} JURISDICTIONS TRACKED
        </text>
      </svg>
    </div>
  );
}
