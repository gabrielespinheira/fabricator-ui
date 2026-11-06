// The Tauri shell of the desktop example: one window over the website's
// /desktop route (see tauri.conf.json). Run it with `bun run desktop:tauri`
// from the repo root.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("the Fabricator UI desktop example failed to start");
}
