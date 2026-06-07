# Caelex Scholar — Privacy Notice / Datenschutzerklärung (internal working file)

> **ENTWURF / DRAFT — Vorlage; vor Veröffentlichung bzw. Unterzeichnung durch
> qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine Rechtsberatung. /
> Template; must be reviewed and adapted by qualified legal counsel before
> publication or execution. Not legal advice.**

- **Stand / Last updated:** 7 June 2026
- **Version:** 0.1 (Entwurf / Draft)
- **Surface:** Caelex Scholar (`caelex.eu/scholar`) — free, university-licensed
  (B2B2C), SSO-gated legal-research database, "powered by Atlas".
- **Binding language:** German. English is a convenience translation.
- **Maps to gap-analysis item:** G4 (Scholar-specific Art. 13 notice). Related:
  G1 (roles), G3 (purpose→basis + LIA), G5/G6/G18 (privacy-by-default), G7/G8/G9
  (erasure + export), G11/G12 (retention), G17 (minors), G21 (transfers), AI1/AI5
  (AI transparency).

This internal file records the **reasoning and source-grounding** behind the
public page (`/scholar/legal/privacy`). The user-facing DE+EN text lives in
`src/app/(scholar)/scholar/legal/_content/privacy-de.ts` / `privacy-en.ts` and is
rendered by the frozen `LegalDoc` shell.

---

## 1. Controller & contact (grounded facts)

| Field                   | Value                                                                                                  | Source                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Controller              | Caelex — Einzelunternehmen, Inhaber Julian Polleschner                                                 | `src/app/legal/impressum/page.tsx`    |
| Address                 | Am Maselakepark 37, 13587 Berlin, Deutschland                                                          | impressum                             |
| Tax status              | Kleinunternehmer § 19 UStG                                                                             | impressum                             |
| General contact         | cs@caelex.eu                                                                                           | impressum / FACTS                     |
| Data-protection contact | privacy@caelex.eu                                                                                      | impressum (`privacy@caelex.eu` block) |
| Competent DPA           | Berliner Beauftragte für Datenschutz und Informationsfreiheit (BlnBDI), Alt-Moabit 59–61, 10555 Berlin | platform `privacy-de.ts:282`          |

**DPO:** flagged `[TBD: confirm with counsel]`. Art. 37 GDPR + § 38 BDSG may make
a DPO mandatory once the DPIA (gap item G14/G15) concludes. Not asserted as
appointed.

---

## 2. Controller / processor split (B2B2C) — RACI per activity

The licensing **university = controller**; **Caelex = processor** for the
contracted service AND **Caelex = controller** for its own product/security/AI
decisions (dual role, GDPR Art. 28 + 26; EDPB 07/2020).

| Processing activity                                 | Role of university               | Role of Caelex       | Instrument       |
| --------------------------------------------------- | -------------------------------- | -------------------- | ---------------- |
| Provision of licensed DB to members (authn, access) | **Controller**                   | Processor            | Art. 28 AVV/DPA  |
| Account/identity (name, email via SSO)              | **Controller**                   | Processor            | AVV              |
| Settings (ScholarUserPreferences)                   | **Controller**                   | Processor            | AVV              |
| Bookmarks / reading lists                           | **Controller**                   | Processor            | AVV              |
| Search history (opt-in)                             | **Controller** (consent context) | Processor            | AVV              |
| Semantic search (AI ranking) — **product design**   | —                                | **Controller**       | this notice      |
| Security logging, abuse prevention (masked IP)      | —                                | **Controller**       | this notice (LI) |
| Maintenance, debugging, product development         | —                                | **Controller**       | this notice      |
| Art. 8 age / parental-consent handling              | **Controller** (allocate in AVV) | Processor / supports | AVV `[TBD]`      |

> The university-as-controller AVV itself is a separate `[LAWYER]` instrument
> (gap item G2) — adapt the platform DPA (`legal/dpa/_content/dpa-de.ts`).

---

## 3. Categories of personal data (grounded against schema)

Source: `prisma/schema.prisma:15169–15236` + `model LoginEvent` (3997).

