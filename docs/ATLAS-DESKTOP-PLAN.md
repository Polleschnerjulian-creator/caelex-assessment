# Atlas Desktop — Concept & Build Plan

> **Status:** Concept — awaiting sign-off before any code is written.
> **Author:** Claude + Julian
> **Date:** 2026-05-05
> **Persistent doc** — survives compaction.

---

## 1. Why a downloadable Atlas

Atlas is the only Caelex product that's a _daily driver_. Counsel opens
it in the morning, leaves it open all day, and it sits between them
and their work for 8 hours. That's the canonical "this belongs in the
Dock" use case — the same reason Slack, Linear, Notion, and Figma all
ship desktop apps even though their web versions work fine.

Three concrete payoffs we can't get from the browser:

1. **Offline cases + sources.** Counsel works on trains, in courtrooms,
   at client sites where Wi-Fi is hostile. A cached Today-Workspace +
   bookmarked Sources + last-30 Cases lets them keep working when the
   network drops. The browser PWA can do _some_ of this, but a real
   SQLite store + sync layer is faster and more predictable.

2. **System-wide command palette.** Cmd+Shift+Space anywhere on macOS
   pops Atlas open from the menu bar with the cursor in the search
   field. Spotlight-for-space-law. The web version cannot register a
   global shortcut.

3. **Native trust signals.** Mandantenakten cached on disk (encrypted)
   instead of round-tripping every query to a server. Kanzleien care
   about this for confidentiality reasons. A signed, notarized macOS
   app reads as a "real product" to procurement teams in a way a URL
   never does.

The strategic bonus: positioning. Atlas Desktop is the visible
artefact that says "we are a Bloomberg-Terminal-class tool, not a
SaaS dashboard." Justifies premium pricing.

---

## 2. Tech stack — Tauri 2.x

**Why not Electron:** 150 MB binary, 200 MB RAM idle, ships a full
Chromium. Atlas would be the slowest thing on the user's machine.

**Why Tauri:**

- 5–15 MB binary (uses the OS's native webview: WebKit on macOS,
  WebView2 on Windows, WebKitGTK on Linux)
- ~50 MB RAM idle
- Rust backend = real systems access (file system, OS keychain,
  global shortcuts, tray icon, native notifications, IPC)
- Cross-platform from a single codebase: macOS (Intel + ARM),
  Windows, Linux
- Auto-update built in
- Mature ecosystem in 2026 (Tauri 2.0 shipped Sept 2024 with mobile
  targets too — iOS/Android become a future option without rewriting)

**What stays the same:** the entire Next.js app under `src/app/(atlas)`
ships unchanged. Tauri loads it as a static export and routes
window.\* + fs:// + notifications through Rust shims.

```
┌─────────────────────────────────────────────────┐
│  Atlas Desktop (Tauri shell, Rust)              │
│  ┌───────────────────────────────────────────┐  │
│  │  Native Webview (WebKit / WebView2)       │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Next.js static export of /atlas    │  │  │
│  │  │  - Same React components            │  │  │
│  │  │  - Same Tailwind classes            │  │  │
│  │  │  - Same TypeScript                  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Rust side:                                      │
│  - Auth token in OS keychain                     │
│  - SQLite cache (cases, sources, bookmarks)      │
│  - Global shortcut listener                      │
│  - Tray icon + menu                              │
│  - File system bridge (drag-drop PDFs)           │
│  - Auto-updater                                  │
│  - Sync engine (poll / WebSocket → SQLite)       │
└─────────────────────────────────────────────────┘
```

---

## 3. Architecture — Hybrid Sync (Cloud as source of truth)

We **don't** want offline-first. That requires conflict resolution,
last-write-wins semantics, and a CRDT/sync engine — months of work
for marginal benefit. Counsel doesn't _write_ much offline; they
_read_.

So: **Hybrid Sync.**

| Subsystem               | Where it lives                                 |
| ----------------------- | ---------------------------------------------- |
| Auth (NextAuth session) | Server-issued JWT, stored in OS keychain       |
| Cases (read-heavy)      | Cached in local SQLite, synced from API        |
| Sources                 | Cached in local SQLite + lazy PDF blob storage |
| Bookmarks               | Cloud authoritative, local mirror              |
| Today-Workspace         | Cached for offline read, writes go to API      |
| AI Chat (ASTRA)         | Online-only (needs Anthropic API)              |
| Semantic search         | Online-only (server-side embeddings)           |
| Audit Chain             | Server-side only (tamper-evidence guarantee)   |
| Citations / RedLine     | Online-only (server compute)                   |

