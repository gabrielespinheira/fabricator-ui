# Icon pack: plan

Status: approved (2026-11-03); every decision is answered in §11. Phases 1 and 2 are built as packages, plus the PNG exporter from Phase 3 and the duotone pipeline from Phase 5 (see Build status). Nothing is committed or published.

## Build status (2026-11-03)

Built, in `packages/icons-core`, `packages/icons`, `packages/icons-react-native` and `packages/icons-static`:

- Lucide vendored at **1.66.0**, not 1.67.0: the repo's `minimumReleaseAge` (48 hours, `bunfig.toml`) blocks 1.67.0 and its `@lucide/icons`/`lucide-react` parity packages, which were published the same day. 2,015 icons.
- Parity: every icon's shapes equal `@lucide/icons` 1.66.0, and every icon renders the same markup as `lucide-react` 1.66.0 apart from class names. Every non-prefixed `lucide-react` export exists. One icon costs 971 B min+gzip against lucide-react's 1,696 B.
- Brands: **108 ship, 5 are held** at first (140 and 12 after Gabs's marks, below). The held five are Slack, Microsoft, AWS, Visual Studio Code and OpenAI. Their own terms forbid this kind of use: Slack forbids distributing its logo files, and Microsoft and AWS license logos only by agreement. Microsoft forbids modified VS Code icons, and a one-colour mark is one. OpenAI's permission is non-transferable. Each reason, with its source, is in `sources/brands/allowlist.json` and `BRANDS.md`; removing `held` from an entry and running `bun run icons:brands` ships the mark.
- SharpOS parity: the 78 shared marks keep SharpOS's geometry, art, hex, resolved colours, scales and viewBoxes (`fixtures/sharpos-brands.json`). There are three intentional differences. OpenRouter uses Simple Icons' current path. Cal.com's and LinkedIn's one-colour marks come from their own single-path art; SharpOS had a placeholder for both.
- LinkedIn ships from CC0 art (gilbarbara/logos), but LinkedIn's brand guidelines allow only blue, black and white, and don't list redistribution as an acceptable use. Simple Icons removed it at LinkedIn's request. Hold it too if that risk is unwanted.
- Optical scale: the measurement reproduces SharpOS's recorded scales for 74 of 79 marks within 0.02; the other five sit at the 1.08 threshold. SharpOS's values stay pinned; `--measure` sets the others against the frozen median (0.992). The check enforces the bounds (below 1, at least 0.84), not equality with a fresh measurement.
- Static strings are exported in PascalCase (`House`, `GithubColor`), as `lucide-static` does.
- The React Native package ships outline icons, brands and `IconProvider`. It has no `dynamic` or `catalog` entry: use `@fabricator-ui/icons/catalog` for the data.
- Duotone: loader, check, generator, renderers (CSS variables on the web, props on React Native) and the `/duotone` entries exist. No duotone icon is drawn yet; that is the Phase 5 pilot.
- Brand colours audited against every logo (same day): 15 marks that drew flat or with dark cut-outs in brand colour now use their real artwork. Chrome, GitLab, Airtable, Bun, Cloudflare, PostHog, Shopify, Tauri, Vue.js, Miro, JavaScript and TypeScript take the logos set's artwork; npm's is recoloured to its current red; Facebook and Reddit draw their current path over white. Seven of these are SharpOS marks, which SharpOS still draws flat. Firebase (the logos artwork predates the 2024 logo) and PayPal (old blues) stay flat.
- Miro (same day): its geometry already matched miro.com's logo, but its hex was the 2019 navy (`#050038`, still in Simple Icons and SharpOS) and its M was drawn `#000000`. It now uses Miro's yellow `#FFDD33` and the `#1C1C1E` of miro.com's own logo; the SharpOS parity test records the hex as a deliberate difference.
- Gabs's tech marks (same day): the 58 marks on gabs.app (`~/SharpHaw/Gabs/apps/web/src/lib/tech-icon-paths.ts`) were compared by Simple Icons slug, name and title. 19 were already here; 39 were added, from Simple Icons 16.36.0 except Motion, copied from motion.dev through a new `kit` source (`sources/brands/kits/`, its CSS colours resolved to hex: `#FBD509`, `#080B08`). Each owner's terms were read first, and 7 are held: Terraform, Google Cloud, Python, MySQL, Airbnb, GSAP and Playwright. Brands: **140 ship, 12 are held**. CSS, PostgreSQL, Testing Library and Hono take the logos art; Booking.com and Konva draw over white. PHP (CC BY-SA 4.0) and Tux carry the credit their licences ask for, in a new `credit` field. Gabs's generic stand-ins (SQL, RAG, CI/CD, TDD, Zustand) are Lucide icons, not marks.
- Gradient art (same day): linear and radial gradients are now kept, with local ids (`g0`, …) that React and React Native prefix per copy with `useId`, and the static files, PNG export and site copy prefix with the brand's name (`fab-firefox-g0`). Firefox, Astro, Messenger, Meta, Telegram and Supabase draw their real gradient logos in brand colour. Instagram stays flat (no gradient glyph in either source), as do marks whose current logo needs filters or masks (Vite, Netflix).
- Safari (2026-11-04): draws the logos set's real compass in brand colour. Its only filters are drop shadows, which a new `dropShadows` option removes (any other filter stays refused), and nested translated groups are now flattened. The art is 38 KB, about 10 KB gzipped, the largest in the set; a page pays that only if it imports `SafariIcon`. Apple's trademark guidelines allow its icons only under a written licence, so Safari and Apple fail the test the held marks failed; both still ship, pending a decision.
- Website (added later the same day): the `/icons` page (search, set and category filters, size and stroke preview, a detail panel with JSX and SVG copy, SVG and PNG downloads, install command, provenance), five docs pages under `/docs/icons`, a changelog entry, `llms.txt` entries, nav and footer links, the sitemap, and icon rules in `skills/fabricator`. The catalog gained `outlineCategories`; `/brands` exports `getBrandViewBox`; `@fabricator-ui/icons-static/nodes` exports the shape data typed.

Not built yet:

- Registry integration (Phase 3, I10): it changes `build-registry.mts`, `next.config.mjs` and `/init`, for the same reason.
- The Expo check on the iOS simulator. The React Native renderers are unit-tested with `react-native` and `react-native-svg` mocked at the boundary, and typecheck against the real packages.
- Publishing: `scripts/publish.sh` still publishes only the CLI.
- The Figma template for originals (Phase 4). `packages/icons-core/CONTRIBUTING.md` covers the rest of the contribution guide.

Fabricator Icons is an icon set for the web (React, plus framework-free SVG for everything else), React Native and desktop (Electron, Tauri). Its base is Lucide, taken whole: the same 2,020 icons, names and geometry. Fabricator adds the icons Lucide lacks, drawn to the same spec, a separate set of brand marks that starts from the 79 SharpOS ships, and later a duotone variant of the outline set. One source tree and one build feed a thin package per platform.

This plan rests on a read of Lucide's source at tag `1.67.0` (commit `1980e3d`, 2026-11-03), Simple Icons `16.36.0`, SharpOS's brand icons (`@sharp/core-brand-icons` 3.0.1, commit `06ace749e`), and how Fabricator and the shadcn CLI handle icons today (§2).

---

## 1. Goals and non-goals

### Goals

- Every Lucide icon under its Lucide name with identical geometry, so code moves off `lucide-react` by changing the import path.
- New icons follow one written spec (Lucide's, plus the additions in §5), enforced by a check script as well as review.
- One prop API for React and React Native, and a framework-free static package for every other target.
- Brand marks in one colour or in brand colour, starting with SharpOS's set so SharpOS can adopt the package without a visual change.
- A data model that already has room for duotone, so adding it later is a new subpath and not a breaking change.
- Tree-shaking: importing one icon costs what it costs in Lucide.

### Non-goals

- Redrawing brand logos in the outline style (I6).
- An icon font. Lucide still ships one; inline SVG is better for accessibility and bundle size, and no target here needs a font.
- Vue, Svelte, Solid or Angular adapters in the first release. The data model makes each one a template when someone asks (§7, Later).
- Forking Lucide. Its sources are vendored and never edited.

---

## 2. Research

### 2.1 Lucide's source

- **Layout.** `icons/<name>.svg` plus `icons/<name>.json`: 2,020 icons in 43 categories (`categories/*.json`), with tag groups in `groups/`. The metadata holds `contributors`, `tags`, `categories`, `use-cases` and `aliases` (`{ name, deprecated, deprecationReason, toBeRemovedInVersion }`). For example `house` keeps `home` as a deprecated alias. `lucide-static` ships 2,296 SVG files because aliases get their own files.
- **Licence.** ISC (Copyright 2026 Lucide Icons and Contributors), with a section for the icons derived from Feather (MIT). Both allow copying and modification as long as the notice is kept.
- **Lucide Lab.** 357 extra icons (`@lucide/lab` 0.12.0), used through `<Icon iconNode={coconut} />`. This is Lucide's own way to extend the set without touching it.
- **Cadence.** v1 is out. 1.66.0 shipped on 2026-10-31 and 1.67.0 on 2026-11-03: minor releases arrive every few days.

### 2.2 The design spec

From `docs/contribute/icons/specification.md` and `design-principles.md`:

- 24 × 24 square canvas, strokes at least 1px from the edge.
- 2px centred strokes with round joins and round caps.
- Corners: a 2px radius on elements of 8px or more, 1px below that, about 2.41px where diagonals meet at 90°, and sharp where more than two lines meet.
- At least 2px between distinct elements, and inner gaps of at least 2px (a 2px circle must fit).
- Visual weight similar to `circle` and `square` (blur test), visually centred, low density, simple curves (arcs and quadratics before cubics), aligned to the pixel grid where that doesn't hurt the shape, and established geometry reused.

From `code-conventions.md`:

- Fixed root attributes: `width`/`height` 24, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, round caps and joins.
- Only `path d`, `line`, `polyline`, `polygon`, `circle`, `ellipse` and `rect x y width height rx`.
- No transforms, filters, fills, explicit stroke colours or `<use>`. Paths tidied to 3 decimals.
- Checked by a Prettier plugin (`prettier-plugin-lucide-svg.mjs`), ESLint on the JSON, cspell, and `checkIconsAndCategories.mts`.

Naming (`naming-conventions.md`): lowercase kebab-case, American English, named for what the icon depicts, modifiers after the base (`circle-user`, `square-dashed`).

### 2.3 Packages and build

- **Build.** `tools/build-icons` (published as `@lucide/build-icons` 1.1.0, but its README calls it internal) reads the SVGs with svgson and renders one module per icon from a per-package template, plus barrels, alias files and dynamic-import maps.
- **Data.** `@lucide/icons` 1.67.0 is the framework-free data package: `{ name, node, aliases, size }`, where `node` is a list of `[tag, attributes]`.
- **`lucide-react`.**
  - One `Icon` base renders any data, and `createLucideIcon(data)` wraps it once per icon.
  - Each icon is exported three ways: `House`, `HouseIcon` and `LucideHouse`.
  - Props: `size`, `color`, `strokeWidth`, `absoluteStrokeWidth` (deprecated in v1 in favour of `nonScalingStroke`), `className` and children.
  - It adds the classes `lucide lucide-<name> lucide-<alias>`, and since v1 it sets `aria-hidden="true"` unless the icon gets an accessible prop or children.
  - v1 added `LucideProvider` for default size, colour and stroke. It made `Icon.ts` a `'use client'` module, so every icon is a client module.
  - One icon module is 445 B gzip (lucide-react 1.61.0 in this repo, unminified, including its JSDoc preview).
- **`lucide-react-native`.** The same `Icon` and props over `react-native-svg` (peer 12 to 15), with attribute names converted to camelCase.
- **`lucide-static`.** SVG files, `sprite.svg`, `icon-nodes.json`, `tags.json`, SVG strings as ESM, and a font with stable code points.

### 2.4 Brand logos in Lucide

v1 removed every brand icon. `BRAND_LOGOS_STATEMENT.md` gives three reasons:

1. Trademarks usually forbid the modification a consistent style needs.
2. Logos break the stroke rules.
3. The requests never stop.

Lucide keeps `brand-stopwords.json` (Adobe, Amazon, Android, …) to reject brand names, and points users to Simple Icons.

### 2.5 Simple Icons

- 16.36.0 has 3,467 marks. The project is CC0, but an icon can carry its own `license` (224 do) and a `guidelines` link (839 do). `DISCLAIMER.md` puts the burden of permission on the user.
- Every mark is one filled path on a 24 × 24 viewBox, full bleed (no padding), with a brand `hex`.
- Missing today: LinkedIn, Slack, Microsoft, Amazon Web Services, OpenAI and Visual Studio Code. LinkedIn and OpenAI were still in 13.0.0; SharpOS's spec records them as removed after trademark requests from the rights holders.

### 2.6 Fabricator and the shadcn CLI today

- Registry source writes `<IconPlaceholder lucide tabler hugeicons phosphor remixicon />`, with 186 distinct Lucide names across the bases. The CLI swaps in the project's `iconLibrary` at install.
- In `@shadcn/registry` 4.22.1, `iconLibraries` is a hard-coded list of those five. `transformIcons` returns a file unchanged when `iconLibrary` is not in the list, so `iconLibrary: "fabricator"` would leave raw `IconPlaceholder` elements in the user's code. A sixth library can't come through that field.
- A registry entry in `components.json` accepts `{ url, params, headers }`, and `params` are added as query parameters to the item URLs. Our `/init` writes this entry.
- `apps/web/scripts/build-icons.ts` generates the site's per-library icon maps (`lib/site-icons*`) and `public/r/icons/index.json`, which published CLI versions read for `migrate icons`.
- The Fabricator style draws icons at 14, 16 and 18px (compact, default, spacious) with `stroke-[1.5]`, rising to 2 on hover (DESIGN.md). Lucide designs and reviews at 24px with stroke 2.
- Fabricator's dark `--surface-1` is `oklch(0.205 …)`, which is `#171717` at zero chroma.
- Upstream login and signup blocks inline filled brand SVGs (GitHub, Google, Apple, Meta), in the Simple Icons style.

### 2.7 SharpOS brand icons

Data in `~/Dev/repos/sharpos/packages/core/brand-icons/src/index.ts`, spec in `packages/features/brand-kit/docs/spec-brand-icons.md`, renderers in `packages/core/ui/src/components/brand-svg.tsx` (web) and `packages/core/ui/src/mobile/brand-glyph.tsx` (React Native).

- **Set.** 79 marks in three groups. Each has a slug, label, group, hex, search keywords ("twitter" finds X, "gcal" finds Google Calendar), one 24 × 24 path, and optional `art` and `scale`.
  - Social (27): Instagram, Facebook, Meta, X, Threads, TikTok, YouTube, Pinterest, Reddit, Snapchat, WhatsApp, Telegram, Discord, Twitch, Medium, Hashnode, DEV, Substack, Bluesky, Mastodon, Vimeo, Behance, Dribbble, LinkedIn, Messenger, Linktree, Patreon.
  - Marketing & commerce (25): Google, Google Ads, Google Analytics, Google Calendar, Google Maps, Google Search Console, Google Sheets, Gmail, Shopify, Stripe, Mailchimp, HubSpot, Spotify, Netflix, Calendly, Typeform, Semrush, Hotjar, Mixpanel, Google Tag Manager, WooCommerce, Squarespace, Wix, PayPal, Buffer.
  - Product & dev (27): Notion, Figma, WordPress, Webflow, Framer, Zapier, GitHub, Apple, Anthropic, OpenRouter, Resend, ElevenLabs, Cal.com, OpenAI, Zoom, Linear, Trello, Asana, Airtable, Miro, Loom, Dropbox, Vercel, Cloudflare, Supabase, PostHog, Uptime Kuma.
- **Where the geometry comes from** (checked against the packages):
  - 75 single-colour paths are byte-identical to Simple Icons 16.36.0.
  - OpenRouter's path predates Simple Icons' current one.
  - OpenAI's path is Simple Icons' mark from before its removal (still in 13.0.0).
  - LinkedIn and Cal.com have only `art`; their `path` is a placeholder square.
- **Multi-colour `art`, 15 marks.** These are unrecognisable flattened to one colour: the Google family (9, Gmail included), Figma, TikTok, YouTube, Dribbble, LinkedIn and Cal.com.
  - 12 come from Iconify's `logos` set (gilbarbara/logos, CC0). 11 are byte-identical and YouTube only writes `red` as `#ff0000`.
  - Search Console comes from Google's own `logo_search_console.svg`. Google Sheets (a 512 × 512 box) and Cal.com have no recorded source, and Cal.com's art wraps its path in `<g transform="translate(…)">`.
  - No gradients, `<defs>` or ids (rejected when the data is generated), so several marks can share a page. Art boxes are not square (256 × 180 up to 256 × 384) and are letterboxed.
- **Optical size.** Simple Icons fills the box, so marks that reach the corners (X, LinkedIn, Medium) look oversized. SharpOS measures each mark's reach (95th-percentile ink distance from the centre) against the set's median. A mark above 1.08× gets `scale = 1 / relative`, floored at 0.84, and the scale widens the viewBox: it can't clip, adds no nodes, and works the same in react-native-svg. 16 marks carry one.
- **Colour.** Marks render in brand colour.
  - Achromatic marks (HSL saturation below 0.15: X, Medium, Threads, TikTok, Notion, GitHub, Apple, …) take `currentColor`.
  - Light mode keeps the exact hex. On the dark surface (`#171717`), a hex below 3:1 is lightened in HSL until it reaches 4.5:1.
  - The web sets the pair as CSS variables and switches them with `.dark`; mobile picks by theme. Art skips all of this and needs `fill` on its root, because TikTok's note is deliberately unfilled.
- **Size.** About 40 KB of path data in one module, so SharpOS lazy-loads it. The largest single path is Mailchimp's (4 KB), the largest art TikTok's (1.7 KB).
- **Tests.** Well-formed data, unique slugs, group coverage, exact light hexes, dark legibility, achromatic inheritance, no gradients in art, art fills legible on dark, shrink-only scale with its floor, viewBox widening, unknown-slug fallback, and search by former name, parent brand and alias.

---

## 3. What ships

| Set             | Content                                     | Paint                      | Import                         |
| --------------- | ------------------------------------------- | -------------------------- | ------------------------------ |
| Outline         | Lucide 1:1, plus Fabricator originals       | 2px stroke                 | `@fabricator-ui/icons`         |
| Brands          | SharpOS's 79 marks, plus 34 more (I6)       | Fill: one colour, or brand | `@fabricator-ui/icons/brands`  |
| Duotone (later) | Outline icons with a tinted secondary layer | Stroke + translucent fill  | `@fabricator-ui/icons/duotone` |

```tsx
// React: web apps, and the Electron and Tauri renderers
import { HouseIcon } from "@fabricator-ui/icons"
import { GithubIcon, GoogleIcon } from "@fabricator-ui/icons/brands"

<HouseIcon className="size-4" />
<GithubIcon aria-label="GitHub" />   // one colour: currentColor
<GoogleIcon color="brand" />         // Google's own four colours
```

```tsx
// React Native
import { HouseIcon, IconProvider } from "@fabricator-ui/icons-react-native"

;<IconProvider color={colors.foreground} size={20}>
  <HouseIcon />
</IconProvider>
```

```ts
// Any other framework, server templates, plain HTML
import { house } from "@fabricator-ui/icons-static" // SVG string

// also: icons/house.svg, brands/github.svg, sprite.svg, icon-nodes.json, tags.json
```

```sh
# Desktop native surfaces (tray, menus, notifications)
bunx fabricator-icons png house bell --size 16 --scale 1,2 --template --out src-tauri/icons/tray
```

---

## 4. Decisions

Each decision gives the pick and its reason, then the alternatives.

### I1. Lucide is an upstream, vendored at a pinned tag

`bun run icons:sync --ref 1.67.0` copies `icons/`, `categories/` and `LICENSE` from the tag into `packages/icons-core/sources/lucide/`, records the tag, SHA and date in `icons.lock.json`, and prints the added, changed, aliased, deprecated and removed icons. The vendored files are committed and never edited by hand.

Reason: reproducible builds and a reviewable diff on every sync, the same model as `upstream.lock.json` for shadcn.

- Alt: read `@lucide/icons` at build time. A smaller repo, but the package has no tags, categories or deprecation data, and changes hide inside a lockfile bump.
- Alt: a git submodule. Awkward with Bun workspaces and CI checkouts, for no gain.

### I2. Lucide's names and geometry are a contract

No Lucide icon is renamed, redrawn or removed ahead of Lucide. Lucide's aliases and deprecations pass through unchanged, and a removal reaches us only through a sync, in a major version. Fabricator originals take names Lucide doesn't use. When a sync brings a Lucide icon with a name we already use in the outline set, `icons:check` fails: keep Lucide's and turn ours into an alias if it depicts the same thing, or rename ours.

Reason: this is what makes the move from `lucide-react` a one-line change, and it keeps every `IconPlaceholder lucide="…"` value a valid Fabricator name. It is the icon version of the superset rule in AGENTS.md.

- Alt: a prefix for originals (`fab-…`). No collisions ever, but users would have to know which icons are ours.

### I3. Packages

| Package                             | Contents                                                                                            | Dependencies                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `@fabricator-ui/icons`              | React components: outline, `/brands`, `/duotone`, `/dynamic`, `/catalog`                            | peer `react`                               |
| `@fabricator-ui/icons-react-native` | The same components over `react-native-svg`, plus `IconProvider`                                    | peer `react`, `react-native-svg` ^15       |
| `@fabricator-ui/icons-static`       | SVG files, `sprite.svg`, `icon-nodes.json`, `tags.json`, SVG strings, the `fabricator-icons` CLI    | optional peer `@resvg/resvg-js` (CLI only) |
| `packages/icons-core` (private)     | Sources, metadata, sync, check and build scripts, and the runtime helpers bundled into each package | none at runtime                            |

Reason: Fabricator is React-only, so React gets the short name, the way `lucide-react` is Lucide's most used package. Every other target gets an explicit suffix. `@resvg/resvg-js` is an optional peer so users who only want SVG files don't download native binaries.

### I4. Our own build script, ported from Lucide's

`packages/icons-core/scripts/build.ts` (Bun) parses the SVGs, validates them, and writes the per-icon modules for each package from a template. The parts of `tools/build-icons` we need are ported under ISC and credited in `NOTICE.md`.

Reason: `@lucide/build-icons` calls itself internal and has no notion of fill paint, multi-colour art or a secondary layer. A few hundred lines of our own code cost less than tying every release to its internals.

- Alt: `@lucide/build-icons` with our own templates. The fastest start, and it breaks whenever Lucide refactors it.

### I5. Two data shapes: icons and brands

```ts
type IconElement = [
  tag: "path" | "circle" | "rect" | "line" | "polyline" | "polygon" | "ellipse",
  attributes: Record<string, string>,
]

// Outline and duotone: stroke paint
type IconData = {
  name: string // kebab-case
  node: IconElement[]
  secondary?: IconElement[] // duotone only: filled, translucent
  aliases?: string[]
}

// Brands: fill paint
type BrandIconData = {
  name: string
  node: IconElement[] // single-colour geometry on 24 × 24
  art?: { width: number; height: number; node: IconElement[] } // the brand's own colours
  colors: { inherit: boolean; light: string; dark: string } // resolved at build time
  scale?: number // optical correction, widens the viewBox
  aliases?: string[]
}
```

The renderer sets the root attributes from the shape (stroke for icons, fill for brands), and React and React Native read the same data. Lucide's icons compile to an `IconData` whose `node` equals Lucide's (tested, §8). Metadata that only pickers and the site need (title, group, tags, hex, source, licence) lives in the catalog (I8), not in each icon module.

### I6. Brands: SharpOS's set first, real marks, one colour or brand colour

**Starting set: SharpOS's 79 marks**, with their geometry, hex, groups, keywords and optical scale unchanged.

- Names follow Lucide's naming rules (`google-analytics`, `dev-to`, `cal-com`, `uptime-kuma`), and SharpOS's slugs stay as aliases (`googleanalytics`, `devto`, `cal`, `uptimekuma`). Values SharpOS has stored as `{ type: "brand", value }` keep resolving through `DynamicIcon` and the catalog.
- SharpOS's groups (Social, Marketing & commerce, Product & dev) become the brands' categories, and its keywords become `tags`.

**Additions: 34 marks**, for 113 in v1.

- From official brand kits, because Simple Icons removed or never had them: Slack, Microsoft, Amazon Web Services, Visual Studio Code. OpenAI's single-colour mark also moves to its official kit, replacing the copy SharpOS took from an old Simple Icons release.
- From Simple Icons, because the brief names Node.js and Fabricator's users are developers: GitLab, Bitbucket, Android, iOS, Node.js, Bun, Deno, React, Next.js, Vue.js, Svelte, Astro, Vite, TypeScript, JavaScript, Tailwind CSS, shadcn/ui, Docker, npm, pnpm, Netlify, Firebase, Convex, Electron, Tauri, Expo, Claude, Google Chrome, Firefox, Safari. All 30 are in 16.36.0, in Product & dev.

**Sources**, imported by `bun run icons:brands` and recorded per brand (`source`, `license`, `guidelines`):

| Source                             | Licence                                       | Used for                                                                                                                                               |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Simple Icons 16.36.0               | CC0; none of these carries a per-icon licence | 77 single-colour paths (SharpOS's 75, OpenRouter's current path, Cal.com's mark), the 30 additions                                                     |
| Iconify `logos` (gilbarbara/logos) | CC0                                           | 12 artworks: Google, Google Ads, Google Analytics, Google Calendar, Google Maps, Google Tag Manager, Gmail, Figma, TikTok, YouTube, Dribbble, LinkedIn |
| Official brand assets              | The brand's own terms                         | Search Console art, Google Sheets art, Cal.com art (both traced to their brand pages first), OpenAI, Slack, Microsoft, AWS, VS Code                    |

- The terms of every official kit are read at import and recorded in the brand's JSON. If a kit forbids redistributing its files, that one mark waits and its docs entry links to the kit.
- LinkedIn's art is a single path in one colour, so its single-colour mark is the same path in `currentColor`.

**Never redrawn.** Paths and art stay as the brand draws them. The only change is the uniform scale below, applied through the viewBox. Linear and radial gradients are kept under local ids that each renderer prefixes per copy (SharpOS rejects them); filters, masks and `<use>` are rejected at import. Cal.com's `<g transform>` is flattened into its path data.

**Size: SharpOS's measured method.** Marks keep the full 24 × 24 box, and the shrink-only `scale` (above 1.08× the median reach, floored at 0.84) widens the viewBox. The median is frozen from SharpOS's 79 marks as a constant in `icons-core`, so adding brands never resizes existing ones. This replaces the earlier draft's 20 × 20 padded box, which would have made every mark about 17% smaller than SharpOS renders it.

**Colour: two modes.**

- Default: one colour that follows light and dark mode, like any icon. That fits icon buttons, footers and the "Continue with Google" buttons in upstream blocks.
  - Web: `currentColor`, which inherits the theme's foreground.
  - React Native has no colour inheritance, so the default is `IconProvider`'s `color`, or else Fabricator's `--foreground` for the active scheme: `#171717` in light, `#f5f5f5` in dark (I8).
- `color="brand"` is SharpOS's behaviour:
  - Art when the mark has it, with `fill="currentColor"` on the root for parts left unfilled on purpose.
  - Achromatic marks take `currentColor`.
  - Every other mark takes its official hex in light mode and the lifted one in dark. `resolveBrandColors` is ported and runs at build time against `#171717`, which is also Fabricator's dark `--surface-1`.
- On the web, the brand colour renders as a `fill="<light>"` attribute plus `style="fill: light-dark(<light>, <dark>)"`.
  - `light-dark()` follows `color-scheme`, which next-themes sets by default. Apps that only toggle a `.dark` class add `.dark { color-scheme: dark }`.
  - A browser without `light-dark()` drops the declaration and keeps the light hex.
  - No hook reads the theme, so nothing can hydrate mismatched and icons stay server components.
- React Native picks by `IconProvider`'s `colorScheme`, defaulting to `useColorScheme()`.

**Rendering art.** The build compiles art into `IconElement[]`, so it renders through `<path>` and `Path` like everything else: no `dangerouslySetInnerHTML` on the web and no `SvgXml` parsing in React Native.

**Separation.** Brands have their own entry (`/brands`), a `BRANDS.md` disclaimer (the code is MIT, the marks belong to their owners, nothing implies endorsement, check each brand's guidelines), and a takedown process: a removal request ships in the next patch release, with the name kept as a deprecated export that renders nothing for one major version.

**Shared names.** Brand `apple` and `x` share names with Lucide's fruit and close glyph. That's allowed because the sets live in separate entries: a file that needs both aliases one (`import { XIcon as XBrandIcon } from "@fabricator-ui/icons/brands"`), and `DynamicIcon` takes `set="brands"`.

**No variants.** Brands get no outline or duotone versions.

Reason: Lucide's statement is right on the law (an Instagram logo in 2px strokes is a modified trademark), and SharpOS has already solved size, colour and dark-mode legibility for these marks in production. Starting from its data gives Fabricator a tested set on day one and lets SharpOS move onto the shared package.

- Alt: brand colour as the default, as in SharpOS. Right for pickers and integration lists, wrong for icon buttons and monochrome login buttons. `color="brand"` is one prop away.
- Alt: a 20 × 20 padded box (the earlier draft). Closer to the outline set's 1px safe zone, but it shrinks every mark relative to SharpOS.

### I7. Duotone: one secondary fill layer, CSS-themeable on the web, props on native

- **Authoring.** `sources/duotone/<name>.svg` is the outline icon plus one `<g id="secondary">` of closed shapes (Figma writes layer names as ids when "Include id attribute" is on). The build checks that the outline part equals the outline icon exactly, moves the group's children into `secondary`, and drops the id, because ids collide when many SVGs share a page.
- **Rules for the secondary layer.** Closed shapes, filled, no stroke, inset from the outline by at least half a stroke, one layer per icon, and never the only thing carrying meaning: the icon must read with the layer hidden.
- **Web.** Secondary elements render with `stroke="none"` and `style="fill: var(--icon-secondary-color, currentColor); fill-opacity: var(--icon-secondary-opacity, 0.2)"`. The `secondaryColor` and `secondaryOpacity` props set those variables on the root `<svg>`. CSS can theme a whole subtree (`.toolbar { --icon-secondary-color: var(--primary) }`), Tailwind arbitrary properties included.
- **React Native.** No CSS variables there, so the same two props, which `IconProvider` can also set.
- **Tokens.** `--icon-secondary-color` and `--icon-secondary-opacity` join `registry/fabricator/foundations.ts` only when a Fabricator component starts using duotone.
- **Shape of the API.** Same names as the outline set, on their own subpath. Switching variants is an import change, and neither variant's data ends up in the other's bundle.

Reason: one layer with one colour and an opacity is where Phosphor (`weight="duotone"`, 0.2) and Font Awesome Duotone (`--fa-secondary-opacity`, 0.4) both ended up. A layer drawn per icon looks far better than one derived automatically.

- Alt: a `variant` prop on each icon. One import, but every icon ships both variants' data.
- Alt: derive duotone by filling every closed outline shape. Free, and wrong on half the set: it fills rings, gaps and counters.

### I8. React API: Lucide's props, no context on the web

- **Props.** `size` (default 24), `color` (default `currentColor`), `strokeWidth` (default 2), `nonScalingStroke`, `absoluteStrokeWidth` (accepted and deprecated, as in Lucide), `className`, `title` or children, and any SVG attribute. Duotone adds `secondaryColor` and `secondaryOpacity`. Brand icons ignore the stroke props and accept `color="brand"`.
- **Default colour in React Native.** Nothing inherits a colour there, so `color` defaults to `IconProvider`'s `color`, or else Fabricator's `--foreground` for the scheme from `useColorScheme()` (`#171717` light, `#f5f5f5` dark). Icons and brands follow light and dark mode with no provider at all.
- **Exports per icon.** `HouseIcon` and `House`. Registry code uses both forms (`IconPlaceholder` values include `BadgeCheck` and `BookOpen`). `LucideHouse` is not exported.
- **Shared exports.**
  - `Icon` (`<Icon data={…} />` for custom icon data), `createIcon` and `iconNames`.
  - `@fabricator-ui/icons/dynamic`: `<DynamicIcon name="house" />` and `<DynamicIcon set="brands" name="instagram" />` for names that come from data, aliases included. Lazy imports, client only.
  - `@fabricator-ui/icons/catalog`: names, titles, categories, tags and aliases for every set, brand hexes and sources, and `searchIcons(query, { set })` (SharpOS's `searchBrandIcons`, ported). It's for icon pickers like SharpOS's and for the site, and it's meant to be lazy-loaded.
- **Markup.** Classes `fab-icon fab-icon-<name>`. `aria-hidden="true"` unless `aria-label`, `aria-labelledby`, `title` or children are given (Lucide v1 behaviour).
- **No provider on the web.** Icons stay plain server-renderable modules without `"use client"`. Size and stroke come from props or CSS, which is how Fabricator components already size them (`[&_svg:not([class*='size-'])]:size-4`, `stroke-[1.5]`). A provider would turn every icon into a client module, as it did in Lucide v1.
- **React 19 only** (PLAN D11): `ref` is a regular prop, no `forwardRef`.
- **Build output.** ESM and CJS, `sideEffects: false`, one module per icon, an `exports` map with `./brands`, `./duotone`, `./dynamic`, `./catalog` and `./icons/*`.

Reason: a drop-in for `lucide-react` users that stays RSC-safe by default.

### I9. Desktop: web packages in the renderer, PNGs for native surfaces

Electron and Tauri render React in a webview, so `@fabricator-ui/icons` covers the app UI as-is (inline SVG has no CSP issue under Tauri). Trays, menus and notifications take raster images, so `fabricator-icons png` renders the same data through resvg:

- `--size`, `--scale 1,2` (writes `@2x` files), `--color` (`brand` works for brands), `--stroke`.
- `--template`: black on transparent, with names ending in `Template`. Electron's `Tray` treats those as macOS template images, and Tauri takes `iconAsTemplate` (it needs the `image-png` Cargo feature to load PNGs).

Reason: tray icons come from the same source as everything else, with no hand-exported PNGs.

### I10. Registry integration: opt-in, through the registry entry

- **Phase 1 changes nothing in the registry.** Components keep `IconPlaceholder`, and projects keep their `iconLibrary` (Lucide by default). The outline set is Lucide 1:1, so a project that uses `lucide-react` in components and `@fabricator-ui/icons` in its own code renders identical glyphs.
- **Phase 3 adds a Fabricator option.**
  - `/init?icons=fabricator` writes `iconLibrary: "lucide"`, which keeps bare upstream items installable, and `"@fabricator": { "url": "…/r/fabricator/{style}/{name}.json", "params": { "icons": "fabricator" } }`.
  - The registry build writes a second copy of only the items whose files contain `IconPlaceholder`, with icons resolved to `@fabricator-ui/icons` imports and that package added to `dependencies`. It reuses the build's existing step that resolves `IconPlaceholder` to Lucide for the docs copies.
  - A `next.config.mjs` rewrite with `has: [{ type: "query", key: "icons", value: "fabricator" }]` serves that copy. The shadcn icon transform finds no placeholder and leaves the files alone.
  - The e2e suite must confirm the CLI sends `params` on dependency fetches too. The schema allows `params`; that behaviour isn't verified yet.
- **Upstream, in parallel.** Propose that `iconLibrary` accept a library defined by a registry (`{ name, packages, import, usage }`). If shadcn ships it, drop the second copy.

Reason: no shadcn fork and no CLI codemod, and items stay static JSON on the CDN.

- Rejected: a `fabricator-ui` post-install codemod from `lucide-react` to `@fabricator-ui/icons`. It re-implements a shadcn transform in the CLI, which AGENTS.md rules out.
- Rejected: a new `IconPlaceholder` attribute. The shadcn CLI can't read it (PLAN §6.2).

### I11. The site gets one icons page, not 2,000 routes

`/icons` has search over names, tags and aliases, filters for category and set, and a detail panel with JSX, SVG and import snippets to copy, SVG and PNG downloads, and a size and stroke preview. Brands also show their hex, guidelines link and licence, with a one-colour/brand-colour toggle. The selected icon is URL state (`?icon=house`, nuqs). The page loads the catalog (I8) as one static JSON file (`/r/icons/catalog.json`, separate from the `index.json` the CLI reads).

Reason: a static page per icon would add about 2,000 routes to a build that must fit in 8 GB (AGENTS.md toolchain notes).

- Alt: static `/icons/[name]` pages for search traffic. Test the build in the 4 CPU / 8 GB container first.

---

## 5. Fabricator icon spec

Lucide's specification is the spec for the outline set, adopted whole. Fabricator adds five rules:

1. Review every new icon at 14, 16 and 18px with stroke 1.5 and 2 (the Fabricator resting and hover strokes at each density), in light and dark, beside its nearest Lucide relatives.
2. Generic icons go to Lucide first. If Lucide accepts one, the next sync brings it in and ours becomes its alias (I2). Fabricator keeps only icons Lucide declines and glyphs specific to Fabricator, such as the sidebar panel toggle in DESIGN.md.
3. Brand names never enter the outline set. Lucide's `brand-stopwords.json` is part of the check.
4. Brand marks follow I6.
5. Duotone layers follow I7.

`bun run icons:check` (part of `bun run check`) automates:

- **Outline.** Lucide's root attributes, elements and attributes. 3-decimal precision; no transforms, ids, `<use>`, filters or inline styles. The stroked bounding box (geometry plus half the stroke) stays inside 1–23.
- **Brands.**
  - Single-colour geometry is `path` only, inside its viewBox.
  - Art uses shapes with `fill` only, plus linear and radial gradients under local ids: no filters, masks, `<use>` or transforms. A dark fill passes when a legible shape overlaps it; a gradient fill counts as legible when any stop is. Every declared fill clears 1.5:1 on `#171717` (SharpOS's bar: visible, if not high-contrast) or is left unfilled to follow `currentColor`.
  - `scale` is shrink-only, floored at 0.84, and matches what `icons:brands --measure` computes against the frozen median.
  - Every brand records `source` and `license`, and every official-kit brand records its terms.
- **Duotone.** The outline part matches its outline icon, and the secondary layer is closed shapes only.
- **Metadata.** Checked against Lucide's `icon.schema.json`, extended with the brand fields.
- **Names.** Kebab-case and unique within a set, counting aliases. No brand stopwords in the outline set. Brand names may repeat an outline name (I6).

Review covers what a script can't: weight, balance, density and curves. `bun run icons:sheet <names>` renders the icons at 14, 16, 18 and 24px, stroke 1.5 and 2, beside `circle`, `square` and their relatives, into one PNG to attach to the PR.

---

## 6. Source layout

```
packages/icons-core/                  private
  icons.lock.json                     Lucide tag + SHA; Simple Icons and Iconify logos versions
  sources/
    lucide/icons/*.svg, *.json        vendored by icons:sync, never edited
    lucide/categories/*.json
    lucide/LICENSE
    outline/*.svg, *.json             Fabricator originals (authored)
    brands/allowlist.json             authored: name, source, group, tags, aliases, scale
    brands/kits/*.svg                 marks copied from official kits, terms in the allowlist
    brands/*.svg, *.json              written by icons:brands, committed
    duotone/*.svg                     later (authored)
  fixtures/sharpos-brands.json        snapshot of @sharp/core-brand-icons 3.0.1 for the parity test
  schema/icon.schema.json
  scripts/                            sync-lucide.ts, import-brands.ts, check.ts, build.ts, sheet.ts
  src/                                IconData types, parse, validate, render helpers, brand colours
packages/icons/                       @fabricator-ui/icons (React)
packages/icons-react-native/          @fabricator-ui/icons-react-native
packages/icons-static/                @fabricator-ui/icons-static
```

- The generated per-icon modules in each package's `src/icons/` are gitignored and rebuilt by `turbo build`.
- Root scripts: `icons:sync --ref <tag>`, `icons:brands` (`--measure` recomputes scales), `icons:check`, `icons:sheet`. The existing `apps/web` `icons:build` (site icon maps) keeps its name, and in Phase 3 it reads the catalog for the Fabricator option.
- With Phase 1: a D14 entry and an updated §6.2 Icon pack row in PLAN.md (§14 question 6 answered), and the new paths and commands in the AGENTS.md repository map and commands table. `NOTICE.md` credits Lucide (ISC, with its Feather MIT section), Simple Icons (CC0) and gilbarbara/logos (CC0).

---

## 7. Phases

Each phase ends when the lines of the AGENTS.md definition of done that apply to it pass.

### Phase 1: pipeline and React, Lucide only

- `icons-core`: sync, data model, parser, check, build.
- `@fabricator-ui/icons` (outline set equal to Lucide) and `@fabricator-ui/icons-static` (files, sprite, nodes, tags, strings).
- Tests written first (§8).
- Exit: a Vite app and a Next.js app switch from `lucide-react` to `@fabricator-ui/icons` by import path alone and render identical SVG.

### Phase 2: brands, catalog, React Native, docs

- `icons:brands` with SharpOS's 79 marks, then the 34 additions; `BRANDS.md`; the `/brands`, `/catalog` and `/dynamic` entries.
- `@fabricator-ui/icons-react-native` with `IconProvider`, checked in an Expo app on the iOS simulator in light and dark, with and without the provider.
- The `/icons` page; docs pages for installation per platform, API, accessibility and the brands policy; `llms.txt` entries; icon rules in `skills/fabricator`.
- Exit: the 79 SharpOS marks match the fixture, every brand passes the check, `color="brand"` keeps X, Medium, Threads, TikTok, GitHub and Apple legible in dark mode on the web and in the simulator, and SharpOS's stored slugs resolve through `DynamicIcon`.

### Phase 3: Fabricator integration and desktop

- The registry option (I10), `/init?icons=fabricator`, the choice on `/create`, and "Fabricator" in the site's Icons setting.
- `test:e2e` for `vite-base` and `existing-shadcn` with and without the param.
- The `fabricator-icons png` CLI, with Electron and Tauri tray examples in the docs.
- Exit: e2e passes both ways, and the Electron and Tauri examples show a template tray icon on macOS.

### Phase 4: Fabricator originals

- A contribution guide (`packages/icons-core/CONTRIBUTING.md`), a Figma template (24px frame, 1px safe zone, 2px stroke), and the review sheet in the PR template.
- First originals: the glyphs Fabricator components need and Lucide lacks, starting with the sidebar panel toggle.

### Phase 5: duotone

- A pilot of the 40 icons Fabricator components and the homepage use most. The pilot settles the default opacity (0.2, or one of Fabricator's soft steps from 0.12 to 0.2) in light and dark.
- `@fabricator-ui/icons/duotone` and its React Native counterpart, with tokens in the foundations once a component uses it.
- Growth category by category. The duotone entry exports only drawn icons, and `icons:check` lists the outline icons still missing one.

### Later, on request

- SharpOS replaces `@sharp/core-brand-icons` and its renderers with `@fabricator-ui/icons/brands`, `/catalog` and `/dynamic` (work in the SharpOS repo).
- Vue, Svelte and Solid adapters, one template each, following Lucide's pattern.
- A copy-in registry item per brand mark (`@fabricator/icon-github`) for projects that want one logo without a dependency.

---

## 8. Testing

- TDD for parse, validate, build, render and the PNG CLI: Vitest, colocated `x.test.ts`, run by `bun run test`.
- **Data parity.** Every Lucide icon's generated `node` deep-equals `@lucide/icons` at the locked tag (a dev dependency, pinned to the same version).
- **Markup parity.** `renderToStaticMarkup(<HouseIcon />)` equals `lucide-react`'s output for every icon, with class names normalised.
- **SharpOS parity.** For the 79 marks, geometry, art, hex, resolved colours, scale and viewBox equal `fixtures/sharpos-brands.json`, exported once from `@sharp/core-brand-icons` 3.0.1. The fixture is committed because SharpOS is a private repo.
- **Brand behaviour.** SharpOS's dataset tests ported: exact light hexes, dark legibility, achromatic inheritance, art fills (gradient stops included) legible on dark, shrink-only scale and its floor, viewBox widening, unknown names falling back, and search by former name ("twitter"), parent brand ("meta") and alias ("gcal").
- **Behaviour.** Both export forms per icon, deprecated aliases, the `aria-hidden` default, duotone variables, brands ignoring stroke props, and the `light-dark()` style with its light-hex fallback attribute.
- **Visual snapshots.** resvg PNGs at 16 and 24px for originals, brands (both colour modes) and duotone. Lucide's icons don't need them: parity already proves they are identical.
- **Size budget.** `Bun.build` of `import { HouseIcon }`, asserting the gzip size stays at or under the same import from `lucide-react`.
- **React Native.** Render tests with `@testing-library/react-native`, then the Expo app on the simulator.

---

## 9. Versioning and release

- The icon packages share one version (a fixed group in changesets), independent of the CLI.
- A sync that adds icons is a minor release. A Lucide removal is a major one; deprecated aliases stay until Lucide drops them.
- Sync monthly or on demand. Lucide's minors land every few days, and nothing requires following each one.
- `scripts/publish.sh` publishes the icon packages alongside the CLI, and each release gets an entry in `content/docs/changelog/`.

---

## 10. Risks

| Risk                                                                                   | Response                                                                   |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A brand asks for removal                                                               | Separate entry, disclaimer, takedown process; removal in the next patch.   |
| An official kit's terms forbid redistribution (Slack, Microsoft, AWS, VS Code, OpenAI) | That mark waits and its docs entry links to the kit.                       |
| A webview lacks `light-dark()`                                                         | The `fill` attribute keeps the light hex; brand colour degrades to light.  |
| Lucide changes an icon that has a duotone version                                      | The duotone check fails on sync; fix the duotone file in the same PR.      |
| Lucide adds an icon with a name we use                                                 | `icons:check` fails; resolve per I2.                                       |
| shadcn makes icon libraries extensible differently than proposed                       | Adopt theirs and retire the `params` route.                                |
| The originals set grows past what one maintainer can review                            | The check blocks most spec breaks, and "Lucide first" keeps the set small. |

---

## 11. Decisions

### Answered (2026-11-03)

1. **Package names (I3):** `@fabricator-ui/icons` for React, suffixed packages for the other targets.
2. **Brand style (I6):** real filled marks in their own entry, never stroked redraws.
3. **React versions (I8):** React 19 only, per D11.
4. **Registry default (I10):** Fabricator icons are opt-in through `/init?icons=fabricator`.
5. **Brands Simple Icons lacks:** included. LinkedIn and OpenAI come with SharpOS's set; Slack, Microsoft, AWS and VS Code come from their official kits (I6).
6. **Dependencies:** approved: `svgson`, `@lucide/icons` and `lucide-react` (pinned dev dependencies for the parity tests), `@resvg/resvg-js` (optional peer of the CLI, dev dependency for snapshots), `simple-icons` and `@iconify-json/logos` (pinned import sources for `icons:brands`), `svgpath` (flattens Cal.com's transform at import), and in Phase 2 `react-native-svg` and `@testing-library/react-native`.
7. **Default brand colour (I6):** one colour that follows light and dark mode; `color="brand"` gives SharpOS's brand-colour behaviour.
8. **Developer additions (I6):** the 30 Simple Icons marks ship in v1, for 113 brands.
