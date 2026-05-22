import {
  Text,
  Button,
  Section,
  Row,
  Column,
  Hr,
} from "@react-email/components";
import * as React from "react";
import { render } from "@react-email/render";
import { TradeBaseLayout, tradeStyles, tradeUrl } from "./trade-base";

/**
 * Trade sanctions-hit email (Sprint E2).
 *
 * Triggered from `screen-party.server.ts` whenever a TradeParty screening
 * returns POTENTIAL_MATCH or CONFIRMED_HIT. The trigger covers two
 * distinct legal events:
 *  1. Direct name match against one of the 6 sanctions lists
 *     (OFAC SDN, BIS Entity, DDTC Debarred, EU FSF, UK OFSI, UN)
 *  2. 50%-rule cascade hit (≥50% aggregate beneficial ownership by
 *     one or more CONFIRMED_HIT ancestors) — OFAC 50% Rule + BIS
 *     Affiliate Rule (Sept 29, 2025)
 *
 * The email surfaces BOTH triggers when both apply, because legal
 * counsel needs to know whether they're dealing with a direct hit
 * or a derivative-block under cascade aggregation — the licensing
 * remediation paths differ.
 *
 * Subject pattern:
 *  - "[ACTION REQUIRED] Sanctions hit — Vostochny Logistics LLC"
 */

export interface TradeSanctionsHitData {
  recipientName: string;
  partyId: string;
  /** TradeParty.canonicalName (post-normalization). */
  partyName: string;
  /** Country code of the screened party, ISO-2. */
  countryCode: string;
  /** Top fuzzy-match score in [0, 1]. 0 = no direct name match. */
  topScore: number;
  /** Distinct sanctions lists the party matched on (e.g. ["OFAC_SDN","EU_FSF"]). */
  matchedLists: string[];
  /** Whether the 50%-rule cascade triggered (≥50% sanctioned ownership). */
  cascadeHit: boolean;
  /** Count of CONFIRMED_HIT ancestors found in the cascade. */
  sanctionedAncestorCount: number;
  /**
   * Names of the top 3 sanctioned ancestors (for cascade context).
   * Only populated when cascadeHit or sanctionedAncestorCount > 0.
   */
  sanctionedAncestors?: Array<{
    name: string;
    effectivePercent: number;
  }>;
}

function TradeSanctionsHitEmail({
  recipientName,
  partyId,
  partyName,
  countryCode,
  topScore,
  matchedLists,
  cascadeHit,
  sanctionedAncestorCount,
  sanctionedAncestors,
}: TradeSanctionsHitData) {
  const hasDirectHit = matchedLists.length > 0;
  const hasCascadeFinding = cascadeHit || sanctionedAncestorCount > 0;
  const headline = hasDirectHit
    ? hasCascadeFinding
      ? "Sanctions hit & cascade finding"
      : "Sanctions hit detected"
    : "Cascade ownership finding";

  return (
    <TradeBaseLayout
      previewText={`Sanctions screening: ${partyName} (${countryCode}) — review required`}
    >
      <Text style={tradeStyles.text}>Hello {recipientName},</Text>

      <Text style={tradeStyles.heading}>{headline}</Text>

      <Text style={tradeStyles.text}>
        A counterparty in your Trade workspace returned a positive screening
        result. All operations involving this party are paused pending legal
        review. Do not authorize new exports, payments, or shipments to this
        counterparty until cleared by a sanctions officer.
      </Text>

      {/* Party card */}
      <Section style={tradeStyles.cardCritical}>
        <Row>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                ...tradeStyles.text,
                fontWeight: "600",
                margin: "0 0 6px 0",
                fontSize: "15px",
              }}
            >
              {partyName}
            </Text>
            <Text style={{ ...tradeStyles.mutedText, margin: 0 }}>
              {countryCode}
            </Text>
          </Column>
          <Column style={{ width: "30%", textAlign: "right" as const }}>
            <span style={tradeStyles.badge("critical")}>BLOCKED</span>
          </Column>
        </Row>
      </Section>

      {/* Direct match section */}
      {hasDirectHit && (
        <Section style={tradeStyles.card}>
          <Text
            style={{
              ...tradeStyles.text,
              fontWeight: "600",
              margin: "0 0 8px 0",
            }}
          >
            Direct match
          </Text>
          <Text style={tradeStyles.mutedText}>Lists triggered</Text>
          <Text style={{ ...tradeStyles.text, margin: "0 0 12px 0" }}>
            {matchedLists.map(formatList).join(" · ")}
          </Text>
          <Text style={tradeStyles.mutedText}>Top fuzzy-match score</Text>
          <Text style={{ ...tradeStyles.text, margin: 0 }}>
            {(topScore * 100).toFixed(0)}% confidence
          </Text>
        </Section>
      )}

      {/* Cascade finding section */}
      {hasCascadeFinding && (
        <Section style={tradeStyles.card}>
          <Text
            style={{
              ...tradeStyles.text,
              fontWeight: "600",
              margin: "0 0 8px 0",
            }}
          >
            50%-rule cascade finding
          </Text>
          <Text style={{ ...tradeStyles.text, margin: "0 0 12px 0" }}>
            {cascadeHit ? (
              <>
                Aggregate sanctioned ownership ≥50% — under OFAC 50% Rule and
                BIS Affiliate Rule (Sept&nbsp;29&nbsp;2025), this counterparty
                is treated as sanctioned regardless of its own list status.
              </>
            ) : (
              <>
                {sanctionedAncestorCount} sanctioned beneficial owner
                {sanctionedAncestorCount === 1 ? "" : "s"} detected (aggregate
                below 50%, but human review required).
              </>
            )}
          </Text>

          {sanctionedAncestors && sanctionedAncestors.length > 0 && (
            <>
              <Hr style={{ ...tradeStyles.hr, margin: "12px 0" }} />
              <Text style={tradeStyles.mutedText}>Sanctioned owners</Text>
              {sanctionedAncestors.slice(0, 3).map((a) => (
                <Text
                  key={a.name}
                  style={{ ...tradeStyles.text, margin: "0 0 4px 0" }}
                >
                  • {a.name}{" "}
                  <span style={{ color: tradeStyles.colors.slate400 }}>
                    ({(a.effectivePercent * 100).toFixed(1)}% effective)
                  </span>
                </Text>
              ))}
            </>
          )}
        </Section>
      )}

      {/* CTA */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button
          href={tradeUrl(`/trade/counterparties/${partyId}`)}
          style={tradeStyles.primaryButton}
        >
          Open Counterparty
        </Button>
      </Section>

      <Text style={tradeStyles.mutedText}>
        This determination is system-generated based on the latest sanctions
        list snapshots. Cleared decisions require manual override by an
        authorised compliance officer with full audit trail.
      </Text>
    </TradeBaseLayout>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatList(list: string): string {
  const map: Record<string, string> = {
    OFAC_SDN: "OFAC SDN",
    BIS_ENTITY: "BIS Entity List",
    DDTC_DEBARRED: "DDTC Debarred",
    EU_FSF: "EU FSF (CFSP)",
    UK_OFSI: "UK OFSI",
    UN_CONSOLIDATED: "UN Consolidated",
  };
  return map[list] ?? list;
}

// ─── Render Function ────────────────────────────────────────────────

export async function renderTradeSanctionsHit(
  data: TradeSanctionsHitData,
): Promise<{ html: string; subject: string }> {
  const subject = `[ACTION REQUIRED] Sanctions hit — ${data.partyName}`;
  const html = await render(<TradeSanctionsHitEmail {...data} />);
  return { html, subject };
}
