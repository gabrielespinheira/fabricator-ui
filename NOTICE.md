# Notice

Fabricator UI is built on [shadcn/ui](https://github.com/shadcn-ui/ui) by shadcn, used under the MIT License.

- The component registry (`apps/web/registry`), examples (`apps/web/examples`), style maps (`apps/web/registry/styles`), the registry build script and large parts of the documentation website are derived from `shadcn-ui/ui` (`apps/v4`). The pinned upstream commit is recorded in [`upstream.lock.json`](upstream.lock.json).
- The `fabricator-ui` CLI delegates to the official [`shadcn`](https://www.npmjs.com/package/shadcn) CLI.

The original copyright notice is preserved in [`LICENSE.md`](LICENSE.md).

Fabricator UI is an independent project and is not affiliated with or endorsed by shadcn or Vercel.

Fabricator Icons (`packages/icons*`) vendors the outline icons of [Lucide](https://lucide.dev) (ISC License, Copyright (c) 2026 Lucide Icons and Contributors; some icons derive from [Feather](https://feathericons.com), MIT License, Copyright (c) 2013-present Cole Bemis) in `packages/icons-core/sources/lucide/`, and ports parts of Lucide's build tooling. Brand mark geometry comes from [Simple Icons](https://simpleicons.org) (CC0-1.0) and [gilbarbara/logos](https://github.com/gilbarbara/logos) (CC0-1.0) through [Iconify](https://iconify.design), and the brand colour resolution is shared with SharpOS. The marks themselves are trademarks of their owners; see `packages/icons/BRANDS.md`, which also gives the licences and credits of the few marks that have their own (PHP's logo is CC BY-SA 4.0, by Colin Viebrock; Tux is by Larry Ewing and The GIMP). Motion's mark is copied from motion.dev. The animations in `@fabricator-ui/icons/animated` come from [lucide-animated](https://lucide-animated.com) (MIT License, Copyright (c) 2024-2026 pqoqubbw), vendored in `packages/icons-core/sources/animated/`.

The React Native components (`apps/web/registry/native`) are built on [RN Primitives](https://github.com/roninoss/rn-primitives) (MIT) and style themselves with [Uniwind](https://github.com/uni-stack/uniwind) (MIT). [React Native Reusables](https://github.com/founded-labs/react-native-reusables) (MIT) was the reference for how shadcn's patterns translate to React Native.

The Color Picker (`registry/fabricator/*/ui/color-picker.tsx`, `registry/fabricator/shared/lib/color-model.ts`) is adapted from the Color Picker of [Fluid Functionalism](https://www.fluidfunctionalism.com) (MIT License, Copyright (c) 2026 Micka Touillaud).

The Video Player's demo clip (`apps/web/public/media/sintel-trailer.*`) is the trailer for [Sintel](https://durian.blender.org), Copyright (c) Blender Foundation, used under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). It is re-encoded, with a poster frame taken from it and captions transcribed from its dialogue, with a Portuguese translation.
