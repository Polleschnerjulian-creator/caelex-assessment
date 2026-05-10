/// Atlas Desktop — Tauri runtime entry point.
///
/// Tauri 2.0 conventionally splits the binary into `main.rs` (process
/// boot) and `lib.rs` (the actual app builder). Keeping the builder in
/// the library means a future mobile target (Tauri supports iOS /
/// Android via `tauri::mobile_entry_point`) can share the same code.
///
/// Sets up:
///   - The Shell plugin (lets the WebView open external links via
///     `target="_blank"` instead of trying to navigate inside the app
///     window).
///   - A native macOS menu bar with Atlas / Edit / View / Window
///     submenus. The View submenu binds Reload (Cmd+R), Force Reload
///     (Cmd+Shift+R), and Toggle Dev Tools (Cmd+Alt+I) — without
///     these, the WebView has no keyboard shortcuts at all and the
///     user can't even refresh.
///
/// Dev Tools work automatically in debug builds (Tauri auto-enables
/// them when compiled in dev mode). For production builds, see the
/// `devtools` feature flag in Cargo.toml.

use tauri::menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // ── App submenu (the leftmost one with the app name) ──
            let app_submenu = Submenu::with_items(
                app,
                "Atlas",
                true,
                &[
                    &PredefinedMenuItem::about(
                        app,
                        None,
                        Some(AboutMetadata::default()),
                    )?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::show_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?;

            // ── Edit submenu — standard text-editing affordances ──
            let edit_submenu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?;

            // ── View submenu — Reload + Dev Tools shortcuts ──
            let reload = MenuItem::with_id(
                app,
                "reload",
                "Reload",
                true,
                Some("CmdOrCtrl+R"),
            )?;
            let force_reload = MenuItem::with_id(
                app,
                "force_reload",
                "Force Reload",
                true,
                Some("CmdOrCtrl+Shift+R"),
            )?;
            let toggle_devtools = MenuItem::with_id(
                app,
                "toggle_devtools",
                "Toggle Developer Tools",
                true,
                Some("CmdOrCtrl+Alt+I"),
            )?;
            let view_submenu = Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &reload,
                    &force_reload,
                    &PredefinedMenuItem::separator(app)?,
                    &toggle_devtools,
                ],
            )?;

            // ── Window submenu — minimize / close ──
            let window_submenu = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                ],
            )?;

            let menu = Menu::with_items(
                app,
                &[
                    &app_submenu,
                    &edit_submenu,
                    &view_submenu,
                    &window_submenu,
                ],
            )?;
            app.set_menu(menu)?;

            // In debug builds, auto-open dev tools so a styling /
            // hydration issue is immediately visible. Production
            // builds skip this.
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            // Reload via window.location.reload() — works in both dev
            // (Next.js dev server) and production (loads the prod URL).
            "reload" | "force_reload" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.eval("window.location.reload()");
                }
            }
            "toggle_devtools" => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_devtools_open() {
                        window.close_devtools();
                    } else {
                        window.open_devtools();
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
