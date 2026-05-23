/**
 * Apple-style hero illustrations for the Trade welcome page.
 *
 * Replaces the flat Lucide icons in the QuickStart grid with stylized
 * 2.5D SVGs that have:
 *   - Subtle gradients (top-light / bottom-shadow)
 *   - Soft drop shadows
 *   - Strong rounded corners
 *   - Indigo accent on each (Caelex brand thread)
 *
 * Design language follows macOS Sonoma / iCloud system icons — not
 * isometric 3D, but stylized 2D with implied depth via lighting cues.
 *
 * Each export is a self-contained <svg> at 96×96 viewport. They scale
 * cleanly via CSS width/height. No external dependencies.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { SVGProps } from "react";

const SIZE = 96;

interface IllustrationProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  size?: number;
}

// ============================================================================
// ITEMS — 3D shipping box, isometric hint, with classification "label"
// ============================================================================

export function ItemsIllustration({ size = SIZE, ...rest }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id="items-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FAFAFC" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </linearGradient>
        <linearGradient id="items-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F3F8" />
        </linearGradient>
        <linearGradient id="items-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#D8DAE3" />
          <stop offset="100%" stopColor="#B9BDCC" />
        </linearGradient>
        <linearGradient id="items-label" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <radialGradient id="items-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(15, 23, 42, 0.28)" />
          <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="48" cy="84" rx="30" ry="4" fill="url(#items-shadow)" />

      {/* Top face — angled diamond, lit */}
      <path
        d="M48 18 L78 30 L48 42 L18 30 Z"
        fill="url(#items-top)"
        stroke="rgba(15, 23, 42, 0.08)"
        strokeWidth="0.5"
      />

      {/* Right side face — darker */}
      <path
        d="M78 30 L78 64 L48 76 L48 42 Z"
        fill="url(#items-side)"
        stroke="rgba(15, 23, 42, 0.06)"
        strokeWidth="0.5"
      />

      {/* Left side face — front, lightest */}
      <path
        d="M18 30 L18 64 L48 76 L48 42 Z"
        fill="url(#items-front)"
        stroke="rgba(15, 23, 42, 0.06)"
        strokeWidth="0.5"
      />

      {/* Classification label on front face */}
      <rect
        x="24"
        y="50"
        width="22"
        height="12"
        rx="2"
        fill="url(#items-label)"
        opacity="0.95"
      />

      {/* Tape line on top */}
      <path d="M48 18 L48 42" stroke="rgba(15, 23, 42, 0.12)" strokeWidth="1" />
    </svg>
  );
}

// ============================================================================
// PARTIES — Globe with location pins
// ============================================================================

export function PartiesIllustration({
  size = SIZE,
  ...rest
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <radialGradient id="globe-fill" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="50%" stopColor="#C7D2FE" />
          <stop offset="100%" stopColor="#818CF8" />
        </radialGradient>
        <linearGradient id="globe-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0.3)" />
        </linearGradient>
        <linearGradient id="pin-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
        <radialGradient id="globe-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(15, 23, 42, 0.28)" />
          <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="48" cy="86" rx="26" ry="3.5" fill="url(#globe-shadow)" />

      {/* Globe sphere */}
      <circle
        cx="48"
        cy="48"
        r="30"
        fill="url(#globe-fill)"
        stroke="rgba(99, 102, 241, 0.18)"
        strokeWidth="0.8"
      />

      {/* Latitude lines */}
      <ellipse
        cx="48"
        cy="48"
        rx="30"
        ry="8"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.7"
      />
      <ellipse
        cx="48"
        cy="48"
        rx="30"
        ry="18"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      />

      {/* Longitude line */}
      <ellipse
        cx="48"
        cy="48"
        rx="12"
        ry="30"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.6"
      />

      {/* Top-light highlight */}
      <ellipse cx="40" cy="38" rx="14" ry="10" fill="rgba(255,255,255,0.32)" />

      {/* Pins */}
      <PinMarker cx={58} cy={32} />
      <PinMarker cx={34} cy={52} />
      <PinMarker cx={62} cy={62} />
    </svg>
  );
}

function PinMarker({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <path
        d={`M ${cx} ${cy - 7} C ${cx + 4} ${cy - 7} ${cx + 5} ${cy - 3} ${cx + 4} ${cy - 1} L ${cx} ${cy + 4} L ${cx - 4} ${cy - 1} C ${cx - 5} ${cy - 3} ${cx - 4} ${cy - 7} ${cx} ${cy - 7} Z`}
        fill="url(#pin-grad)"
        stroke="rgba(225, 29, 72, 0.4)"
        strokeWidth="0.6"
      />
      <circle cx={cx} cy={cy - 3.5} r="1.6" fill="#FFFFFF" />
    </g>
  );
}

// ============================================================================
// LICENSES — Folded document with embossed seal
// ============================================================================

