# Caelex Scholar — Accessibility Statement (internal companion)

> **ENTWURF / DRAFT — Vorlage; vor Veröffentlichung bzw. Unterzeichnung durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine Rechtsberatung. / Template; must be reviewed and adapted by qualified legal counsel before publication or execution. Not legal advice.**

- **Stand / Last updated:** 7 June 2026
- **Version:** 0.1 (Entwurf / Draft)
- **Binding language:** German (DE). English is a convenience translation.
- **Public surface:** `/scholar/legal/accessibility` — rendered DE+EN via `LegalDoc`. Content files: `src/app/(scholar)/scholar/legal/_content/accessibility-{de,en}.ts`.
- **Spec basis:** `docs/superpowers/specs/2026-06-07-caelex-scholar-legal-compliance.md` items **E5, E6, E7**.
- **Consistency anchor:** the corrected app-wide statement at `src/app/legal/barrierefreiheit/_content/a11y-de.ts` + `src/app/legal/accessibility/_content/a11y-en.ts`.

## What this fixes vs. the original app-wide statement

| Spec item | Original error                                    | Scholar statement                                                                                                                          |
| --------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **E5**    | Authority named as **Berlin** market surveillance | **MLBF AöR, Carl-Miller-Str. 6, 39112 Magdeburg**, www.mlbf-barrierefrei.de (Schlichtungsstelle §16 BGG, since 26 Sep 2025)                |
| **E6**    | Standard stated as **WCAG 2.1 AA**                | **WCAG 2.2 AA** (exceeds EN 301 549 / 2.1 AA baseline)                                                                                     |
| **E7**    | Flatly asserts in-scope "to consumers"            | Reframed as **voluntary** compliance; microenterprise (§3(3) BFSG) + B2B2C (§2 Nr.26) framing, with a **[TBD: confirm with counsel]** flag |

## Scholar-specific remediation items (Section 4)

Tailored to Scholar's actual surface (not the platform's 3D globe / charts):

- **Research-graph** view → information-equivalent tabular/list alternative being provided/expanded.
- **PDF / print exports** → accessible tagged generation in progress; structured HTML interim.
- **Newer interaction patterns** (quick-search / command palette) → continuously checked against WCAG 2.2 **2.4.11** (focus not obscured), **2.5.8** (target size), **3.3.8** (accessible authentication).

These map to the WCAG-2.2 criteria the Scholar code already documents in the settings/login docblocks (2.4.11, 2.5.8, 3.3.8) and the E8 conformance items in the spec.

## Contact & enforcement

- Feedback: `accessibility@caelex.eu` (response within 5 working days); general `cs@caelex.eu`.
- Conciliation: MLBF AöR, Magdeburg (free, no legal representation required).

## Open items → counsel

- **[TBD / E7]** Confirm BFSG applicability (microenterprise exemption + B2B2C consumer-contract trigger) so "voluntary" can be stated definitively. Until then the statement is expressly on a voluntary basis.
- Keep the WCAG-2.2 remediation list in sync with the E8 technical conformance pass.
