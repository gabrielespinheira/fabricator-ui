# Fabricator UI Tauri mobile example

This Vite React application runs the real compiled Fabricator web components in
a Tauri 2 host. It does not import the React Native registry or require a Next.js
server in production. App Shell, Sidebar, App Nav, bottom navigation and the demo
controls come from the library.

The shared generated contract supplies 109 component families and guides in eight
groups, plus 32 blocks. The app lazy-loads 622 existing web scenarios, alongside
eight explicit browser mappings. The full Fabricator Icons catalog is searchable.
Theme, density, shape, motion, surface, sounds and the selected scenario persist
between launches. Auto density uses spacious controls on phones and the default
web scale at desktop widths.

## Run

From the repository root, first generate the registry and platform contract:

```sh
bun run registry:build
bun run --cwd apps/web platforms:generate
bun run --cwd apps/tauri-mobile dev
```

The frontend runs on port 1420. For production asset verification:

```sh
bun run --cwd apps/tauri-mobile build
bun run --cwd apps/tauri-mobile check:assets
bun run --cwd apps/tauri-mobile preview
# In another terminal, while preview is running:
bun run --cwd apps/tauri-mobile check:browser
```

`check:browser` uses installed Chrome and blocks requests outside the local
preview. It visits every catalog item, scenario and block, checks phone/desktop
light/dark accessibility, and exercises keyboard form submission, browser history
and persisted navigation. `CHROME_PATH` selects a Chromium binary;
`TAURI_PREVIEW_URL` selects an existing preview. Reports and screenshots go in
`build/browser-check/`. `TAURI_CHECK_SCOPE=families` skips the variant sweep;
`TAURI_CHECK_SCOPE=audits` runs only the focused accessibility/interaction checks.

## Native targets

```sh
bun run --cwd apps/tauri-mobile ios
bun run --cwd apps/tauri-mobile ipad
bun run --cwd apps/tauri-mobile android
bun run --cwd apps/tauri-mobile build:ios
bun run --cwd apps/tauri-mobile build:android
```

The launcher checks prerequisites and fails with the missing requirement. It
does not install toolchains or initialize native projects. Install the Tauri
[native prerequisites](https://v2.tauri.app/start/prerequisites/) deliberately
before invoking the initializer yourself. `tauri ios init` may run Homebrew even
with `--skip-targets-install`; that option skips Rust targets only.

iOS/iPadOS use iOS 16.4 or later, matching
[Tailwind 4’s Safari baseline](https://tailwindcss.com/docs/compatibility).
Android requires API 24 or later and a WebView meeting the Chrome 111 CSS
baseline. Native Apple and Android projects are generated under `src-tauri/gen`
after their prerequisites are installed. The current implementation has not been
compiled or launched for iOS or Android in this session; see [verification.md](verification.md).

The Rust library has the mobile entry point and real app-private storage
commands. The native-services page reads its host information and saves a note
through a typed, validated bridge. Browser preview reports that native storage
is unavailable; it does not simulate a successful native request. File Upload
uses the WebView’s system file picker. Notifications, push, haptics and biometrics
are explicitly unconfigured. Widgets and Live Activities require separate Apple
extension targets.

## Production and portability

`frontendDist` points to `../dist`. Vite bundles the frontend, fonts, icon modules
and local example media; no production URL points to localhost. Fourteen remote
sample-image URLs remain in upstream demos. They need a network connection for
their photographs or avatars; component code and local media still run offline.

The Vite boundary adapters replace Next Link/Image and site icon selection.
Blocks load already built registry payloads unchanged. They are not rewritten
or reimplemented by this app. Safe-area padding and the visual viewport account
for the status area and keyboard. Hash navigation works from the bundled origin,
preserves scenario selection and uses normal browser back/forward behavior.

| Public family            | Browser mapping                                         |
| ------------------------ | ------------------------------------------------------- |
| `text`, typography guide | Semantic HTML and Fabricator typography tokens          |
| `fabricator-root`        | ThemeProvider, DensityProvider and the app’s token root |
| `time-wheel`             | The real TimeWheel component installed with Time Input  |
| `form`                   | Validated Field/FieldGroup composition                  |
| `density`, `direction`   | The real providers around interactive controls          |
| `sonner`, `sounds`       | The real toaster and shared Web Audio recipes           |

The published `preview-03` block is currently a one-line upstream fixture. This
example renders its published output and does not claim it is a full composition.

`packages/cli/templates/mobile-tauri` holds a Vite host overlay with the same
native entry point, security policy and local asset configuration. It requires a
Vite frontend and installed Fabricator web components; it is not yet a completed
CLI `create` flow.
