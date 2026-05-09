// Suppresses the extra console window that would otherwise pop up
// alongside the app on Windows release builds. On macOS / Linux this
// attribute is a no-op.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    atlas_lib::run()
}
