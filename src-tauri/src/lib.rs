/// Atlas Desktop — Tauri runtime entry point.
///
/// Tauri 2.0 conventionally splits the binary into `main.rs` (process
/// boot) and `lib.rs` (the actual app builder). Keeping the builder in
/// the library means a future mobile target (Tauri supports iOS /
/// Android via `tauri::mobile_entry_point`) can share the same code.
///
/// Today's setup is minimal: no custom Tauri commands, no IPC. The
/// app's job is to host the Atlas web UI (loaded from `frontendDist`
/// in tauri.conf.json) inside a native window. Everything Marie sees
/// is the existing Next.js app running in a system WebView.
///
/// Future commands (e.g. expose-app-version-to-frontend, native
/// open-with-default-app, file-system-access) get wired up here as the
/// app grows beyond the pure-WebView phase.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
