# Website

`apps/web`: Next.js 16 App Router, React 19, Tailwind 4, Fumadocs, `rehype-pretty-code` + Shiki, next-themes, jotai, nuqs. It documents and serves the registry, and it is the library's flagship example: its UI is built from Fabricator components and follows [`DESIGN.md`](../DESIGN.md).

## Rendering

- Server Components by default; `"use client"` on the smallest interactive leaf.
- Docs and component pages are static (`generateStaticParams`, `dynamic = "force-static"`).
- Previews render through `ComponentPreview` / `ComponentSource` from the generated indexes; blocks in the `/view/[style]/[name]` iframe.
- Big components that should render at app width in place (Event Calendar) take `ComponentPreview wide`: the preview leaves the 632px prose for the docs column, up to 72rem (`app/fabricator-site.css`).
- Full-screen demos are `type="frame"` previews. Their names start with a prefix in `FRAME_EXAMPLE_PREFIXES` (`app/(view)/view/[style]/[name]/page.tsx`); the dev server sees new frame examples only after a restart.
- A heavy interactive demo that is responsive takes `type="frame" fit` (the Event Calendar's): the frame renders unscaled at the column's width and as tall as the demo, which reports its height (`FrameHeight`, `FRAME_HEIGHT_MESSAGE`). The docs page carries every style's CSS, over 500 `:has()` rules, so any element added or removed anywhere in it restyles all ~12,000 of its elements (~350ms); in a frame the demo restyles only its own document.
- A frame can take a `placeholder` (`FramePreview`): it covers the frame in the same scaled box until the page inside posts that it has hydrated (`FrameReady` in `/view`, `lib/frame-preview-model.ts`), then fades; a page that never says so shows 3s after it loads. The block previews use `BlockSkeleton` (`components/fabricator/block-skeleton.tsx`), one block per region: the inset App Shell's sidebar and main column, an auth block's form, or onboarding's questions and preview (`getBlockLayout` in `lib/block-page.ts`).
- Previews stay on their page: `/view` renders an inline script (`getPreviewGuardScript` in `preview-links.ts`) that cancels a click on a link to an app route (`/messages`, `/sign-up`) and a form's native submit, from the first byte rather than from hydration, so a frame never loads a page the site doesn't have. In-page `#` links, downloads and forms with a React function action still work.
- Pages name upstream's styles (`<base>-nova`); `toSiteStyle()` (`lib/site-style.ts`) maps them to `<base>-fabricator`, for previews, code, `.md` exports and `llms-full.txt`.
- Code shown to readers is rewritten to user paths (`@/components/ui/*`).

## Docs

- Screenshots are GitHub attachments indexed by original path in [`screenshot-attachments.json`](screenshot-attachments.json). Exact rewrites preserve the site's existing preview URLs through the screenshot route, which follows GitHub's storage redirects and streams image bytes for Next Image optimization. The route serves only manifest entries, with no client bundle cost. Native docs check that manifest for preview availability. `pages:capture` and `registry:capture` write to gitignored `tmp/screenshots/`; upload reviewed captures and update the manifest before removing local files. README and plan evidence link directly to the attachment URLs.
- MDX in `content/docs/`. Component pages follow the sections in [COMPONENTS.md](../COMPONENTS.md#done-when).
- App Shell export references live in `content/docs/app-shell/` and cover the three web bases and React Native on shared pages. Each starts with a focused Base UI preview and its code, then explains the import, required parent, composition, and platform differences. Keep the App Shell sidebar order in `lib/docs-explorer.ts` and the Markdown links in `public/llms.txt` current.
- CLI commands are written once as `npx shadcn@latest …`; the highlighter makes the package-manager tabs, bun first.
- Code colours come from one Shiki theme (`lib/shiki-fabricator-theme.ts`) mapped to the `--syntax-*` tokens; change a colour in `registry/fabricator/syntax-colors.ts`.
- Every page has a `.md` export and is listed in `llms.txt`; keep both accurate.
- The site changelog is one page per release, `content/docs/changelog/vX-Y-Z.mdx` (`title: Version X.Y.Z`, `date:` the `CHANGELOG.md` release day, a UTC time added only when two releases share a day), plus `unreleased.mdx` for merged changes not yet released, which has no date and lists first. The index, the pages and the sidebar show the day and list releases newest first (`lib/changelog-order.ts`). A page opens with what the release brings, then `## New components`, `## Updated components`, `## Breaking changes`, `## Fixes` and `## Docs`, with a `###` per component, and ends with its GitHub release link. Old per-change URLs redirect through `lib/changelog-redirects.mjs`.

## Chrome

Site chrome lives in new files so upstream merges stay small:

- `components/fabricator/`: `site-header.tsx`, `site-footer.tsx`, the docs shell (`docs-shell-sidebar.tsx`, `docs-mobile-bar.tsx`; `[data-slot=docs-shell]` hides the header and footer) and `fluid-nav.tsx`.
- `app/fabricator-site.css` holds site-only CSS. `app/fabricator.css` is generated.

## Homepage

`app/(app)/(root)/` is the hero with its blocks showcase (see [Blocks](#blocks)), then a gallery of the components: hand-built demos (`_components/demos-*.tsx`, importing `@/styles/base-fabricator/ui/*`) first, then each component's docs demo, listed in `_components/catalog.tsx` and lazy-loaded from `examples/__styles__/base-fabricator/`. A catalog entry can load a hand-built demo instead when the docs demo doesn't suit a card (`input`, `alert`). App frames and their navigation (`app-shell`, `app-nav`, `sidebar`, `tab-strip`, `workspace-switcher`, `user-menu`), `data-table`, `event-calendar` and the media players (`audio-player`, `video-player`) have no card; their docs pages show them. Any other new component needs a catalog entry with a card height and a group ([COMPONENT-GROUPS.md](COMPONENT-GROUPS.md)), which the docs sidebar, the homepage filter and both example apps share.

## Blocks

`/blocks` (`app/(app)/blocks/`) is a gallery of the screen blocks declared in `registry/fabricator/blocks.ts` (the App Shell starters stay on the App Shell docs), ordered by their first category as `BLOCK_CATEGORIES` lists them (`_lib/blocks.ts`). Each card is a captured picture, a title and one line (`SUMMARIES` there; a block without one shows the opening of its description), and the page loads no frames. The category filter is URL state (`?category=chat`); the page is static, so the server sends every block as the Suspense fallback and the browser applies the filter. The old `#finance-01` and `#chat` links go to the block's page and the filter in the browser (`getHashHref`).

`/blocks/<name>` (`[name]/page.tsx`) holds one block: its command, which copies in the reader's package manager, a viewer, the components it uses that have a docs page (from its `registryDependencies`), and the blocks before and after. The viewer's Preview renders `/view/base-fabricator/<name>` in the page's only frame, inside `BrowserWindow` (`components/fabricator/browser-window.tsx`: window controls, the block's route as `acme.com/<route>` from its page's install target, a new-tab link, and a reload button that remounts the frame). Desktop is the window's width, drawn at 1280px and scaled down on a narrower screen; tablet and phone are real widths. Code shows each file at the path the CLI writes it, formatted and highlighted on the server (`_lib/block-files.ts`). The sitemap lists every block's page.

Pictures are `public/blocks/<name>-<theme>.webp`: the first fold at 1280 by 720, twice the resolution, at most 90 KiB each. With the dev server running, `bun run --cwd apps/web blocks:capture` takes them all, and `blocks:capture <name>` captures the named block. It waits for the preview to hydrate and the assets to settle before saving. Capture a block again whenever its first fold changes.

Run `bun run --cwd apps/web blocks:check` for the browser and accessibility checks across all three web bases. Pass a block name, `--base` or `--width` to focus on a specific preview.

A new block needs its declaration, a category in `BLOCK_CATEGORIES`, a summary and its pictures. Import both pictures in `_lib/block-previews.ts` so the image cache uses a new URL when a picture changes.

The homepage hero links to `/blocks` and shows six blocks in the tab row inside one `BrowserWindow` (`_components/blocks-showcase.tsx`). Switching tabs updates the address and the link to the block's page. Only the selected tab mounts its frame, a 16:9 box that renders the block at 1280px and scales it to the column, so the first fold at 1280 by 720 shows whole; phones show the block's phone layout.

## Settings

`lib/site-settings.ts` (localStorage) holds theme, sound, icons, radius, density, motion, surface tint and colour roles. The menu is `components/fabricator/site-settings.tsx`; `site-settings-effects.tsx` applies them as `data-radius`, `data-motion`, `data-density` and inline `--surface-*` and `--<role>-*` on `<html>`, and mounts `<SoundEffects />`. A `<head>` script applies the stored values before paint.

## Icons

- The Fabricator copies the site renders import icons from `@/lib/site-icons`, so previews follow the Icons setting. It renders `@fabricator-ui/icons`; other packs load on demand. `lib/site-icons*.ts(x)` is generated by `bun run icons:build` (part of `dev`) from `registry/icons/site-mapping.json` and `public/r/icons/index.json`.
- Readers always see `@fabricator-ui/icons` in code (`lib/site-icons-display.ts`). Registry JSON never contains site icons.
- `/icons` (`app/(app)/icons/`) and `content/docs/icons/` use the real packages' built `dist/` (`dev` and `build` run `icons:packages` first). The catalog, static nodes and the Animated tab (with Motion) load lazily; the docs demo goes through `next/dynamic` in `icons-animated-loader.tsx`. Filters are URL state, logic in `app/(app)/icons/lib/icons.ts`.
- Icon docs demos live in `components/icon-demos/` (`components/icons/` is shadowed by `@/components/icons.tsx`) and are named `Icons*`, so the `.md` export drops them.

## Sounds

Our own Web Audio synthesis (`registry/fabricator/shared/lib/sounds.ts`, `components/sound-effects.tsx`). `<SoundEffects />` resolves sounds from `data-slot`, ARIA roles and `data-sound`, so components need no changes. Audio files or third-party sounds need a licence that allows redistribution under MIT.

## Build memory

The site is built on the maintainer's machine and uploaded prebuilt; Vercel's Git builds are off (`vercel.json`). If they come back, `next build` must fit in 8 GB or Vercel kills it silently and the deploy hangs in "Building". `next.config.mjs` turns off the Turbopack build cache and source maps (keep loader worker threads: a worker that ran MDX later fails a PostCSS job), and the registry build writes lazy shards only for the styles the site renders (`legacyStyles`). Before adding a route, a style or a lazy map to the module graph, build in a container capped at 4 CPUs and 8 GB.

## Done when

- [ ] The page was checked in the running site: light and dark, keyboard only, phone and desktop widths, axe clean.
- [ ] The `.md` export and `llms.txt` still describe the page.