| Category                | Fields                                                                                                                | Model                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Account / identity      | name, email (via SSO/credentials)                                                                                     | User / Account              |
| Settings                | uiLanguage, sourceLanguage, defaultJurisdiction, citationFormat, resultsPerPage, semanticSearch, searchHistoryEnabled | `ScholarUserPreferences`    |
| Search history (opt-in) | query, jurisdiction, createdAt                                                                                        | `ScholarSearchHistory`      |
| Bookmarks               | itemType, itemId, createdAt                                                                                           | `ScholarBookmark`           |
| Reading lists           | name, description, items (itemType/itemId/note/position)                                                              | `ScholarReadingList(+Item)` |
| Sign-in / security logs | timestamp, **masked IP**, user agent                                                                                  | `LoginEvent`                |

No Art. 9 special-category processing intended; notice asks users not to enter
sensitive data into free-text (query/note/list name).

---

## 4. Purpose → lawful basis map (Art. 6) — the core of the notice

| Purpose                                               | Lawful basis                                                     | Default          |
| ----------------------------------------------------- | ---------------------------------------------------------------- | ---------------- |
| Account + DB access (authn, deliver licensed service) | **Art. 6(1)(b)** contract / pre-contract; Art. 28 vs. university | on               |
| Bookmarks + reading lists                             | **Art. 6(1)(b)** contract                                        | on, **private**  |
| Store/display settings                                | **Art. 6(1)(b)** contract                                        | on               |
| Search history                                        | **Art. 6(1)(a)** consent                                         | **OFF (opt-in)** |
| Semantic search (AI)                                  | **Art. 6(1)(a)** consent                                         | **OFF (opt-in)** |
| Security logging / masked-IP / abuse                  | **Art. 6(1)(f)** legitimate interest                             | on               |
| Legal-obligation compliance                           | **Art. 6(1)(c)** legal obligation                                | n/a              |

**Privacy-by-default confirmed in code:** `ScholarUserPreferences.semanticSearch
@default(false)` and `searchHistoryEnabled @default(false)`
(`prisma/schema.prisma:15180,15182`). Bookmarks/lists are per-user, not shared.

### Short LIA pointer (security logging, Art. 6(1)(f))

- **Interest:** protect the service + users from attacks/abuse (brute-force,
  unauthorised access, integrity).
- **Necessity:** logging sign-in events is required to detect/limit abuse; rate
  limiting + lockout depend on it.
- **Balancing:** data-minimised (masked IP, short retention), foreseeable for a
  signed-in user, no special categories → protective interest prevails.
- **Safeguard:** Art. 21 objection right preserved.
- `[TBD: confirm with counsel — document the full standalone LIA (gap item G3).]`

---

## 5. Recipients / sub-processors (grounded)

Public page links to `/scholar/legal/sub-processors`. Live list named in
`src/app/legal/sub-processors/_content/sub-processors-data.ts`:

Vercel (host/CDN; US parent, EU regions) · Neon (DB, **eu-central-1 Frankfurt**)
· Upstash (rate-limit, eu-west-1 Dublin) · Stripe (payments — N/A to free Scholar
flow but present platform-wide) · Resend (email) · Sentry (errors, Frankfurt +
US fallback) · Anthropic (Atlas LLM — platform) · **OpenAI (embeddings for
semantic search, USA)** · Cloudflare · LogSnag (events, Canada) · Vercel Web
Analytics + Speed Insights.

Notice names the Scholar-relevant subset (Vercel, Neon, OpenAI, Resend, Google
OAuth, Upstash, Sentry, LogSnag) and defers the full/authoritative list to the
sub-processors page (avoids drift).

> `[TBD]` Google appears as the OAuth SSO IdP per FACTS; confirm it is reflected
> on the sub-processors page or add it there (separate lane).

---

## 6. International transfers (Art. 44–46)

- Primary processing in the EU; DB pinned to Neon **eu-central-1 (Frankfurt)**.
- US exposure: Vercel (US parent), **OpenAI (USA)** for embeddings when semantic
  search is enabled.
- Mechanism stated: **SCCs (Art. 46)** and/or **EU-US DPF** where applicable,
  plus supplementary measures (encryption in transit/at rest, minimisation,
  masked IP).
