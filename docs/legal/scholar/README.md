# Caelex Scholar — internal legal documents (terms / acceptable-use / imprint)

> **ENTWURF / DRAFT — Vorlage; vor Veröffentlichung bzw. Unterzeichnung durch
> qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine Rechtsberatung. /
> Template; must be reviewed and adapted by qualified legal counsel before
> publication or execution. Not legal advice.**

Internal companions to the public Scholar legal pages in the
**terms / acceptable-use / imprint** lane. Each markdown file mirrors the
published draft so counsel can review the substance outside the rendering shell.

| Doc                                        | Public route                    | Content files (DE binding + EN convenience)                      | Internal markdown   |
| ------------------------------------------ | ------------------------------- | ---------------------------------------------------------------- | ------------------- |
| Terms of Use / Nutzungsbedingungen         | `/scholar/legal/terms`          | `_content/terms-de.ts`, `_content/terms-en.ts`                   | `terms.md`          |
| Acceptable Use Policy / Nutzungsrichtlinie | `/scholar/legal/acceptable-use` | `_content/acceptable-use-de.ts`, `_content/acceptable-use-en.ts` | `acceptable-use.md` |
| Impressum / Imprint                        | `/scholar/legal/imprint`        | `_content/imprint-de.ts`, `_content/imprint-en.ts`               | `imprint.md`        |

`_content/*` paths are under
`src/app/(scholar)/scholar/legal/`. The public pages are 6-line server
components that hand the DE+EN editions to the frozen `LegalDoc` shell, which
renders the mandatory DRAFT banner and the Stand/Version meta line.

**Conventions.** German is the binding language; English is a convenience
translation. `7 June 2026` is a placeholder for the Stand/Last-updated date and is
set when counsel signs off. Version starts at `0.1 (Entwurf / Draft)`.

**Open items flagged for counsel** (see also the gap-analysis spec
`docs/superpowers/specs/2026-06-07-caelex-scholar-legal-compliance.md`,
§4 NEEDS-LAWYER):

- Final wording / AGB-control (§§ 305 ff. BGB) of the Terms liability &
  warranty clauses (Terms § 8). `[TBD]`
- Art. 8 GDPR (minors) responsibility allocation in the university DPA/AVV
  (Terms § 3; Imprint references). `[TBD]`
- Jurisdiction-specific "official works" status (§ 5 UrhG equivalents across the
  10 jurisdictions) and the actual ITU/ISO licence terms behind the 600-char cap
  (Terms § 7). `[TBD]`
- Concrete, user-facing rate-limit values (Acceptable Use § 6). `[TBD]`

Entity facts mirror the real platform imprint
(`src/app/legal/impressum/page.tsx`): **Caelex · Inhaber Julian Polleschner ·
Am Maselakepark 37 · 13587 Berlin · Deutschland · Kleinunternehmer § 19 UStG ·
DSA Art. 11/12 SPOC · cs@caelex.eu**.
