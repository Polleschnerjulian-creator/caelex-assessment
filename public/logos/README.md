# Comply Studio Brand Logos

Two variants used by the V2 sidebar brand block:

- **`comply-studio-light.png`** — black-on-transparent logo, shown
  when the app is in light mode.
- **`comply-studio-dark.png`** — white-on-transparent logo, shown
  when the app is in dark mode (current V2 default).

The current files are placeholders sourced from the existing Caelex
brand assets (`/public/images/logo-{white,black}.png` — the square
Caelex C-mark). They render fine but don't match the new
"caelex comply studio" wordmark logo.

To install the proper assets, replace these files with the two
images you have:

/public/logos/comply-studio-dark.png ← white logo (dark-mode)
/public/logos/comply-studio-light.png ← black logo (light-mode)

The sidebar at `src/components/dashboard/v2/V2Sidebar.tsx` references
both via `next/image` and swaps via Tailwind's `dark:` modifier.
Aspect ratio is auto from the file (sidebar uses fixed height 22px,
width auto).
