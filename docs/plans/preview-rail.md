# Preview Rail

A Fabricator-exclusive navigation rail: a column (or row) of thin ticks, one per section, that swell around the pointer like a dock, with a card beside the rail naming the section the pointer is on. Reference for the feel: beUI's motion Preview Rail. Web on every base and React Native.

## Decisions

- **Plain HTML, one shared source.** No primitive library fits: it's a `nav` of links or buttons. `registry/fabricator/shared/ui/preview-rail.tsx` serves all three bases (COMPONENTS.md, pure-HTML component).
- **Data-driven API, like `ImageCompare`.** `items` (`value`, `label`, `description`, `href`, `target`, `rel`, `disabled`), `value` / `defaultValue` / `onValueChange` (Base UI naming, as Tabs), `orientation`, `side` (where the card sits: `end` beside a vertical rail, `start` above a horizontal one by default) and `renderPreview`. The reference's per-part class props, `itemSize`, `children`, `showPreview` and `highlightActive` are dropped: density sets the step, `className` lays out the root, and the current item is always marked.
- **Design system over the reference.** Ticks are 2px `rounded-full` bars, `muted-foreground` at rest (full strength, for 3:1 non-text contrast), `foreground` when lit or current. The card is the hover-card recipe (`bg-surface-3 shadow-surface-3 rounded-xl`, p12, t13, title `font-medium`). Steps and lengths come from density tokens.
- **Motion by role, no `motion` dependency.** Ticks scale on `move` (indicators). The card fades and grows from the rail on `motion-popup` and glides between ticks on `move`; its content fades in on `feedback`. Reduced motion and `data-motion="off"` keep fades only.
- **The current item is always marked.** With nothing lit, the swell centres on the current item, so the rail shows where the reader is.
- **Touch follows Fluid Hover's strip rule.** A press lights the tick under the finger and shows its card; dragging along the rail scrubs; letting go on the rail activates the lit tick; letting go away from it does nothing. Same on the website (pointer events) and React Native (Gesture Handler).
- **The card stays over the rail.** It centres on the lit tick but never passes the rail's ends; a card longer than the rail overhangs both ends as little as it can (`getPreviewRailCardOffset`, a CSS `clamp()` on the web). Without it, a card near the end of a horizontal rail ran off a phone's screen.
- **Disabled ticks.** The light skips them while scrubbing, and lifting on one chooses nothing.
- **Accessibility.** `nav` with a label (default "Section navigation"); every tick a link or button named by its label, `aria-current` on the current one (`page` for links, `true` for buttons), the description as `aria-describedby`. Focus-visible lights the tick and shows the card; Escape hides the card. The card itself is `aria-hidden`.
- **Pure model first.** `shared/lib/preview-rail-model.ts`: swell scale by distance, lit item resolution, index at a point, release inside the rail. Shared with native.

## Steps

1. Model + tests.
2. Web source, render test, `styles/fabricator/preview-rail.css`, registry entry.
3. Examples and docs per base; group (Structure), catalog card, meta.json, changelog, DESIGN.md (root and style spec).
4. Native source, style map, example, item, docs.
5. `registry:build`, `check`, `test`, `native:parity`; browser (light/dark, keyboard, widths, axe) and simulator checks.