**Sync model:** at startup the app pulls a delta-since-last-sync from
a new endpoint `/api/atlas/sync/delta?since=<ts>`. Periodic background
sync every 5 minutes when the window is focused. WebSocket push later
for real-time updates (v1.2).

**Offline behaviour:** when the app loses connectivity, a banner
appears ("Offline — showing cached data, last synced 4 minutes ago").
Read-only routes keep working from SQLite. Writes queue locally and
flush on reconnect.

---

## 4. UI changes — what gets adapted

The web Atlas UI works as-is. But going Desktop unlocks 6 specific UI
changes that make it feel native instead of like a website-in-a-box.

### 4.1 Frameless window with custom title bar

**Today (web):** Atlas has a `TopBar` component below the browser
chrome. The browser owns the window controls.

**Desktop:** Tauri opens the window with `decorations: false` →
Atlas's `TopBar` _becomes_ the title bar. Traffic lights inset into
the top-left on macOS, custom min/max/close on Windows. The title bar
becomes a drag region.

**Files to touch:**

- `src/app/(atlas)/atlas/AtlasShell.tsx` — add a `data-tauri-drag-region`
  div above the existing TopBar
- `src/components/atlas/TitleBarControls.tsx` (new) — render
  Win/Linux controls when Tauri detects non-macOS

### 4.2 Global command palette (Cmd+Shift+Space)

**Today (web):** `CommandPaletteModal` opens via Cmd+K when the Atlas
tab is focused.

**Desktop:** Tauri registers `Cmd+Shift+Space` as a system-wide
shortcut. Pressing it from any app:

- Brings Atlas to the foreground (or shows the menu-bar popover if
  the main window is closed)
- Opens the command palette with the cursor in the search field
- Shows live results as the user types (semantic search across
  Cases + Sources + Bookmarks)

**Files to touch:**

- `src-tauri/src/main.rs` — register global shortcut
- `src/components/atlas/_components/CommandPaletteModal.tsx` — handle
  the new "wake from background" state

### 4.3 Menu-bar quick-access (macOS) / Tray (Win/Linux)

**Today (web):** N/A.

**Desktop:** A 16×16 Atlas icon in the macOS menu bar. Click → small
popover (340×500px) with:

- Search bar
- "Today's open work" list (5 most recent items)
- "New Case" / "Open Atlas" buttons

This is the killer feature. Counsel can answer "what's the citation
for X v Y?" without opening the full app.

**Files to touch:**

- `src-tauri/src/menu.rs` — define the tray icon + popover
- `src/components/atlas/MenuBarPopover.tsx` (new) — compact UI for
  the popover window

### 4.4 Multi-window for split-screen review

**Today (web):** Single tab. To compare 2 cases you open them in 2
browser tabs.

**Desktop:** Right-click any Case in the list → "Open in new window".
Tauri spawns a second webview window scoped to that case. Counsel
can put Case A on one monitor, Case B on the other.

**Files to touch:**

- `src/app/(atlas)/atlas/cases/[id]/page.tsx` — add a "Detach"
  button next to the existing "Open" link
- `src-tauri/src/window.rs` — `spawn_case_window(caseId)` IPC
  handler

### 4.5 Native file integration

**Today (web):** Upload PDFs via the file input.

**Desktop:**

- Drag a PDF from Finder → Atlas → auto-creates a Source from it
- Right-click a Source → "Reveal in Finder"
- Cmd+O opens the OS file picker (not the browser one)
- "Save Workspace as PDF" uses the OS save dialog

**Files to touch:**

- `src/lib/atlas/file-bridge.ts` (new) — abstraction over Tauri's
  `dialog` + `fs` plugins, falls back to web file API when not in
  Tauri

### 4.6 Native notifications

**Today (web):** Browser notifications (require permission, only
work when the tab is open).

**Desktop:** macOS Notification Center / Windows Action Center. Used
for:

- "New citation found in your active case"
- "Sync complete — 3 new sources"
- (Later) Real-time alerts from morning-brief

**Files to touch:**

- `src/lib/atlas/notifications.ts` — already exists; add a Tauri
  branch via `@tauri-apps/api/notification`

---

## 5. What this costs

### 5.1 Recurring fees (real money)

| Item                           | Cost             | Required for                                                    |
| ------------------------------ | ---------------- | --------------------------------------------------------------- |
| Apple Developer Program        | **$99 / year**   | macOS code signing + notarization (mandatory)                   |
| Azure Trusted Signing          | **$120 / year**  | Windows code signing (replaces $300+ DigiCert)                  |
| OR DigiCert / Sectigo (legacy) | $200–700 / year  | Windows EV cert (only if you want SmartScreen-clean from day 1) |
| Microsoft Partner Center       | **$19 one-time** | Required only if going to Microsoft Store                       |
| Mac App Store                  | included in $99  | Optional distribution channel (+30% Apple cut on sales)         |

