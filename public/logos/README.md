# Comply Studio Brand Logos

Used by the V2 sidebar header (`src/components/dashboard/v2/V2Sidebar.tsx`).

## Files

| File                      | When shown | Color                |
| ------------------------- | ---------- | -------------------- |
| `comply-studio-dark.svg`  | Dark mode  | White on transparent |
| `comply-studio-light.svg` | Light mode | Black on transparent |

The V2 sidebar currently always renders dark mode, so the dark
variant is what users see. The light variant is wired up for the
future light-mode bridge.

## Current state

The committed SVGs are an **approximation** of the "caelex comply
studio" wordmark logo — a horizontal pattern of vertical bars with
the wordmark below. They render at 40px height in the sidebar.

To install the **exact** Comply Studio logo files, replace these
SVGs (or drop in PNG / JPG variants — the `next/image` loader
handles all common formats; just keep the file names the same):

```
public/logos/comply-studio-dark.{svg,png}
public/logos/comply-studio-light.{svg,png}
```

If you switch to PNG, also update the file extensions in
`V2Sidebar.tsx` (search for `comply-studio-dark.svg`).

## Sizing in the sidebar

- Header height: 72px
- Logo height: 40px (auto width based on aspect ratio)
- 16px horizontal padding (px-4)
- Aspect ratio is auto from the file content. Wider logos render
  fine; the sidebar is 244px wide so practical max is ~210px.
