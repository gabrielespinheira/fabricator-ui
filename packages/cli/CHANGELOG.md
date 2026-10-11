# fabricator-ui

## 0.2.1

### Patch Changes

- [#5](https://github.com/gabrielespinheira/fabricator-ui/pull/5) [`e53c245`](https://github.com/gabrielespinheira/fabricator-ui/commit/e53c2454a7aa2ab610a60013ac26b0cd52a771bc) Thanks [@gabrielespinheira](https://github.com/gabrielespinheira)! - Use `https://fabricator-ui.vercel.app` as the default registry host.

## 0.2.0

### Minor Changes

- Ship the Fabricator design system. The registry the CLI installs from now serves `@fabricator/foundations` (surfaces, interaction tokens, motion tiers, scrollbars), `@fabricator/fluid-hover` and Fluid Hover overrides for the menus, select, combobox, command, tabs, sidebar, accordion and table in all three bases, `@fabricator/sounds`, `@fabricator/radius-pill`, a Search component, and redesigned checkbox and radio styles. Surfaces take a base colour through `--surface-hue` and `--surface-chroma`. Native Select and Chart are left out of Fabricator mode, and RTL support is removed. The CLI end-to-end matrix installs Fluid Hover, sounds and the pill radius for every base.
