# Caelex Scholar — Content-Presentation Redesign Concept

**Surface:** `caelex.eu/scholar` ("powered by Atlas") · SSO-gated, free, university-licensed legal-research reader
**Scope:** ONLY how individual content is presented — treaty, EU regulation, EU directive, national law, article/provision, case. Login page + page imagery + overall look are approved and unchanged.
**Hard constraints:** strictly monochrome (black / white / grays — no other hue); keep the approved premium/calm style; WCAG 2.2 AA; Next.js 15 App Router + Tailwind; design only around fields that exist per Input D.
**Status:** for product-owner sign-off BEFORE any code is written.

> **The headline decision.** The single biggest finding across all four inputs: Scholar's data is _rich_ but its presentation is _thin_. `source-detail.server.ts` throws away ~20 populated fields (dates ~55%, competent authorities ~60%, related sources ~72%) and the corpus has cross-reference, status, and provision structure that the UI never renders. This redesign is **80% surfacing existing data through a disciplined monochrome reading shell, and 20% removing the 4 color leaks** — it is overwhelmingly a frontend + thin-DTO effort with near-zero new data work.

---

## 1. Design principles for Scholar (Apple-derived, monochrome, Tailwind-translatable)

The governing idea (Apple's Clarity / Deference / Depth): **the legal text is the product; the chrome disappears.** In a grayscale UI, hierarchy is built from **size + weight + tonal step + spacing + grouping** — never hue. The monochrome mandate is the purest expression of Apple's "differentiate without color" rule, so it is an asset, not a limitation.

> **Reuse, don't reinvent, the type system.** The project already ships a semantic type scale in `tailwind.config.ts` (`text-micro` 10 → `text-display-lg` 48). The current Scholar code violates this with 16 ad-hoc `text-[Npx]` sizes (confirmed in `SourceRow`/`CaseRow`/source-detail). **Rule #1: kill every `text-[Npx]`; map to the named tokens below.** This is consistent with the approved style by construction.

### 1a. Type scale — map Apple's ratio system onto the existing tokens

| Scholar role                                  | Token (existing)              | px     | Weight                  | Tracking                   | Line-height                   |
| --------------------------------------------- | ----------------------------- | ------ | ----------------------- | -------------------------- | ----------------------------- |
| Document title (treaty/law/case name)         | `text-display-sm`             | 24     | `font-semibold`         | `tracking-tight`           | `leading-snug`                |
| Part / Chapter heading                        | `text-heading`                | 18     | `font-semibold`         | `tracking-tight`           | `leading-snug`                |
| Section / Article heading                     | `text-title`                  | 16     | `font-semibold`         | `tracking-normal`          | `leading-snug`                |
| Provision label / lead-in                     | `text-body-lg`                | 14     | `font-semibold`         | `tracking-normal`          | `leading-snug`                |
| **Reading body (summaries, facts, holdings)** | **`text-body-lg`**            | **14** | **`font-normal`**       | `tracking-normal`          | **`leading-relaxed` (1.625)** |
| Secondary / metadata / source lines           | `text-small`                  | 12     | `font-normal`           | `tracking-normal`          | `leading-normal`              |
| Eyebrow / status / section labels             | `text-micro`                  | 10     | `font-bold` `uppercase` | `tracking-[0.08em]` (wide) | —                             |
| Citations, section numbers, pin-cites         | `font-mono` @ `text-small` 12 | 12     | `font-normal`           | `tracking-normal`          | —                             |

Two Apple patterns to honor:

- **Inverse tracking** — large headings get _tighter_ (`tracking-tight`); 10px eyebrows get _looser_ (`tracking-[0.08em]`). Never the reverse. (Current code uses `tracking-[0.04em]` on 9px labels — bump to `text-micro` 10px + wider tracking.)
- **Weight is the primary emphasis tool.** Body = `font-normal`. Reserve `font-semibold` for the provision lead-in ("Art. VI — …") and `font-semibold` for the few true titles. Never stack emphasis (bold + underline + size).

> **One decision to flag for the owner:** body reading text. Apple's reference Body is 17px; the project's marketing body is 14px (`text-body-lg`). **Recommendation: 14px (`text-body-lg`) for reading**, because (a) it matches the existing approved surface, (b) the Scholar "reading column" is summaries/facts/holdings — _short editorial prose_, not 17px verbatim statute (verbatim `paragraphText` exists for only 10 provisions corpus-wide, per Input D, so there is no long-form statute column to optimize for). If the owner wants the maximal Apple reading feel, bump to 15px (`text-subtitle`). Either is AA-safe.

### 1b. Reading measure + rhythm

- **Measure:** reading prose constrained to **`max-w-[68ch]`** (≈66 chars/line — the Apple + Baymard + Bringhurst consensus). Body text must NEVER run full pane width and must NEVER justify — **ragged-right only** (`text-left`). The corpus may be wide (sidebar + rails); the _prose_ stays narrow.
- **Spacing rhythm (8-pt grid, Tailwind defaults only):** `1/2/3/4/6/8/12/16`. The discipline = **tight within a group, open between groups**: within a provision `space-y-2`/`space-y-3`; between provisions `space-y-8`; between major blocks (metadata → provisions → cross-refs) a hairline divider + `space-y-12`.
- **Page frame:** `px-6` mobile → `px-8`/`px-12` desktop; whitespace frames the text (Deference). Keep the approved `max-w-6xl` page container from `ScholarPage.tsx`.

### 1c. Monochrome contrast ladder (the color substitute) — verify every step

Establish a 4-step neutral ramp with assigned _roles_, never decoration. On the approved `#F7F8FA` canvas / white cards:

| Role                                      | Light token                    | Contrast target                                                                                                                               |
| ----------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary text (headings, body)             | `text-gray-900`                | **≥ 7:1** (Apple enhanced) — `gray-900` on white ≈ 17:1 ✓                                                                                     |
| Secondary text / labels                   | `text-gray-700`                | ≥ 4.5:1 — `gray-700` on white ≈ 9:1 ✓                                                                                                         |
| Tertiary / metadata / muted               | `text-gray-600`                | ≥ 4.5:1 — `gray-600` on white ≈ 5.7:1 ✓ (do NOT drift to `gray-500` on white for body — `gray-500` ≈ 4.6:1, borderline; reserve for non-text) |
| Borders / dividers / focus rings / glyphs | `border-gray-300` / `gray-400` | **≥ 3:1 (non-text)** — `gray-200` ≈ 1.4:1 **FAILS**; bump load-bearing rules to `gray-300`+                                                   |

> **Flag:** the current code's hairlines (`border-gray-100`, `border-gray-200/70`) and the 9px `text-gray-500` labels are _decorative-grade_; where a divider or label is **load-bearing** (status pill border, section divider that conveys a semantic break, focus ring) it must clear **3:1** → use `gray-300`. Apple's most common monochrome failure is "elegant" light-gray that fails contrast; we explicitly avoid it.

### 1d. Status & meaning WITHOUT color (core to this UI)

Every state must be encoded by **text + weight + shape (outlined pill) + optional monochrome glyph** — never tone or a colored dot alone. This removes all four audited color leaks:

- **Status pill (in force / superseded / draft / repealed):** `inline-flex items-center gap-1 border border-gray-300 rounded-full px-2 py-0.5 text-micro uppercase tracking-wide text-gray-700` + a small Lucide glyph (e.g. `Check` / `Archive` / `FileEdit` / `Ban`). Replaces `CaseRow`'s blue/orange/amber/red `statusBadgeClass`.
- **Relevance (fundamental/critical/high/…):** replace `SourceRow`'s red/amber dots with a **monochrome filled-bar glyph** (▮▮▮▯ style, 4 steps) or a gray-step dot **always paired** with the existing `sr-only` label. (Already half-right: `fundamental`/`medium`/`low` are gray; just convert `critical`→`gray-900` darkest, `high`→`gray-700`.)
- **Compliance hint box:** replace the `bg-amber-50/border-amber-200/text-amber-900` box with a neutral `bg-gray-50 border-l-2 border-gray-400 text-gray-700` callout, label "Compliance-Hinweis" in `font-semibold text-gray-900`.
- **Search error text:** `text-red-700` → `text-gray-900` + an `AlertCircle` glyph.

### 1e. Focus & motion

- **Focus:** keep + standardize the already-good pattern — `focus-visible:ring-2 ring-gray-900 ring-offset-2 ring-offset-[#F7F8FA]` on **every** interactive element. ≥3:1 (gray-900 ring clears it easily). Never suppress outlines.
- **Targets:** 44×44pt minimum (current `py-3.5` rows ✓; ensure disclosure toggles, chips, TOC links, copy buttons all reach it).
- **Motion:** honor `prefers-reduced-motion` (the code already uses `motion-safe:`). Disclosure expand/collapse and page transitions degrade to **instant or cross-fade** — no slides/parallax. Default motion stays subtle (Deference). Chevron rotation on disclosure is fine under `motion-safe:`.
- **Dark mode:** Scholar canvas is currently light (`#F7F8FA`). Keep light as the shipped theme; if a dark variant is ever added, re-verify all three thresholds in both themes (gray steps don't invert linearly) — but **dark mode is out of scope for this effort.**

---

## 2. Information architecture

**Search-first, browse-as-scaffold** (Input B): the dominant entry is the existing prominent search field; faceted browse is the structured fallback and the way to grasp the corpus. Keep both. Primary organizing axis = **content type**, because the types behave differently and users think in these buckets.

### 2a. Navigation model (Apple sidebar + content pane)

- **Keep** the approved `ScholarShell` left sidebar (Suche / Jurisdiktionen / Bibliothek / Rechtsprechung). It is the corpus map — unchanged visually.
- **Content pane** = the reading surface, single narrow column (§1b).
- **Add an optional right rail** on detail pages: this document's **in-page TOC** + **cross-references**. Apple's "controls close to the content they modify." On narrow viewports the rail collapses to an inline disclosure above the body.

### 2b. Location WITHOUT breadcrumb trails (Apple rule)

Apple is explicit: **don't build multi-segment clickable breadcrumb paths.** Instead:

- A **sticky in-document header** in the content pane that shows the current document title (and, on scroll into a long act, the active Article — e.g. "Outer Space Treaty · Art. VI"), driven by scroll-spy.
- A **single, context-aware back link** — fix the current bug where source-detail always returns to `/scholar`. Pass an `?from=` param (or read `referer`) so "Zurück" returns to Library / the Jurisdiction page / Search results the user actually came from.
- Show place via **sidebar selection state**, not a `Home › Treaties › OST › Art. VI` chain.

> _Note on Input B's breadcrumb suggestion vs. Input A's no-breadcrumb rule:_ these conflict. **We follow Apple (Input A): no clickable multi-segment breadcrumbs.** The sticky doc-title header + back link + sidebar selection deliver the same "where am I" without the anti-pattern.

### 2c. In-document TOC + section anchors (highest-leverage reading aid)

- Every provision (`key_provisions[]`) and every case section gets a **stable anchor id** (`#art-vi`, `#facts`, `#holding`) → deep-linkable + copy-able.
- A **sticky TOC** (right rail desktop / inline disclosure mobile) with **scroll-spy** (IntersectionObserver) highlighting the active section in `font-semibold text-gray-900` vs `text-gray-600` inactive. Smooth-scroll on click (under `motion-safe:`).

### 2d. Cross-references (turn dead-ends into a graph)

The corpus has `related_sources` (~72%), `amends`/`amended_by`/`implements`/`superseded_by`, and helpers `getRelatedSources()` / `getLegalBasisChain()` already exist — **none rendered today.** Add a **"Verwandte Quellen" cross-reference block** + inline links so reading becomes navigation. Add the **reverse case↔source link** (a source shows "Fälle, die diese Quelle anwenden" by scanning `applied_sources`).

### 2e. Search results scannability

Each hit row shows **title + type + jurisdiction + identifier/snippet**, with **matched query terms emphasized by weight or subtle gray highlight** (not yellow). Surface the dropped `score` as a monochrome relevance glyph and keep the `semanticAvailable` signal as a quiet "Semantische Suche aktiv" note. (Search currently drops the snippet and the score — Input C/D.)

---

## 3. Per-content-type display patterns

All sources share **one document shell** (predictability = Apple Consistency); type-specific bands appear only when their fields are populated. **The atomic unit is the provision** — section + title + summary (always present); `complianceImplication` ~⅓ of the time. **Do NOT design around verbatim `paragraphText`** (10 provisions corpus-wide, 600-char capped) — render it only as a progressive-enhancement block when present.

### Shared document shell (every source type)

```
┌─ Back link (context-aware)
├─ STICKY DOC HEADER (title + active section on scroll)
├─ Document header card
│   • Eyebrow: TYPE LABEL (text-micro, uppercase)           ← source.type via TYPE_LABELS
│   • h1 title (display-sm)                                   ← title (lang-resolved)
│   • title_local italic, muted (if differs)                 ← titleLocal (~32%)
│   • METADATA STRIP (key:value, not 4 identical chips):
│       Status pill (outlined, glyph)                         ← status (100%)
│       Jurisdiction · Issuing body                           ← jurisdiction, issuingBody (100%)
│       Identifier (mono): official/parliamentary/un_reference ← (~29% / sparse)
│       DATES line: "Erlassen {date_enacted} · In Kraft {date_in_force} · Geändert {date_last_amended}"  ← NEW, ~55/20/24%
│       Competent authorities (if present)                    ← NEW, ~60%
│   • scope_description (reading prose, max-w-[68ch])          ← scopeDescription (~54%)
│   • "Amtliche Quelle ansehen →" external link               ← sourceUrl (100%)
│   • "Caelex-Übersetzung" provenance note when translated     ← provenance guardrail (Input D)
├─ [right rail] In-page TOC (provisions) + scroll-spy
├─ "Schlüsselbestimmungen" — provision list (see 3e)
├─ "Verwandte Quellen" cross-ref block                        ← related_sources/amends/implements/superseded_by (NEW)
├─ "Fälle, die diese Quelle anwenden" reverse-link            ← scan applied_sources (NEW)
└─ Footer: last_verified line + "Kein Rechtsrat" disclaimer    ← last_verified (100%, currently dropped on sources)
```

**Metadata-strip rule:** the current 4 identical gray chips give equal weight to unequal facts. Replace with a **key:value strip** — status as the one outlined pill (it's the action-relevant fact), everything else as `label (gray-600) value (gray-900)` pairs. This is the monochrome hierarchy lever.

### 3a. International treaty (`international_treaty`)

- **Type eyebrow** "TREATY". **Identifier** = `un_reference` (mono) when present (sparse, ~20 records).
- **Show (treaty-specific, currently ignored):** `applies_to_jurisdictions[]` → "Vertragsparteien" list of country codes (sparse ~62 but high-value); `signed_by_jurisdictions[]` → "Nur unterzeichnet" sub-list (very sparse ~4 — render only if present). Dates → "Angenommen / In Kraft".
- **Provisions:** Preamble → Articles (each anchored). **Omit:** competent_authorities (rarely meaningful for a treaty), amendment timeline (sparse).

### 3b. EU regulation (`eu_regulation`)

- **Type eyebrow** "EU-VERORDNUNG" + a one-line affordance note "Unmittelbar geltend" (regulation = directly applicable). **Identifier** = `official_reference` (CELEX/OJ, mono).
- **Show:** dates as "Erlassen / In Kraft / Anwendbar ab"; `implements`/`amended_by` chain in the cross-ref block; `related_sources`.
- **Provisions:** recitals (collapsed by default — long, secondary) → chapters → articles. **Omit:** national-transposition band (that's directive-only).

### 3c. EU directive (`eu_directive`)

- **Type eyebrow** "EU-RICHTLINIE" + affordance note "Umsetzung in nationales Recht erforderlich" — the single most directive-specific concept, currently invisible.
- **Show:** the **transposition relationship** via `applies_to_jurisdictions[]` ("Gilt für Mitgliedstaaten") + cross-links to national implementing acts through `related_sources`/`amended_by`. Dates as "Erlassen / Umsetzungsfrist" if `date_in_force` carries it.
- **Omit/degrade gracefully:** if no transposition data is populated for a given directive, render the affordance note only (don't show an empty band).

### 3d. National law (`federal_law` / `federal_regulation`)

- **Type eyebrow** "GESETZ" / "VERORDNUNG". **Identifier** = `parliamentary_reference` / `official_reference` (BGBl. etc., mono).
- **Show:** "Erlassen / In Kraft / Zuletzt geändert" dates; **`competent_authorities[]`** as a "Zuständige Behörden" block (~60% — high-value, never shown today).
- **Progressive enhancement (showcase laws only):** if `legislative_history[]` (sparse ~73) or `amendments[]` (very sparse ~5) is present, render a **collapsed monochrome vertical timeline** ("Gesetzgebungsverlauf") above provisions. **Do NOT make this baseline** — appears only when data exists.
- **Provisions:** Parts → sections → subsections, each anchored.

### 3e. Article / provision (the atomic unit — inline on source detail)

Render in-context within its parent (default), with the parent TOC visible; optional "focus this provision" deep-link. Per provision card:

```
┌─ [anchor id="#art-vi"]
├─ Section label (mono pill, gray)                ← section (RICH)
├─ h3 provision title (text-title)                ← title (RICH)
├─ Summary (reading prose, text-body-lg)          ← summary (RICH)
├─ Compliance-Hinweis (neutral callout, ~⅓)       ← complianceImplication (MEDIUM)
├─ [if present] Verbatim text block (mono)        ← paragraphText (VERY SPARSE 10, 600-cap)
│     + "Vollständiger Text bei der amtlichen Quelle →" when truncated
└─ Copy-pinpoint-citation button + permalink      ← NEW (frontend; builds from id + section)
```

- **Add:** stable anchor, a **copy-pinpoint** button ("Art. VI kopieren"), and a per-provision permalink (`#art-vi`). **No** per-provision date/status (provisions don't carry their own).

### 3f. Case law (`LegalCase` — already the richest, already monochrome in detail)

Keep the strong section-card structure; **add missing fields + reverse links + wire German translation**.

```
┌─ Back link (context-aware)
├─ STICKY DOC HEADER
├─ Header card
│   • Eyebrow: forum_name                          ← forum_name (100%)
│   • h1 case caption                              ← title (100%)
│   • "Plaintiff gegen Defendant"                  ← plaintiff/defendant (100%)
│   • Metadata strip:
│       Status pill (outlined, glyph)              ← status (100%)
│       Precedential weight (label:value)          ← precedential_weight (100%)
│       Forum · Jurisdiction · date_decided        ← (100%)
│       date_filed + case_number (mono)            ← NEW (sparse 11/15 — show if present)
│       Citation (mono)                            ← citation (~83%)
│   • "Amtliche Entscheidung ansehen →"            ← source_url (100%)
├─ [right rail] TOC: Sachverhalt / Entscheidung / Leitsatz / Bedeutung / Rechtsfolge / Hinweise
├─ Section cards (each anchored):
│     Sachverhalt          ← facts (100%)
│     Entscheidung         ← ruling_summary (100%)
│     Leitsatz / Holding   ← legal_holding (100%)
│     Bedeutung            ← industry_significance (100%)
│     Rechtsfolge/Sanktion ← remedy (MEDIUM ~37%) — monetary + amount_local + non_monetary
│     Hinweise             ← notes (~26%)
├─ "Beteiligte" chips                              ← parties_mentioned[] (100%, currently search-only) NEW
├─ "Angewandte Rechtsquellen" → source pages       ← applied_sources (100%)
└─ Footer: "Zuletzt verifiziert {last_verified}" + disclaimer
```

- **Add:** `case_number` + `date_filed` (show only when present), `parties_mentioned[]` as "Beteiligte" chips, anchors + TOC, copy-citation (use `citation`/ECLI as canonical), and a count-based **"Zitiert in / Referenzen" mini-citator** (in-corpus, derived).
- **Fix (Input D gap):** case bodies render **English-only** today — `getTranslatedCase()` exists but isn't called. **Recommendation: wire `getTranslatedCase` so case bodies follow the user's `sourceLanguage` pref** (DE coverage exists; FR sparse; fall back to EN). Flag for owner: this is the one "wire an existing-but-unused function" item with real translation-coverage caveats.
- **Color fix:** the leak is in `CaseRow` badges, not the detail (detail is already `bg-gray-100`). Convert `CaseRow` to the outlined monochrome status pill.

---

## 4. Feature canon — prioritized

`[FE]` = pure frontend / thin-DTO (no schema). `[DTO]` = needs the thin Scholar projection widened to pass already-existing corpus fields (no DB, no new data). `[DATA?]` = depends on sparse existing data; ship as progressive enhancement.

### P0 — Defines a usable, honest legal reader

| Feature                                                                                                    | Rationale                                                             | Type                                                 |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| Kill all 4 color leaks → monochrome status/relevance/hint/error                                            | The brief's hard rule; AA "differentiate without color"               | **[FE]**                                             |
| Adopt semantic type tokens (kill 16 ad-hoc px sizes)                                                       | Consistent hierarchy across all 5 types; matches approved style       | **[FE]**                                             |
| Reading measure `max-w-[68ch]`, ragged-right, 8-pt rhythm                                                  | Comprehension + the "wall of text" fix                                | **[FE]**                                             |
| **Widen source DTO: dates / competent_authorities / identifiers**                                          | Richest unused fields (~55/60%); "is this law current?" answerability | **[DTO]**                                            |
| Status & in-force clarity (pill + dates line), localized status labels                                     | Users wrongly assume online law is current; prevents citing wrong law | **[DTO]**                                            |
| In-page TOC + section/provision anchors + scroll-spy                                                       | #1 navigation aid for long acts/judgments                             | **[FE]**                                             |
| Copy-pinpoint-citation (Art./§/¶) + per-provision permalink                                                | The #1 research action; teaching/citing breaks without it             | **[FE]**                                             |
| Context-aware back link (fix always-`/scholar` bug) + sticky doc title                                     | Apple "show location, no breadcrumb trail"                            | **[FE]**                                             |
| Search-result scannability: type+jurisdiction+identifier+snippet + matched-term emphasis + relevance glyph | Nonlinear scanning; surfaces dropped `score`/snippet                  | **[FE]** _(snippet may need search DTO to carry it)_ |
| Metadata strip (key:value) replacing 4 identical chips                                                     | Monochrome hierarchy; unequal facts get unequal weight                | **[FE]**                                             |
| Official-source link + "Caelex-Übersetzung" provenance note                                                | Academic integrity; translations aren't authentic text                | **[FE]**                                             |

### P1 — Turns it into a real research/teaching tool

| Feature                                                                                            | Rationale                                                       | Type                                            |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Cross-reference block (related/amends/implements/superseded-by) + inline links                     | Reading→navigation; helpers already exist, 0 data work          | **[DTO]**                                       |
| Reverse case↔source links ("Fälle, die diese Quelle anwenden")                                     | Closes the citator loop; derive from `applied_sources`          | **[DTO]**                                       |
| Per-type presentation bands (treaty parties / directive transposition / reg "directly applicable") | Each type _reads_ as itself; uses existing sparse fields        | **[DTO]/[DATA?]**                               |
| Faceted browse (jurisdiction/type/topic/chronology) + counts + removable chips                     | Grasp the corpus; tasks complete faster (NN/g)                  | **[FE]** _(topic = `compliance_areas`, exists)_ |
| Cases index upgrade: keyword search + date sort + compliance-area filter + cap                     | Chronology matters for case law; index is currently 2 dropdowns | **[FE]**                                        |
| Jurisdiction detail: authorities + national vs applicable-international split                      | All backed by existing unused helpers                           | **[DTO]**                                       |
| Wire `getTranslatedCase` (German case bodies follow pref)                                          | Closes the English-only gap; DE coverage exists                 | **[FE]**                                        |
| Bookmarks / reading lists (course reading lists for teaching)                                      | Core student/researcher/teaching workflow                       | **[DATA]** _(needs a small saved-items model)_  |
| Keyboard nav (⌘K search, next/prev section, copy-cite shortcut)                                    | Power users + accessibility on a large corpus                   | **[FE]**                                        |
| Print / clean single-source export with citation footer                                            | Students print + submit                                         | **[FE]**                                        |

### P2 — Differentiators / polish

| Feature                                                                                       | Rationale                                              | Type          |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| Side-by-side jurisdiction / language comparison                                               | Powerful for comparative space-law teaching; expensive | **[FE]**      |
| Collapsible recitals / long preambles (EU acts)                                               | Progressive disclosure; reduce cognitive load          | **[FE]**      |
| Legislative-history vertical timeline (showcase laws)                                         | Rich _type_, sparse data → enhancement only            | **[DATA?]**   |
| Definitions/glossary on hover (a11y tooltip: role, aria-describedby, Esc, non-hover fallback) | Supplement comprehension                               | **[FE/DATA]** |
| Saved searches + alerts                                                                       | Researchers track developing areas                     | **[DATA]**    |
| Annotation / highlighting on a source                                                         | Students annotate while reading                        | **[DATA]**    |
| Personalized display prefs (default language/version/density)                                 | EUR-Lex parity; pref infra partly exists               | **[DATA]**    |

> **Deliberately OMITTED** (data doesn't support it, per Input D): a verbatim-statute reading column (10 provisions only, 600-char cap); a "consolidated/as-in-force-on-[date] version selector" (no point-in-time version data exists — only single date fields); ratification matrices beyond the sparse `applies_to_jurisdictions`. Designing these would imply data we don't have. The status **dates line** delivers the honest, achievable slice of "is this current?".

---

## 5. Keep vs change (mapped to audited files)

**KEEP (do not touch the approved look):**

- `ScholarShell.tsx` — sidebar, nav pill, `#F7F8FA` canvas, wordmark. Unchanged.
- `ScholarPage.tsx` — `max-w-6xl px-6 py-12` container, `lang="de"`. Unchanged.
- Card vocabulary (`rounded-2xl bg-white border-gray-200/70 shadow-sm`) — cohesive; keep.
- Login page + all page imagery — out of scope, untouched.
- `settings/page.tsx` + `SettingsForms.tsx` red/green/amber — out of content-presentation scope; leave.
- The good `motion-safe:` + `focus-visible:` patterns — keep, standardize everywhere.

**CHANGE / REFACTOR:**

- `source-detail.server.ts` — **widen `ScholarSourceDetail`** to pass `date_enacted/in_force/last_amended`, `competent_authorities`, `official/parliamentary/un_reference`, `relatedSources`+chain, `last_verified`, `applies_to_jurisdictions`, `appliesToType` affordance. (The data-layer `getLegalSourceById` already returns these uncapped — this is a projection change, **no DB, no new data**.)
- `sources/[id]/page.tsx` — rebuild into the shared shell: metadata strip, dates line, authorities, type-specific band, cross-refs, reverse case links, TOC+anchors, copy-cite, provenance note, context-aware back link. Remove `bg-amber-*` hint box → neutral callout.
- `SourceRow.tsx` — remove `bg-red-600`/`bg-amber-600` dots → monochrome relevance glyph; map `text-[9px]`→`text-micro`, `text-[14px]`→`text-body-lg`, etc.
- `CaseRow.tsx` — replace `statusBadgeClass` color map → outlined monochrome status pill; same token migration.
- `cases/[id]/page.tsx` — add `case_number`/`date_filed`/`parties_mentioned`, anchors+TOC, copy-cite, reverse mini-citator; wire `getTranslatedCase`; token migration.
- `scholar/page.tsx` (search) — result snippet + matched-term emphasis + relevance glyph; surface `score`/`semanticAvailable`; convert example chips to localized DE; `text-red-700`→monochrome error.
- `jurisdictions/[code]/page.tsx` — add authorities + national/international split (existing helpers); fix `title_en`-forcing to honor `sourceLanguage`.
- `cases/page.tsx` — keyword search + date sort + compliance-area filter + cap.
- `scholar-search.server.ts` — carry a snippet + `score` to the hit DTO (if P0 highlighting needs it).

**CREATE (new shared components):**

- `_components/DocumentShell.tsx` — header + metadata strip + body + rails wrapper (the one shell all types use).
- `_components/MetadataStrip.tsx` — key:value + status pill.
- `_components/StatusPill.tsx` — outlined monochrome status (sources + cases).
- `_components/RelevanceGlyph.tsx` — monochrome relevance indicator + `sr-only`.
- `_components/InDocTOC.tsx` (client) — scroll-spy TOC.
- `_components/CrossRefBlock.tsx` — related/amends/implements/superseded + reverse case links.
- `_components/CopyCitation.tsx` (client) — copy-pinpoint button.
- `_components/ProvisionCard.tsx` — the atomic provision unit (anchor + copy + verbatim).
- `_components/Eyebrow.tsx` + token constants — kill ad-hoc px sizes centrally.

---

## 6. Phased build plan (each step independently shippable)

**Phase 0 — Monochrome + type-token foundation (P0, pure FE, no data)**

1. Add Scholar token constants + `Eyebrow`/`StatusPill`/`RelevanceGlyph`; migrate `SourceRow` + `CaseRow` off all color + all `text-[Npx]`. _(Removes 3 of 4 leaks; visible win, zero risk.)_
2. Remove `bg-amber-*` compliance-hint box + `text-red-700` error → neutral. _(4th leak gone; surface is now strictly monochrome — sign-off checkpoint.)_

**Phase 1 — Reading shell + surfacing the data (P0, FE + thin DTO)** 3. Build `DocumentShell` + `MetadataStrip`; refactor source-detail to use them (metadata strip replaces 4 chips). 4. Widen `ScholarSourceDetail`; render **dates line + competent authorities + identifier + last_verified**. _(The biggest perceived-value jump; "is this current?" answered.)_ 5. Add `ProvisionCard` with **anchors + copy-pinpoint + permalink**; add `InDocTOC` + scroll-spy. 6. Fix **context-aware back link** + sticky doc-title header.

**Phase 2 — Search & per-type identity (P0/P1)** 7. Search results: snippet + matched-term emphasis + relevance glyph + `score`/`semanticAvailable` (DTO carry if needed); localize chips. 8. **Per-type bands:** treaty parties, directive transposition note, regulation "directly applicable" note, recital collapse. 9. Case detail: `case_number`/`date_filed`/`parties_mentioned` + anchors/TOC/copy-cite; wire `getTranslatedCase`.

**Phase 3 — Research graph & browse (P1)** 10. `CrossRefBlock` (related/amends/implements/superseded) + inline cross-ref links. 11. Reverse case↔source links + count-based mini-citator. 12. Faceted browse (jurisdiction/type/topic via `compliance_areas`/chronology) + counts + chips; cases-index search/sort/filter; jurisdiction-detail authorities + national/international split. 13. Keyboard nav (⌘K, section jumps, copy shortcut) + print/clean export.

**Phase 4 — Workflow & polish (P1/P2)** 14. Bookmarks / reading lists (new saved-items model) — the first item needing schema. 15. Citation export (OSCOLA/Bluebook), legislative-history timeline (showcase), a11y glossary tooltips, side-by-side comparison, saved searches/alerts, annotations.

**Sign-off gates:** after Phase 0 (monochrome verified) → after Phase 1 (reading shell + data surfacing) → then P1/P2 by appetite. Phases 0–3 are essentially **all frontend + one thin-DTO widening with zero new data and zero schema** until Phase 4.

---

### Key file references (all absolute, in the Scholar worktree)

- DTO to widen: `/Users/julianpolleschner/caelex-assessment/.worktrees/caelex-scholar/src/lib/scholar/source-detail.server.ts`
- Color leaks: `_components/SourceRow.tsx` (lines 41–47 dots), `_components/CaseRow.tsx` (lines 41–57 `statusBadgeClass`), `sources/[id]/page.tsx` (lines 155–168 amber box), `scholar/page.tsx` (`text-red-700`)
- Rich data contracts (what's available): `src/data/legal-sources/types.ts:308–396`, `src/data/legal-cases/types.ts:65–141`
- Unused helpers to wire: `src/data/legal-sources/index.ts` — `getRelatedSources`, `getLegalBasisChain`, `getApplicableInternationalSources`, `getNationalSources`, `getAuthoritiesByJurisdiction`
- Existing semantic type scale to reuse: `tailwind.config.ts` (`text-micro`…`text-display-lg`)
- Pages to refactor: `src/app/(scholar)/scholar/{sources/[id],cases/[id],cases,jurisdictions/[code],library,page}.tsx`
- Translation gap: `getTranslatedCase` exists in `src/data/legal-cases/index.ts` but is not called by Scholar case pages.
