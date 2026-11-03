# Notice

Fabricator UI is built on [shadcn/ui](https://github.com/shadcn-ui/ui) by shadcn, used under the MIT License.

- The component registry (`apps/web/registry`), examples (`apps/web/examples`), style maps (`apps/web/registry/styles`), the registry build script and large parts of the documentation website are derived from `shadcn-ui/ui` (`apps/v4`). The pinned upstream commit is recorded in [`upstream.lock.json`](upstream.lock.json).
- The `fabricator-ui` CLI delegates to the official [`shadcn`](https://www.npmjs.com/package/shadcn) CLI.

The original copyright notice is preserved in [`LICENSE.md`](LICENSE.md).

The Fabricator design language (surfaces, interaction tokens, motion tiers, fluid hover, scrollbars and component styling) is adapted from [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism) by Micka Touillaud, used under the MIT License (Copyright (c) 2026 Micka Touillaud). Adapted sources are `apps/web/registry/fabricator/` and `apps/web/registry/styles/fabricator/`. Fabricator UI is an independent project and is not affiliated with or endorsed by shadcn or Vercel.

Fabricator Icons (`packages/icons*`) vendors the outline icons of [Lucide](https://lucide.dev) (ISC License, Copyright (c) 2026 Lucide Icons and Contributors; some icons derive from [Feather](https://feathericons.com), MIT License, Copyright (c) 2013-present Cole Bemis) in `packages/icons-core/sources/lucide/`, and ports parts of Lucide's build tooling. Brand mark geometry comes from [Simple Icons](https://simpleicons.org) (CC0-1.0) and [gilbarbara/logos](https://github.com/gilbarbara/logos) (CC0-1.0) through [Iconify](https://iconify.design), and the brand colour resolution is shared with SharpOS. The marks themselves are trademarks of their owners; see `packages/icons/BRANDS.md`.
