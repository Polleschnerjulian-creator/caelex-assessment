// Tauri build script — invoked by Cargo at compile time. Generates the
// runtime context (icons, capabilities, plugin permissions) that the
// app reads via `tauri::generate_context!()`.
fn main() {
    tauri_build::build()
}
