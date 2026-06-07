# Caelex Scholar — legal route (`/scholar/legal/*`)

Foundation for the Scholar app's public legal pages. **Doc agents:** read this
before authoring. You touch ONLY `_content/*.ts` and `<slug>/page.tsx` — the
shell (`_components/LegalDoc.tsx`, `_components/types.ts`) is built and frozen.

## Canonical slugs

Create one page per slug. The Scholar footer (`_components/ScholarFooter.tsx`)
already links to every one of these:

| Slug             | Route                           | Document                                   |
| ---------------- | ------------------------------- | ------------------------------------------ |
| `privacy`        | `/scholar/legal/privacy`        | Datenschutzerklärung / Privacy Policy      |
| `terms`          | `/scholar/legal/terms`          | Nutzungsbedingungen / Terms of Use         |
| `acceptable-use` | `/scholar/legal/acceptable-use` | Nutzungsrichtlinie / Acceptable Use        |
| `cookies`        | `/scholar/legal/cookies`        | Cookie-Hinweis / Cookie Notice             |
| `sub-processors` | `/scholar/legal/sub-processors` | Unterauftragsverarbeiter / Sub-processors  |
| `accessibility`  | `/scholar/legal/accessibility`  | Barrierefreiheitserklärung / Accessibility |
| `imprint`        | `/scholar/legal/imprint`        | Impressum / Imprint                        |

## How to create a page

1. Author two content files (DE binding + EN convenience) under `_content/`:
   - `_content/<slug>-de.ts` → `export const <SLUG>_DE: ScholarLegalDoc = { ... }`
   - `_content/<slug>-en.ts` → `export const <SLUG>_EN: ScholarLegalDoc = { ... }`
     Use SCREAMING*SNAKE for the const, with `-` in the slug becoming `*`(e.g.`acceptable-use`→`ACCEPTABLE_USE_DE`/`ACCEPTABLE_USE_EN`).

2. Add the page (server component, ~6 lines):

   ```tsx
   // _content shapes are imported by the page; LegalDoc picks DE/EN by locale.
   import { LegalDoc } from "../_components/LegalDoc";
   import { PRIVACY_DE } from "../_content/privacy-de";
   import { PRIVACY_EN } from "../_content/privacy-en";

   export default function Page() {
     return <LegalDoc de={PRIVACY_DE} en={PRIVACY_EN} />;
   }
   ```

   Add page `metadata` (title/description) as usual if desired.

## Content-file shape (`ScholarLegalDoc`)

Defined in `_components/types.ts`. Each edition is:

```ts
import type { ScholarLegalDoc } from "../_components/types";

export const PRIVACY_DE: ScholarLegalDoc = {
  lang: "de", // "de" | "en" — drives <article lang> + binding emphasis
  title: "Datenschutzerklärung",
  subtitle: "Caelex Scholar", // optional
  version: "Version 0.1 (Entwurf)",
  lastUpdated: "{{DATE}}", // placeholder OK until a real date is set
  preamble: ["…"], // optional lead paragraphs
  sections: [
    {
      id: "s1", // stable anchor id
      number: "§ 1", // optional eyebrow (DE: "§ 1"; EN: "Section 1")
      title: "Verantwortlicher",
      blocks: [
        { type: "p", text: "…" },
        { type: "subheading", text: "…" }, // <h3> inside the section
        { type: "ul", items: ["…", "…"] },
        { type: "num", items: ["…", "…"] },
        { type: "definition", term: "…", text: "…" },
        { type: "callout", variant: "warn", text: "…" }, // warn | info, monochrome box
      ],
    },
  ],
};
```

Block types: `p` · `subheading` (h3) · `ul` · `num` · `definition` · `callout`.
There is no inline-markup/HTML — plain strings only (XSS-safe, monochrome).

## Locale / threading

- `LegalDoc` resolves the active Scholar UI locale **itself** (server-side, from
  the session) and renders the German edition when `locale === "de"`, else the
  English edition. The DRAFT banner + "Stand/Last updated/Version" labels are
  localised across all 5 UI locales via the `legal` i18n namespace
  (`../../_i18n/legal.ts`); the document **body** is whatever edition was picked.
- A page MAY pass `<LegalDoc … locale={…} />` to force an edition, but normally
  you don't — omit it.

## Hard rules for doc bodies

- DE is the **binding** language; EN is a **convenience** translation. Keep them
  in sync.
- Every document is a **DRAFT pending counsel review** — LegalDoc renders the
  mandatory ENTWURF/DRAFT banner automatically; you do not add your own.
- STRICTLY MONOCHROME, WCAG 2.2 AA — handled by the shell; just supply text.
