# Changelog

## [0.6.0](https://github.com/gabrielespinheira/fabricator-ui/compare/fabricator-ui%400.5.1...fabricator-ui%400.6.0) (2026-11-09)

### Highlights

Build chat interfaces with Chat Input, Model Picker and chat questionnaires. Add file explorers, uploads, code highlighting and video playback, with new date, time, month and color controls.

### Upgrade notes

- Components remain copy-in source: reinstall the items you want to update. Native availability and differences are documented per component; several new web controls are not yet available on native.
- Native Video Player requires expo-video and a rebuilt development client. Syntax Highlight uses refractor; Chat Input uses voice-glow.
- The CLI accepts `--spinner` for create and init. The starter set now includes Spinner, and setup links preserve the selection.

### Features

- Chat Input supports attachments, mentions, voice visuals, context meters and send, queue and stop states. Model Picker groups providers and reasoning options; Questionnaire can replace the composer and advance on a single selection.
- File Tree supports keyboard navigation, range selection, folder guides and open/delete callbacks. The Icons Files pack adds 249 Charmed file and folder icons, filename lookup and light/dark palettes across React, React Native and static outputs. Gemini and Grok brand marks join the icons.
- File Upload offers drag-and-drop validation, previews, progress and a compact field.
- Date Picker, Month Input and Time Input support typed values, ranges and form values; Date Picker can include a time wheel. Color Picker supports HEX, RGB, HSL, OKLCH, alpha, swatches and an eyedropper.
- Syntax Highlight provides shared web/native tokenization, line numbers, diffs and copy controls. Video Player adds captions, chapters, seeking, speed, picture in picture and fullscreen on web and native, with documented platform differences.
- Add subtle tabs, animated aspect ratios and 22 spinner patterns. Sidebar demos now demonstrate App Shell navigation.

### Bug Fixes

- Render Files icon blend styles safely in React and avoid server/client hydration mismatches in loading spinners.

- Preserve the selected spinner through initialization, setup commands, shared links and App Shell installs.
- Correct Input OTP default values, placeholders and native states; align input frames and grouped controls.
- Align navigation menu chevrons, preserve palette tokens in chat demos and distinguish the composer from its enclosing card.

## [0.5.1](https://github.com/gabrielespinheira/fabricator-ui/compare/main...release/v0.5.1) (2026-11-06)

### Bug Fixes

- Tinted-surface installations now retain the background, card, popover and sidebar Tailwind utilities instead of failing with `Cannot apply unknown utility class bg-background`.

### Upgrade notes

- Deploy the updated registry before expecting new installations to receive the fix. Existing broken installations need their CSS repaired or their theme reapplied after deployment.
- Workspace and native version files are aligned to 0.5.1. The public CLI advances from 0.5.0; the icon packages advance from 0.1.0 without API changes.

### Tests

- Add 83 CSS regression cases covering all three bases, all 11 templates, neutral and tinted surfaces, custom colors, partial updates and repair of broken installations.
- Add a CLI end-to-end scenario that creates, extends and builds a tinted Next.js monorepo.
