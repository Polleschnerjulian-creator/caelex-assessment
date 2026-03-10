# Dark Mode Glassmorphism Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the dark mode glass system to produce deeper frosted-glass panels with stronger blur, higher contrast borders, refraction highlights, and more depth — all via CSS token changes + 6 targeted component updates.

**Architecture:** Hybrid approach. Step 1 updates CSS tokens in `globals.css` which auto-propagates to 31+ files using glass classes/variables. Steps 2-4 enhance the 6 most visible components directly. Light mode is completely untouched.

**Tech Stack:** CSS custom properties, Tailwind utilities, React inline styles.

---

### Task 1: Update Glass Utility Classes (globals.css lines 7-80)

**Files:**

- Modify: `src/app/globals.css:7-80`

**Step 1: Replace the 3 glass tier utility classes**

Find the `.glass-surface`, `.glass-elevated`, `.glass-floating` blocks (lines 7-39) and replace with stronger values + `saturate()` + refraction highlight pseudo-element:

```css
@layer utilities {
  /* Tier 1 — Base layer: sidebar, inputs, default cards */
  .glass-surface {
    .dark & {
      position: relative;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(40px) saturate(1.4);
      -webkit-backdrop-filter: blur(40px) saturate(1.4);
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
    }
  }
  .glass-surface::before {
    .dark & {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 50%);
      pointer-events: none;
    }
  }

  /* Tier 2 — Elevated: active cards, panels, charts */
  .glass-elevated {
    .dark & {
      position: relative;
      background: rgba(255, 255, 255, 0.09);
      backdrop-filter: blur(60px) saturate(1.5);
      -webkit-backdrop-filter: blur(60px) saturate(1.5);
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    }
  }
  .glass-elevated::before {
    .dark & {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 40%);
      pointer-events: none;
    }
  }

  /* Tier 3 — Floating: modals, toasts, tooltips, dropdowns */
  .glass-floating {
    .dark & {
      position: relative;
      background: rgba(255, 255, 255, 0.13);
      backdrop-filter: blur(80px) saturate(1.6);
      -webkit-backdrop-filter: blur(80px) saturate(1.6);
      border-color: rgba(255, 255, 255, 0.18);
      box-shadow: 0 16px 64px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2);
    }
  }
  .glass-floating::before {
    .dark & {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, transparent 35%);
      pointer-events: none;
    }
  }
```

Leave `.glass-interactive`, `.glass-accent`, and `.glass-glow` unchanged (lines 41-79).

**Step 2: Verify light mode override still works**

The `html:not(.dark)` block (lines 98-109) zeros out blur/bg/border tokens — this stays unchanged so light mode sees no glass effect.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: enhance glass utility classes with stronger blur and refraction"
```

---

### Task 2: Update CSS Variable Tokens (globals.css .caelex-v2 block)

**Files:**

- Modify: `src/app/globals.css:84-96` (root glass tokens)
- Modify: `src/app/globals.css:689-695` (.caelex-v2 glass variables)
- Modify: `src/app/globals.css:760-777` (.caelex-v2 shadow system)
- Modify: `src/app/globals.css:825-829` (.caelex-v2 sidebar glass)

**Step 1: Update :root glass tokens (lines 84-96)**

```css
:root {
  --glass-blur-surface: 40px;
  --glass-blur-elevated: 60px;
  --glass-blur-floating: 80px;
  --glass-bg-surface: rgba(255, 255, 255, 0.06);
  --glass-bg-elevated: rgba(255, 255, 255, 0.09);
  --glass-bg-floating: rgba(255, 255, 255, 0.13);
  --glass-border-subtle: rgba(255, 255, 255, 0.12);
  --glass-border-medium: rgba(255, 255, 255, 0.14);
  --glass-border-hover: rgba(255, 255, 255, 0.22);
  --glass-glow-emerald: rgba(16, 185, 129, 0.1);
  --glass-transition: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Step 2: Update .caelex-v2 glass surface variables (lines 689-695)**

```css
/* ─── Glass Surfaces ─── */
--glass-bg: rgba(255, 255, 255, 0.06);
--glass-bg-hover: rgba(255, 255, 255, 0.09);
--glass-bg-active: rgba(255, 255, 255, 0.12);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-border-hover: rgba(255, 255, 255, 0.16);
--glass-border-active: rgba(255, 255, 255, 0.2);
```

**Step 3: Update shadow system (lines 760-777) — deeper shadows**

```css
/* ─── Shadow System (5 elevations + inset + glows) ─── */
--shadow-xs: 0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2);
--shadow-md:
  0 4px 12px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.2),
  0 0 0 1px rgba(255, 255, 255, 0.04);
--shadow-lg:
  0 8px 24px rgba(0, 0, 0, 0.4), 0 16px 48px rgba(0, 0, 0, 0.25),
  0 0 0 1px rgba(255, 255, 255, 0.05);
--shadow-xl:
  0 16px 48px rgba(0, 0, 0, 0.5), 0 32px 80px rgba(0, 0, 0, 0.3),
  0 0 0 1px rgba(255, 255, 255, 0.06);
```

Leave `--shadow-inset`, `--shadow-glow-accent`, `--shadow-glow-success` unchanged.

**Step 4: Update sidebar glass variables (lines 825-829)**

```css
/* ─── Sidebar Glass Panel (dark mode) ─── */
--sidebar-glass-bg: rgba(12, 12, 20, 0.8);
--sidebar-glass-border: rgba(255, 255, 255, 0.08);
--sidebar-glass-shadow:
  0 8px 40px rgba(0, 0, 0, 0.35), 0 2px 12px rgba(0, 0, 0, 0.25),
  inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.2);
```

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "style: update dark mode glass and shadow tokens for deeper frosted effect"
```

---

### Task 3: Update Sidebar blur (Sidebar.tsx)

**Files:**

- Modify: `src/components/dashboard/Sidebar.tsx` — the `<aside>` wrapper style block

**Step 1: Update backdrop-filter from `blur(40px)` to `blur(60px)`**

Find the aside element's inline style and change:

```
backdropFilter: "blur(40px) saturate(1.8)"
```

to:

```
backdropFilter: "blur(60px) saturate(1.8)"
```

(and the matching `-webkit-` line)

The background/border/shadow will already pick up the new CSS variable values from Task 2.

**Step 2: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "style: increase sidebar glass blur to 60px"
```

---

### Task 4: Update GlassCard blur (GlassCard.tsx)

**Files:**

- Modify: `src/components/ui/GlassCard.tsx`

**Step 1: Increase backdrop blur and saturate**

Change:

```
backdrop-blur-[20px] backdrop-saturate-[1.2]
```

to:

```
backdrop-blur-[60px] backdrop-saturate-[1.5]
```

This will make all GlassCard instances (dashboard cards, chart containers, assure cards) automatically get the stronger glass effect.

**Step 2: Commit**

```bash
git add src/components/ui/GlassCard.tsx
git commit -m "style: increase GlassCard blur to 60px"
```

---

### Task 5: Visual verification

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Check these pages in dark mode**

- `/dashboard` — main cards should show frosted glass with refraction highlights
- `/dashboard/generate` — sidebar, document panels
- Any page with tables — rows should be transparent with subtle hover

**Step 3: Check for refraction `::before` overflow issues**

If any glass elements clip the refraction pseudo-element, add `overflow: visible` or ensure `position: relative` + `overflow: hidden` is set correctly.

**Step 4: Verify light mode is unchanged**

Switch to light mode and confirm everything looks identical to before.

---