export function LicensesIllustration({
  size = SIZE,
  ...rest
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id="doc-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F3F8" />
        </linearGradient>
        <linearGradient id="doc-fold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E5E7EB" />
          <stop offset="100%" stopColor="#C7CAD3" />
        </linearGradient>
        <radialGradient id="seal-grad" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#4F46E5" />
        </radialGradient>
        <radialGradient id="doc-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(15, 23, 42, 0.28)" />
          <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="48" cy="86" rx="26" ry="3.5" fill="url(#doc-shadow)" />

      {/* Paper body — main */}
      <path
        d="M22 18 L62 18 L74 30 L74 80 L22 80 Z"
        fill="url(#doc-paper)"
        stroke="rgba(15, 23, 42, 0.1)"
        strokeWidth="0.7"
      />

      {/* Folded corner — triangle */}
      <path
        d="M62 18 L74 30 L62 30 Z"
        fill="url(#doc-fold)"
        stroke="rgba(15, 23, 42, 0.12)"
        strokeWidth="0.6"
      />

      {/* Text lines */}
      <rect
        x="30"
        y="30"
        width="26"
        height="2"
        rx="1"
        fill="rgba(15,23,42,0.18)"
      />
      <rect
        x="30"
        y="36"
        width="36"
        height="2"
        rx="1"
        fill="rgba(15,23,42,0.12)"
      />
      <rect
        x="30"
        y="42"
        width="32"
        height="2"
        rx="1"
        fill="rgba(15,23,42,0.12)"
      />
      <rect
        x="30"
        y="48"
        width="28"
        height="2"
        rx="1"
        fill="rgba(15,23,42,0.12)"
      />

      {/* Seal / stamp — circular embossed */}
      <circle
        cx="56"
        cy="65"
        r="11"
        fill="url(#seal-grad)"
        stroke="rgba(79, 70, 229, 0.5)"
        strokeWidth="1.2"
      />
      {/* Inner seal ring */}
      <circle
        cx="56"
        cy="65"
        r="7.5"
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="0.8"
      />
      {/* Star inside seal */}
      <path
        d="M56 60.5 L57.2 64 L60.8 64 L58 66.2 L59.1 69.7 L56 67.5 L52.9 69.7 L54 66.2 L51.2 64 L54.8 64 Z"
        fill="rgba(255,255,255,0.95)"
      />
    </svg>
  );
}

// ============================================================================
// OPERATIONS — Connected workflow nodes
// ============================================================================

export function OperationsIllustration({
  size = SIZE,
  ...rest
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <radialGradient id="node-active" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#4F46E5" />
        </radialGradient>
        <radialGradient id="node-done" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </radialGradient>
        <radialGradient id="node-future" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#FAFAFC" />
          <stop offset="100%" stopColor="#D1D5DB" />
        </radialGradient>
        <radialGradient id="ops-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(15, 23, 42, 0.28)" />
          <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="48" cy="86" rx="28" ry="3.5" fill="url(#ops-shadow)" />

      {/* Connection lines — curved */}
      <path
        d="M26 30 Q 38 22, 50 32"
        stroke="rgba(99, 102, 241, 0.45)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M50 32 Q 62 42, 70 60"
        stroke="rgba(99, 102, 241, 0.45)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M50 32 Q 40 50, 30 64"
        stroke="rgba(15, 23, 42, 0.15)"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="2 2"
      />

      {/* Done node — top-left */}
      <circle
        cx="26"
        cy="30"
        r="9"
        fill="url(#node-done)"
        stroke="rgba(15, 23, 42, 0.18)"
        strokeWidth="0.8"
      />
      {/* checkmark inside done node */}
      <path
        d="M22 30 L25 33 L30 27"
        stroke="rgba(34, 197, 94, 0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Active node — center, indigo accent */}
      <circle
        cx="50"
        cy="32"
        r="11"
        fill="url(#node-active)"
        stroke="rgba(79, 70, 229, 0.5)"
        strokeWidth="1.2"
      />
      {/* Pulse ring around active */}
      <circle
        cx="50"
        cy="32"
        r="14"
        fill="none"
        stroke="rgba(99, 102, 241, 0.25)"
        strokeWidth="1"
      />
      {/* Glyph inside active node */}
      <circle cx="50" cy="32" r="3" fill="rgba(255,255,255,0.95)" />

      {/* Future node — bottom-right */}
      <circle
        cx="70"
        cy="60"
        r="9"
        fill="url(#node-future)"
        stroke="rgba(15, 23, 42, 0.18)"
        strokeWidth="0.8"
        strokeDasharray="2 2"
      />

      {/* Future node — bottom-left (alternative branch) */}
      <circle
        cx="30"
        cy="64"
        r="7"
        fill="url(#node-future)"
        stroke="rgba(15, 23, 42, 0.15)"
        strokeWidth="0.8"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

// ============================================================================
// COMPLIANCE POSTURE — Stylized shield with embedded regime chips
// ============================================================================

export function PostureIllustration({
  size = SIZE,
  ...rest
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id="shield-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="shield-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id="shield-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(15, 23, 42, 0.32)" />
          <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="48" cy="86" rx="22" ry="3" fill="url(#shield-shadow)" />

      {/* Shield body */}
      <path
        d="M48 12 L72 22 L72 48 C 72 64 60 76 48 82 C 36 76 24 64 24 48 L24 22 Z"
        fill="url(#shield-grad)"
        stroke="rgba(79, 70, 229, 0.4)"
        strokeWidth="1"
      />

      {/* Inner highlight */}
      <path
        d="M48 18 L66 26 L66 48 C 66 60 58 70 48 75 C 38 70 30 60 30 48 L30 26 Z"
        fill="url(#shield-inner)"
      />

      {/* Centered checkmark */}
      <path
        d="M38 48 L45 55 L60 38"
        stroke="rgba(255,255,255,0.98)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
