/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Public read-only view of a shared Atlas-Workspace. URL pattern:
 *   /atlas/share/<token>
 *
 * No login required. Anyone with the URL can view the workspace as
 * the owner left it. Senior-Partner reviewt das Memo, Mandant sieht
 * Live-Stand, Co-Counsel kommentiert per E-Mail. Kein Account, kein
 * Onboarding-Flow.
 *
 * Server component — pulls directly from Prisma (no extra API round-
 * trip from the public page) and renders inline. Caching is left at
 * dynamic-default so revoked links flip to 404 immediately.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sparkles, Inbox, AlertTriangle, BookOpen } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
function formatDateDe(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getDate()}. ${MONTHS_DE[date.getMonth()]} ${date.getFullYear()}`;
}

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedWorkspacePage({ params }: SharePageProps) {
  const { token } = await params;
  if (!token || token.length < 16 || token.length > 64) {
    notFound();
  }

  const ws = await prisma.atlasWorkspace.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      shareEnabledAt: true,
      updatedAt: true,
      cards: {
        select: {
          id: true,
          kind: true,
          title: true,
          content: true,
          question: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!ws) {
    notFound();
  }

  // Bucket cards into reading-friendly sections (mirrors the export
  // endpoint's grouping). Senior partner reads top-down: Klausel
  // first, then Q&A, then notes, then sources.
  const clauseCards = ws.cards.filter((c) => c.kind === "ai-clause");
  const answerCards = ws.cards.filter((c) => c.kind === "ai-answer");
  const userCards = ws.cards.filter(
    (c) => c.kind !== "ai-clause" && c.kind !== "ai-answer",
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, #0a1628 0%, #050811 60%, #020308 100%)",
        color: "rgba(248, 250, 255, 0.92)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        padding: "48px 20px 96px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Read-only banner */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            borderRadius: 999,
            background: "rgba(140, 220, 200, 0.1)",
            border: "1px solid rgba(140, 220, 200, 0.28)",
            color: "rgba(220, 250, 240, 0.95)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          <BookOpen size={12} strokeWidth={1.8} />
          <span>Read-only · Atlas-Workspace</span>
        </div>

        <h1
          style={{
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: -0.02,
            margin: "0 0 8px",
            lineHeight: 1.15,
          }}
        >
          {ws.title}
        </h1>
        <div
          style={{
            color: "rgba(248, 250, 255, 0.5)",
            fontSize: 13,
            marginBottom: 32,
          }}
        >
          Geteilt am {formatDateDe(ws.shareEnabledAt)} · {ws.cards.length}{" "}
          Karte(n) · zuletzt aktualisiert {formatDateDe(ws.updatedAt)}
        </div>

        {ws.cards.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "rgba(248, 250, 255, 0.4)",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
            }}
          >
            Dieser Workspace ist noch leer.
          </div>
        )}

        {clauseCards.length > 0 && (
          <Section
            title="Klauseln"
            icon={<Sparkles size={14} strokeWidth={1.8} />}
            tint="blue"
          >
            {clauseCards.map((c) => (
              <Card
                key={c.id}
                title={c.title}
                body={c.content}
                meta={`Synthetisiert von Atlas am ${formatDateDe(c.createdAt)}`}
                tint="blue"
              />
            ))}
          </Section>
        )}

        {answerCards.length > 0 && (
          <Section
            title="Fragen & Antworten"
            icon={<Sparkles size={14} strokeWidth={1.8} />}
            tint="emerald"
          >
            {answerCards.map((c) => (
              <Card
                key={c.id}
                title={c.title}
                body={c.content}
                question={c.question ?? null}
                meta={`Atlas-Antwort vom ${formatDateDe(c.createdAt)}`}
                tint="emerald"
              />
            ))}
          </Section>
        )}

        {userCards.length > 0 && (
          <Section
            title="Notizen, Mandant & Quellen"
            icon={<Inbox size={14} strokeWidth={1.8} />}
            tint="slate"
          >
            {userCards.map((c) => (
              <Card key={c.id} title={c.title} body={c.content} tint="slate" />
            ))}
          </Section>
        )}

        <div
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            color: "rgba(248, 250, 255, 0.35)",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={11} strokeWidth={1.6} />
          <span>
            Dieser Workspace wurde mit Atlas erstellt. Die zitierten Quellen
            stammen aus dem Atlas-Korpus. Inhalt vom Empfänger nicht editierbar.
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  tint,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tint: "blue" | "emerald" | "slate";
  children: React.ReactNode;
}) {
  const accent =
    tint === "blue"
      ? "rgba(180, 200, 255, 0.85)"
      : tint === "emerald"
        ? "rgba(140, 220, 200, 0.85)"
        : "rgba(248, 250, 255, 0.7)";
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: accent,
          margin: "0 0 14px",
        }}
      >
        {icon}
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function Card({
  title,
  body,
  question,
  meta,
  tint,
}: {
  title: string;
  body: string;
  question?: string | null;
  meta?: string;
  tint: "blue" | "emerald" | "slate";
}) {
  const accent =
    tint === "blue"
      ? "rgba(180, 200, 255, 0.32)"
      : tint === "emerald"
        ? "rgba(140, 220, 200, 0.32)"
        : "rgba(255, 255, 255, 0.12)";
  const wash =
    tint === "blue"
      ? "linear-gradient(135deg, rgba(120,160,255,0.04) 0%, rgba(180,130,255,0.03) 100%)"
      : tint === "emerald"
        ? "linear-gradient(135deg, rgba(80,200,160,0.05) 0%, rgba(120,200,220,0.03) 100%)"
        : "transparent";
  return (
    <article
      style={{
        padding: 16,
        background: `${wash}, rgba(15, 18, 24, 0.65)`,
        border: `1px solid ${accent}`,
        borderRadius: 12,
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: -0.01,
          color: "rgba(248, 250, 255, 0.96)",
        }}
      >
        {title}
      </h3>
      {question && (
        <p
          style={{
            margin: "0 0 10px",
            padding: "8px 12px",
            background: "rgba(255, 255, 255, 0.03)",
            borderLeft: "2px solid rgba(140, 220, 200, 0.5)",
            borderRadius: "0 6px 6px 0",
            fontSize: 13,
            fontStyle: "italic",
            color: "rgba(248, 250, 255, 0.75)",
          }}
        >
          <strong
            style={{
              fontStyle: "normal",
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: "rgba(180, 220, 210, 0.85)",
              marginRight: 6,
            }}
          >
            Frage:
          </strong>
          {question}
        </p>
      )}
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.6,
          color: "rgba(248, 250, 255, 0.82)",
          whiteSpace: "pre-wrap",
        }}
      >
        {body}
      </p>
      {meta && (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 11,
            color: "rgba(248, 250, 255, 0.4)",
            fontStyle: "italic",
          }}
        >
          {meta}
        </p>
      )}
    </article>
  );
}
