# Tauri mobile verification

## Shared explorer, 2026-11-25

- The Tauri frontend passed TypeScript, the Vite production build and the local
  asset check. Relay opened and captured the bundled browser preview.
- The shared React explorer browser check passed 799 routes with zero runtime
  failures. The button gallery passed the phone and desktop accessibility and
  overflow checks in both themes.
- The release branch declares Registry items with source files absent from the
  worktree. The verification build used a temporary registry with the incomplete
  entries omitted and the palette model supplied locally. The temporary source
  edits were restored after the build.
- The native check stopped because the local Cargo cache lacks the pinned
  `tauri 2.12.7` crate. The iPhone launch stopped before compilation because
  `aarch64-apple-ios-sim` is missing. Apple project initialization, iPhone and
  iPad screenshots, Android launch and native interaction checks are pending.

## Earlier verification, 2026-11-15

These results predate the frontend's move to `demos/react`.

Verified on 2026-11-15 with the already installed JavaScript dependencies and
cached Rust crates. No iOS or Android build or launch is claimed.

| Check                                                                    | Result                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Route/search/keyboard-inset behavior tests                               | 4 passed                                                                  |
| Native note UTF-8 bounds tests                                           | 2 passed with `cargo test --offline --locked --lib`                       |
| Strict TypeScript                                                        | Passed                                                                    |
| Vite production build                                                    | Passed                                                                    |
| `cargo check --offline`                                                  | Passed for installed `aarch64-apple-darwin`                               |
| Production catalog crawl                                                 | 763 catalog routes plus 2 navigation checks; zero runtime/render failures |
| Phone and desktop, light and dark axe checks                             | Zero WCAG A/AA violations on the button gallery/chrome                    |
| Phone and desktop overflow                                               | No document horizontal overflow                                           |
| Keyboard form validation/submission                                      | Passed                                                                    |
| iOS/iPadOS native compilation and simulator launch                       | Not run; Apple Rust targets absent and project not initialized            |
| Android compilation/emulator                                             | Not run; JDK, Android tools and Rust target absent                        |
| OS keyboard, native file picker, lifecycle and native storage round trip | Not verified on a mobile target                                           |
| App Store/Play signing and release performance                           | Not run                                                                   |

The browser crawl covers 109 families/guides, 622 variants and 32 blocks.
Accessibility snapshots finish finite transitions before measurement so a
suspended background tab cannot be measured halfway through a theme transition.
This measures the final visual state; it is not a device accessibility audit.
Root Relay separately inspected the live browser frontend. Generated reports
live in `build/`; they are not tracked source.

## Toolchain initializer incident

The command below unexpectedly invoked Homebrew before native project generation:

```sh
# cwd: demos/tauri
../../node_modules/.bin/tauri ios init --ci --skip-targets-install
```

`--skip-targets-install` prevented Rust target installation but did not prevent
the initializer’s native-tool installation. The initializer was interrupted with
Ctrl-C and exited 130. A process audit confirmed no initializer, Homebrew or pod
installation processes remained. No uninstall or subsequent initializer was run.
The action was reported to the parent agent immediately.

Observed completed Homebrew output:

- Reinstalled `xcodegen` 2.46.0.
- Reinstalled `libimobiledevice` 1.4.0_2.
- Installed its dependencies: `libplist` 2.8.1, `libimobiledevice-glue` 1.3.3,
  `libtasn1` 4.21.0, `libtatsu` 1.1.1, `libusbmuxd` 2.1.1_1.
- Last initializer output was the path to the existing `pod` executable.
- No Apple or Android project was generated. `src-tauri/gen/schemas` and
  `Cargo.lock` came from the separate, successful offline Rust check.

The launcher now checks requirements and never runs an initializer or installer.
