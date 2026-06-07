# Scholar legal — content files

Doc agents add the legal-document content here, two files per page:

- `<slug>-de.ts` → `export const <SLUG>_DE: ScholarLegalDoc = { lang: "de", … }`
- `<slug>-en.ts` → `export const <SLUG>_EN: ScholarLegalDoc = { lang: "en", … }`

`ScholarLegalDoc` shape: `../_components/types.ts`. Full authoring contract +
canonical slug list: `../README.md`.

DE is the binding edition, EN is a convenience translation. Plain-string blocks
only (no inline HTML). The DRAFT banner + monochrome/WCAG styling are supplied
by `../_components/LegalDoc.tsx` — content files carry text only.
