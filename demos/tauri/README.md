# Tauri demo

Two Tauri 2 apps:

- **Mobile** (`src-tauri/`): the [React demo](../react) bundled for iOS, iPadOS and
  Android, with a native services page. It does not import the React Native
  registry or require a Next.js server in production.
- **Desktop** (`desktop/src-tauri/`): the website's `/desktop` route in a window.

## Run

From the repository root, build the registry once (`bun run registry:build`). The
desktop app starts the website's dev server unless one already answers:

```sh
bun run demo tauri:desktop
```

The mobile frontend also runs in a browser, on port 1420:

```sh
bun run --cwd demos/tauri dev
```

For production asset verification:

```sh
bun run --cwd demos/tauri build
bun run --cwd demos/tauri check:assets
```

The React demo's `react:check:browser` covers the pages both share.

## Native targets

```sh
bun run demo tauri:ios
bun run demo tauri:ipad
bun run demo tauri:android
bun run demo tauri:build:ios --target aarch64-sim
bun run demo tauri:build:android
```

The launcher checks prerequisites and fails with the missing requirement. It
does not install toolchains or initialize native projects. Install the Tauri
[native prerequisites](https://v2.tauri.app/start/prerequisites/) deliberately
before running `bun run --cwd demos/tauri tauri ios init` or
`bun run --cwd demos/tauri tauri android init`. The iOS initializer may run
Homebrew even with `--skip-targets-install`.

Launch the iPhone or iPad simulator before running the matching demo command.
If more than one simulator of that family is available, pass its full name,
for example `bun run demo tauri:ipad "Fabricator UI iPad"`. Apple Silicon
simulator builds use `aarch64-sim`, and Intel builds use `x86_64`.
Use the Tauri CLI directly for signed physical-device development.

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

The CLI’s [Tauri mobile template](../../packages/cli/templates/mobile-tauri)
creates a separate host for a Vite app. The explorer keeps its storage and
media examples in this demo.
