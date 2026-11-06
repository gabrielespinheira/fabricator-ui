# Changelog

## [0.5.1](https://github.com/gabrielespinheira/fabricator-ui/compare/main...release/v0.5.1) (2026-11-06)

### Bug Fixes

- Tinted-surface installations now retain the background, card, popover and sidebar Tailwind utilities instead of failing with `Cannot apply unknown utility class bg-background`.

### Upgrade notes

- Deploy the updated registry before expecting new installations to receive the fix. Existing broken installations need their CSS repaired or their theme reapplied after deployment.
- Workspace and native version files are aligned to 0.5.1. The public CLI advances from 0.5.0; the icon packages advance from 0.1.0 without API changes.

### Tests

- Add 83 CSS regression cases covering all three bases, all 11 templates, neutral and tinted surfaces, custom colors, partial updates and repair of broken installations.
- Add a CLI end-to-end scenario that creates, extends and builds a tinted Next.js monorepo.