- `[TBD: confirm with counsel]` per-provider basis, signed DPAs/transfer
  agreements, and the **TIA** outcome (gap item G21). Copy-of-safeguards offer
  routed to privacy@caelex.eu.

---

## 7. Retention (Art. 5(1)(e))

| Category                                       | Period                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Account / settings / bookmarks / reading lists | until account deletion / licence end                                    |
| Search history                                 | **90 days** auto-sweep (+ on deletion)                                  |
| Sign-in / security logs                        | security-necessary duration, then delete/anonymise — `[TBD set period]` |
| Consent records                                | duration needed to evidence consent + statutory record-keeping          |

90-day search-history sweep aligns with the planned `data-retention-cleanup` cron
work (gap item G11).

---

## 8. Data-subject rights + how to exercise (Art. 15–22)

Rights listed: access (15), rectification (16), erasure (17), restriction (18),
portability (20), objection (21), withdrawal of consent (7(3)).

**Self-service (grounded in code):**

- Export: `/scholar/settings` → `/api/scholar/account/export`
  (`settings/page.tsx:739`); export now includes account + prefs + history +
  **bookmarks + reading lists** (gap item G9).
- Erasure: in-product account deletion in the Datenschutz tab
  (`settings/page.tsx:748`), cascading all 5 Scholar tables (gap item G7/G8).
- Toggles: search history + semantic search switchable; history deletable.
- Catch-all contact: privacy@caelex.eu; 1-month response (Art. 12(3)).

**Complaint:** BlnBDI (Berlin), Alt-Moabit 59–61, 10555 Berlin (Art. 77), or the
DPA of the user's residence/workplace.

---

## 9. Minors (Art. 8; DE digital-consent age 16)

- Audience = EU university students/staff; **some may be minors**.
- DE: Art. 8 valid from **16**; younger → parental consent.
- **Strategy (minimise Art. 8 dependence):** core functions on contract / LI;
  consent-features (history, semantic search) **OFF by default**; do **not**
  collect DOB / over-collect; child-friendly summary layer at the top.
- `[TBD: confirm with counsel]` allocate Art. 8 responsibility to the university
  in the AVV; SSO-mediated access means no separate age-gate is built.

---

## 10. AI transparency + no automated decision-making

- Semantic search = AI meaning-based ranking over embeddings; **limited/minimal
  risk**; **AI Act Art. 50** transparency notice present in the notice (and live
  in the search UI per AI1/AI5).
- **Art. 22 GDPR:** explicitly **no** solely-automated decision with legal /
  similarly significant effect — the AI ranks content, does not decide about the
  person. Research-aid + "verify against the official source" + "not legal
  advice" framing reinforces human-in-the-loop.

---

## 11. Cross-links used by the public page

- Imprint: `/legal/impressum`
- Sub-processors: `/scholar/legal/sub-processors`
- Cookies: `/scholar/legal/cookies`
- Settings (export/erasure/toggles): `/scholar/settings`

---

## 12. Open items for counsel (consolidated `[TBD]`)

1. DPO appointment decision (Art. 37 / § 38 BDSG) + publish contact. _(G15)_
2. Full standalone LIA for security logging. _(G3)_
3. Per-provider transfer basis + signed DPAs + TIA outcome. _(G21)_
4. Security-log retention period (set a concrete figure). _(G11/G12)_
5. Art. 8 allocation to university in the AVV; confirm no age-gate needed. _(G17)_
6. University-as-controller AVV instrument itself. _(G2)_
7. Final review of all user-facing DE+EN copy before publication. _(G4)_

---

## 13. Files in this lane

- `src/app/(scholar)/scholar/legal/privacy/page.tsx` — public page (wires shell).
- `src/app/(scholar)/scholar/legal/_content/privacy-de.ts` — DE (binding) body.
- `src/app/(scholar)/scholar/legal/_content/privacy-en.ts` — EN (convenience) body.
- `docs/legal/scholar/privacy-notice.md` — this internal working file.

Footer link label already exists in the `footer` i18n namespace
(`_i18n/footer.ts`, key `privacy`) and the footer already links
`/scholar/legal/privacy` — **no i18n change required** for this lane.