**Total realistic ongoing: ~€200–250 / year** for signing on macOS +
Windows. Linux is free.

You **can** ship without code signing, but:

- macOS users see "App is damaged, move to Trash" (Gatekeeper). Have
  to right-click → Open → confirm twice. Killer for adoption.
- Windows users see the SmartScreen "Unrecognized app" warning. Most
  IT-managed Windows machines won't even allow it.

So signing is non-negotiable for a serious product.

### 5.2 Infrastructure (essentially free)

| Item             | Cost                                                       |
| ---------------- | ---------------------------------------------------------- |
| Tauri itself     | Free (MIT license)                                         |
| Auto-update host | Free (GitHub Releases or Vercel static)                    |
| Crash reporting  | Free tier of Sentry (already in stack)                     |
| Build CI         | GitHub Actions free tier covers Mac/Win/Linux build matrix |

### 5.3 Dev time (the real cost)

| Phase                             | Sprints | Calendar time          |
| --------------------------------- | ------- | ---------------------- |
| MVP — Tauri shell + auth + cache  | 3       | ~1 week                |
| Sync engine + offline mode        | 2       | ~3–4 days              |
| 6 native UI features (4.1–4.6)    | 4       | ~1.5 weeks             |
| Auto-updater + CI build matrix    | 2       | ~3–4 days              |
| Code signing setup + notarization | 1       | ~2 days                |
| QA + polish + bug bash            | 2       | ~1 week                |
| **TOTAL MVP shippable**           | **14**  | **~4–5 weeks focused** |

The 14-sprint estimate fits cleanly into 2 batched-deploy cycles.
Realistic ship date if started now (May 5): **late June 2026** for
a v1.0 download link.

### 5.4 Optional later phases

| Phase                       | Sprints | Why                                           |
| --------------------------- | ------- | --------------------------------------------- |
| iOS / iPad via Tauri Mobile | ~10     | Same codebase, but iOS review process is slow |
| Android via Tauri Mobile    | ~8      | Smaller market for legal-research apps        |
| Mac App Store submission    | ~2      | More distribution, but Apple takes 30%        |
| Encrypted local-data export | ~3      | Compliance feature for regulated kanzleien    |

---

## 6. Open questions — need decisions before sprint 1

1. **Auth flow.** Two options:
   - **(A) Embedded webview to caelex.eu** for login. Simpler. User
     types email/password into a normal-looking web form, we capture
     the JWT post-login. Standard pattern (Slack, Linear use this).
   - **(B) Native deeplink callback** (`caelex://auth/...`). Cleaner,
     but requires URL scheme registration on each OS and OAuth
     redirect handling in our auth backend.
   - **Recommendation: A.** Ship faster, add B in v1.5 if needed.

2. **Pricing model.** Three choices:
   - **(A) Free with any Atlas plan** — Desktop is just an installer
     for an existing subscription. Lowest friction, no separate SKU.
   - **(B) Premium add-on** — €X/month extra for "Desktop + Offline".
     Justifies the dev cost, signals premium positioning.
   - **(C) Higher-tier-only** — bundled into "Atlas Pro" or higher.
     - **Recommendation: A initially, move to C when we add a Pro tier.**

3. **Distribution channel.**
   - **(A) Direct download from caelex.eu** — full control, no
     middleman, no fees beyond signing certs.
   - **(B) Mac App Store + direct** — wider reach, +30% Apple cut on
     in-app upgrades, more review friction.
   - **Recommendation: A for v1.0, evaluate B at v1.2.**

4. **Update cadence.**
   - Tauri's updater can be set to "check on app launch" (default) or
     "background poll every N hours" or "manual only".
   - **Recommendation: check on launch + once per day in background.**

5. **Telemetry & opt-out.**
   - Should the desktop app phone home with usage data?
   - **Recommendation: yes, but anonymous + opt-out at install time.**
     Counsel will care about this — make it visible, not buried.

6. **Linux distribution format.**
   - `.AppImage` (universal), `.deb` (Debian/Ubuntu), `.rpm` (RHEL/Fedora),
     Snap, Flatpak. Tauri can build all of them.
   - **Recommendation: ship .AppImage + .deb, skip the rest until
     someone asks.**

---

## 7. Sprint plan (after sign-off)

Numbered sub-sprints in COMPLY-WORKFLOW-PLAN.md style so they fit
the batched-deploy rhythm.

