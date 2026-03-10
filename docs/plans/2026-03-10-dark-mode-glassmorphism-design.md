# Dark Mode Glassmorphism Overhaul

**Date:** 2026-03-10
**Approach:** Hybrid — CSS token update + targeted key component enhancement

## Decision

- Solid black background stays (`--bg-base: #0a0a0f`) — no background image/gradient
- Glass depth through panel layering, not background transparency
- Light mode unchanged
- Only dark mode affected (`.dark &` / `.caelex-v2` scope)

## Glass Token System (3 Tiers)

### Glass Surface (Sidebar, Inputs, Standard Cards)

```
background: rgba(255, 255, 255, 0.06)
backdrop-filter: blur(40px) saturate(1.4)
border: 1px solid rgba(255, 255, 255, 0.12)
box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25)
refraction: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 50%)
```

### Glass Elevated (Active Cards, Panels, Charts)

```
background: rgba(255, 255, 255, 0.09)
backdrop-filter: blur(60px) saturate(1.5)
border: 1px solid rgba(255, 255, 255, 0.14)
box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3)
refraction: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 40%)
```

### Glass Floating (Modals, Toasts, Tooltips, Dropdowns)

```
background: rgba(255, 255, 255, 0.13)
backdrop-filter: blur(80px) saturate(1.6)
border: 1px solid rgba(255, 255, 255, 0.18)
box-shadow: 0 16px 64px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)
refraction: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 35%)
```

## Key Components (6 targeted)

### Sidebar

```
background: rgba(12, 12, 20, 0.80)
backdrop-filter: blur(60px) saturate(1.8)
border-right: 1px solid rgba(255,255,255, 0.08)
inset shadow: inset 0 1px 0 rgba(255,255,255, 0.06)
```

### TopBar (new glass treatment)

```
background: rgba(255, 255, 255, 0.04)
backdrop-filter: blur(40px) saturate(1.4)
border-bottom: 1px solid rgba(255,255,255, 0.06)
```

### GlassCard

Automatically picks up new token values (blur: 60px, bg: 0.09).

### Modals/Dialogs

Glass Floating tier (blur: 80px), darker backdrop overlay.

### Tables

```
default row: transparent
hover row: rgba(255, 255, 255, 0.04)
header: rgba(255, 255, 255, 0.03) with border-bottom
```

### Chart Containers

Glass Elevated with refraction highlight.

## Not Touched (auto-improved via CSS variables)

- ~60 module pages with `dark:` classes
- Assessment pages
- Landing page

## Files to Modify

1. `src/app/globals.css` — Glass utility classes + CSS variable tokens
2. `tailwind.config.ts` — Updated blur/shadow values
3. `src/components/dashboard/Sidebar.tsx` — Enhanced glass values
4. `src/components/dashboard/TopBar.tsx` — Convert to glass
5. `src/components/ui/GlassCard.tsx` — Picks up tokens automatically
6. Modals/Dialogs — Find and update glass treatment
7. Table patterns — Update dark row backgrounds
8. Chart containers — Add glass-elevated treatment
