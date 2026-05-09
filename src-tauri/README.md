# Atlas Desktop (Tauri)

Native desktop wrapper for the Atlas web app. Bundle 45 — the foundation. Bundle 46 adds code-signing + notarization, Bundle 47 adds auto-update + distribution.

## What this is

A Tauri 2.0 app that hosts the existing Next.js Atlas frontend in a native macOS window. No browser visible — looks and behaves like Slack, Linear, Notion, Claude Desktop. Same code, native shell.

- **Dev mode** (`npm run desktop:dev`): launches `npm run dev` for Next.js, opens a native window pointing at `http://localhost:3000`. Hot-reload works exactly like in the browser.
- **Production build** (`npm run desktop:build`): produces `Atlas.app` and `Atlas.dmg` in `src-tauri/target/release/bundle/`. The window points at `https://atlas.caelex.com` (configured in `tauri.conf.json`).

## One-time setup (you only do this once)

You need three things on your Mac before any of this works:

1. **Xcode Command Line Tools** — `xcode-select --install`. Pops up an installer; click through. (Already installed? `xcode-select -p` will print a path instead of erroring.)

2. **Rust** — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`. Default install. Restart terminal or `source $HOME/.cargo/env`. Verify with `rustc --version`.

3. **NPM dependencies** — `npm install` from the repo root. This pulls `@tauri-apps/cli` which gives you the `tauri` command.

## Generate the app icons (one-time)

The repo ships a placeholder SVG at `src-tauri/icons/source.svg`. Generate the platform-specific icon set from it:

```
npm run desktop:icon
```

This rasterizes `source.svg` into every required size (32×32, 128×128, 128×128@2x, plus `.icns` for macOS and `.ico` for Windows). Files are written to `src-tauri/icons/`. Replace `source.svg` with the final Caelex Atlas brand icon when it's ready, then re-run.

## Run in dev mode

```
npm run desktop:dev
```

What happens:

1. Tauri spawns `npm run dev` (Next.js dev server starts on :3000).
2. Tauri compiles the Rust runtime (~30s the first time, then cached).
3. A native macOS window opens, pointing at the Next.js dev server.
4. Hot-reload works: edit a `.tsx` file, the desktop window refreshes.

Quit with Cmd+Q (only Atlas closes — `npm run dev` keeps running until you Ctrl+C).

## Build a production app

```
npm run desktop:build
```

What you get in `src-tauri/target/release/bundle/`:

- `macos/Atlas.app` — drag this to /Applications to install
- `dmg/Atlas_0.1.0_aarch64.dmg` — what you'd ship via download link

⚠️ The build is **unsigned** at this stage. Macs will throw a Gatekeeper warning when launched ("Atlas is from an unidentified developer"). To bypass once: Right-click → Open → Open anyway. To fix properly: see Bundle 46 (code-signing + notarization, requires Apple Developer Account).

## Configuration

All app-level config lives in `src-tauri/tauri.conf.json`:

- `productName` — app display name. Defaults to `Atlas`.
- `version` — bumped manually for now. Auto-update checks against this.
- `identifier` — bundle ID `com.caelex.atlas`. Don't change after first ship — auto-updates rely on this matching.
- `build.devUrl` — what dev mode loads. `http://localhost:3000`.
- `build.frontendDist` — what production loads. `https://atlas.caelex.com`. Change this if our production URL moves.
- `app.windows[0]` — window size, title, decorations. Defaults to 1400×900 (min 1000×700).
- `bundle.macOS.minimumSystemVersion` — `11.0` (Big Sur, Nov 2020). Bumping this makes the app smaller / lets us use newer APIs but excludes older Macs.

## Architecture (for whoever inherits this)

```
┌─────────────────────────────────────────────┐
│ Atlas.app (native macOS window)             │
│  ├─ Native menu bar (Atlas / File / Edit…)  │
│  ├─ Native dock icon                        │
│  └─ WebView (system WebKit)                 │
│      └─ loads https://atlas.caelex.com      │
│           └─ existing Next.js app           │
└─────────────────────────────────────────────┘
```

The native shell is ~12 MB. The WebView uses macOS's built-in WebKit (same engine as Safari) — we don't ship a browser. RAM + battery costs are minimal.

The `frontendDist` URL is the production deployment. Atlas Desktop is online-only for now; offline mode (cached source-browsing, queued draft generations) is a future bundle.

## Files in this directory

```
src-tauri/
├── Cargo.toml                 Rust dependencies (Tauri runtime + plugins)
├── build.rs                   Cargo build hook — invokes tauri-build
├── tauri.conf.json            App config (windows, bundle, signing)
├── capabilities/
│   └── default.json           Tauri 2.0 permission set (kept minimal)
├── icons/
│   ├── source.svg             Source for `tauri icon` to rasterize
│   └── (generated PNGs/icns/ico after `npm run desktop:icon`)
└── src/
    ├── main.rs                Process entry — calls atlas_lib::run()
    └── lib.rs                 Tauri builder (no custom commands yet)
```

## Common issues

**"`cargo: command not found`"** — Rust isn't installed or the shell hasn't picked up `~/.cargo/bin`. Run `source $HOME/.cargo/env` or restart the terminal.

**"Could not compile `atlas`"** — Usually missing system deps. macOS: ensure Xcode CLI tools are installed (`xcode-select --install`). The build error usually points at the missing C library.

**"Atlas wants to access your Documents folder"** — macOS sandbox prompts. Click Allow. We'll lock these down properly in Bundle 46 with explicit entitlements.

**Window opens but page is blank in dev mode** — Next.js dev server isn't ready yet. Tauri tries to load `http://localhost:3000` immediately; if Next is still compiling, you get a blank window. Either wait a few seconds and reload (Cmd+R works in dev), or start `npm run dev` separately first, then `npm run desktop:dev` in a second terminal.

**Production app loads `atlas.caelex.com` but DNS doesn't resolve** — the URL doesn't exist yet (we don't have that domain pointed anywhere). Edit `frontendDist` in `tauri.conf.json` to whatever URL the production frontend actually lives at, then re-build.
