"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — dezente Inline-Skelette (Lade-Platzhalter).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Die Anti-„Loadingscreen"-Bausteine: Während Daten zum ersten Mal laden, steht
 * die Seite SOFORT mit ihrer echten Struktur (Karten mit Titel + Untertitel,
 * KPI-Raster) — nur die Datenflächen pulsieren dezent. Es gibt bewusst KEINEN
 * Vollbild- oder Vollflächen-Loader mehr; Folgebesuche werden ohnehin sofort
 * aus dem useAdminData-Cache bedient.
 *
 *   - {@link SkeletonBar}      eine einzelne pulsierende Zeile/Fläche
 *   - {@link SkeletonRows}     mehrere Zeilen mit abnehmender Breite (Tabellen)
 *   - {@link KpiTileSkeleton}  Platzhalter in der exakten KpiTile-Silhouette
 *   - {@link CardSkeleton}     eine echte AdminCard (Titel sichtbar) mit
 *                              pulsierendem Inhalt
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import AdminCard from "./AdminCard";

/** Eine einzelne, dezent pulsierende Platzhalter-Fläche. */
export function SkeletonBar({
  height = 12,
  width = "100%",
  className = "",
}: {
  height?: number;
  width?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md ${className}`}
      style={{
        height,
        width,
        background: "var(--separator-strong, rgba(148,163,184,0.14))",
      }}
    />
  );
}

/** Mehrere pulsierende Zeilen mit leicht abnehmender Breite (Tabellen-Optik). */
export function SkeletonRows({
  rows = 4,
  height = 12,
}: {
  rows?: number;
  height?: number;
}) {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar key={i} height={height} width={`${100 - i * 9}%`} />
      ))}
    </div>
  );
}

/** Platzhalter in der exakten Silhouette einer {@link KpiTile}-Kachel. */
export function KpiTileSkeleton() {
  return (
    <div
      className="glass-surface rounded-xl px-4 py-3.5"
      style={{ border: "1px solid var(--border-default)" }}
      aria-hidden="true"
    >
      <SkeletonBar height={9} width="60%" />
      <div className="mt-2.5">
        <SkeletonBar height={22} width="45%" />
      </div>
      <div className="mt-2">
        <SkeletonBar height={9} width="70%" />
      </div>
    </div>
  );
}

/**
 * Eine echte AdminCard mit sichtbarem (deutschem) Titel + Untertitel, deren
 * Inhalt dezent pulsiert — so steht die Seitenstruktur sofort und nur die
 * Daten laden nach.
 */
export function CardSkeleton({
  title,
  subtitle,
  rows = 4,
  rowHeight = 12,
}: {
  title?: string;
  subtitle?: string;
  rows?: number;
  rowHeight?: number;
}) {
  return (
    <AdminCard title={title} subtitle={subtitle}>
      <div role="status" aria-label="Wird geladen">
        <SkeletonRows rows={rows} height={rowHeight} />
      </div>
    </AdminCard>
  );
}