### Sprint A — Tauri shell foundation (MVP-Walking-Skeleton)

- **A.1** Add `src-tauri/` directory, configure `tauri.conf.json` for
  macOS + Windows + Linux targets. `npm run tauri dev` boots the
  Atlas web UI inside a Tauri window pointing at `localhost:3000`.
- **A.2** Wire static export: `next.config.ts` adds `output: 'export'`
  _gated behind a build flag_ so web SSR isn't broken. New script
  `npm run build:atlas-desktop`.
- **A.3** OS-keychain auth token storage via `tauri-plugin-stronghold`.
  Replace cookie-based session with JWT in keychain.

### Sprint B — Hybrid Sync engine

- **B.1** New API endpoint `/api/atlas/sync/delta?since=<ts>` returns
  JSON deltas for cases, sources, bookmarks since the timestamp.
- **B.2** SQLite schema in `src-tauri/src/db.rs` mirroring the 4 sync'd
  tables.
- **B.3** Sync loop: poll on focus + every 5 min in background. Banner
  state machine for "Online / Syncing / Offline".

### Sprint C — Native UI shell

- **C.1** Frameless window + custom title bar with traffic lights
  (4.1).
- **C.2** Global shortcut Cmd+Shift+Space → command palette (4.2).
- **C.3** Menu-bar tray icon with popover (4.3).
- **C.4** Multi-window detach (4.4).

### Sprint D — Native file + notification integration

- **D.1** File bridge abstraction (4.5).
- **D.2** Native notifications via `@tauri-apps/api/notification` (4.6).

### Sprint E — Distribution

- **E.1** GitHub Actions matrix build for macOS (Intel + ARM) +
  Windows (x86_64) + Linux (x86_64).
- **E.2** Code signing pipeline: Apple Developer cert in CI secrets,
  Azure Trusted Signing for Windows.
- **E.3** Tauri auto-updater pointed at GitHub Releases manifest.
- **E.4** Landing page: `caelex.eu/atlas/desktop` with download buttons,
  release notes, system requirements.

### Sprint F — Polish & ship

- **F.1** Crash reporting via Sentry (already in stack).
- **F.2** Anonymous opt-in telemetry.
- **F.3** Bug bash on all 3 OS targets.
- **F.4** Public launch + announcement post.

---

## 8. Risks & mitigations

| Risk                                                                         | Mitigation                                                                                                                       |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Next.js SSR/RSC features break under static export                           | Audit which Atlas pages use Server Components first; rewrite the unfortunate ones to client components, or keep them online-only |
| WebView differences between WebKit (Mac) and WebView2 (Win) cause CSS bugs   | Bug bash sprint F.3 covers this; Tauri community has good docs on shared issues                                                  |
| Apple notarization rejection delays a release                                | Set up notarization on first build, not the last. Common rejection reasons (entitlements, hardened runtime) get fixed once       |
| Code signing certs expire silently and break auto-update                     | Calendar reminder + monitoring for cert expiry dates                                                                             |
| User runs an old desktop version against a backend that has migrated its API | Version the sync API endpoint (`/v1/sync/delta`); clients pin to a major version, server keeps N-1                               |
| The Rust learning curve slows us down                                        | The Rust we write is ~200 lines total (mostly Tauri plugin glue). Most logic stays in TS                                         |
| Anti-malware false positives (especially on Windows)                         | Build reputation by signing every release; Microsoft Defender Smart App Control adapts after ~50 installs                        |

---

## 9. Decision needed from Julian

Before sprint A.1 starts, the following decisions need a thumbs-up:

1. **Tauri vs. Electron** — confirmed Tauri (this doc assumes it)
2. **Hybrid Sync vs. Offline-First** — confirmed Hybrid (this doc assumes it)
3. **6 native UI features in §4** — pick which subset to ship in v1.0
   vs. defer to v1.1
4. **Auth flow A vs. B** (§6.1)
5. **Pricing model A/B/C** (§6.2)
6. **Distribution A/B** (§6.3)

Once these are signed off I'll start with Sprint A.1.

---

**Bottom line:**

- Cost: **~€200–250/year** in signing certs + ~4–5 weeks of focused
  build time
- Value: turns Atlas from "a website you log into" into "a tool that
  lives in your Dock and works on the train"
- Risk: low — Tauri is mature, the Atlas web UI is reusable as-is,
  the only truly new thing is Rust glue code (~200 lines)
- Strategic upside: substantial — premium positioning, real
  differentiation vs. Westlaw / Harvey AI, better trust signal for
  procurement
