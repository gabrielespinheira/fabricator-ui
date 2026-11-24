# React demo

Every Fabricator web component, example and block in one Vite app, with no Next.js
server. It renders the compiled registry: `apps/web/styles/base-fabricator`, the
Fabricator examples and the built blocks. App Shell, Sidebar, App Nav, bottom
navigation and the controls come from the library.

The shared generated contract supplies the component families and guides in eight
groups, plus the blocks. The app lazy-loads the existing web scenarios, alongside
eight explicit browser mappings. The full Fabricator Icons catalog is searchable.
Theme, density, shape, motion, surface, sounds and the selected scenario persist
between visits. Auto density uses spacious controls on phones and the default
web scale at desktop widths.

## Run

From the repository root, build the registry once, then start the demo:

```sh
bun run registry:build
bun run demo react
```

It serves `http://localhost:4100`. After a change to registry source, rebuild what
the demo reads:

```sh
cd apps/web && bun run registry:build --style base-fabricator
```

To check every page in the production build:

```sh
bun run demo react:build
bun run demo react:preview
# In another terminal, while preview is running:
bun run demo react:check:browser
```

`react:check:browser` uses installed Chrome and blocks requests outside the local
preview. It visits every catalog item, scenario and block, checks phone/desktop
light/dark accessibility, and exercises keyboard form submission, browser history
and persisted navigation. `CHROME_PATH` selects a Chromium binary;
`DEMO_PREVIEW_URL` selects an existing preview. Reports and screenshots go in
`build/browser-check/`. `DEMO_CHECK_SCOPE=families` skips the variant sweep;
`DEMO_CHECK_SCOPE=audits` runs only the focused accessibility/interaction checks.

## Structure

`mountExplorer` takes the host it runs in: its name, its status line and, for a
native app, a services page. [`demos/tauri`](../tauri) mounts the same explorer
with its own host and shares `explorer-config.ts`. Nothing here knows about Tauri.

Blocks, and examples that draw their own Sidebar or App Shell, open in a frame
(`?preview=block/mail-01`), so their fixed parts and breakpoints follow the frame
and not the explorer. Links inside a demo never navigate.

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
