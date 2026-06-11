/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * (admin) Segment-Fallback — sofortiges Feedback beim Seitenwechsel.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Ohne diese Datei „friert" ein Klick in der Admin-Navigation ein, bis der
 * Server das neue (force-dynamic) Seiten-Segment geliefert hat — erst dann
 * passierte sichtbar etwas. Mit ihr rendert Next.js SOFORT diesen dezenten
 * Struktur-Platzhalter INNERHALB der Shell (Sidebar + Topbar bleiben stehen).
 * Kein Spinner, kein Vollbild-Loader — nur eine angedeutete Seite, die die
 * Client-Seite gleich darauf mit echtem Inhalt (oder ihren Karten-Skeletten)
 * ersetzt. Folgebesuche zeigen dank des useAdminData-Caches sofort Daten.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export default function AdminSegmentLoading() {
  const card = (height: number) => (
    <div
      className="glass-elevated animate-pulse rounded-2xl"
      style={{
        height,
        border: "1px solid var(--border-default)",
        // Bewusst sehr dezent — ein kurzer Übergang, kein „Ladebildschirm".
        opacity: 0.55,
      }}
    />
  );

  return (
    <div role="status" aria-label="Seite wird geöffnet" aria-busy="true">
      {/* Titelzeile in der AdminPageHeader-Silhouette. */}
      <div className="mb-6">
        <div
          className="animate-pulse rounded-md"
          style={{
            height: 22,
            width: 180,
            background: "var(--separator-strong, rgba(148,163,184,0.14))",
          }}
        />
        <div
          className="mt-2 animate-pulse rounded-md"
          style={{
            height: 12,
            width: 320,
            background: "var(--separator-strong, rgba(148,163,184,0.10))",
          }}
        />
      </div>
      <div className="flex flex-col gap-5">
        {card(120)}
        {card(220)}
      </div>
    </div>
  );
}
