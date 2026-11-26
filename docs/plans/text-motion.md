# Text Motion

A text animation primitive for Fabricator UI: one engine that splits a string and plays composable effect layers on the motion roles, so a project's speed, `data-motion`, `--motion-scale` and Reduce Motion retime or still every effect. References: shadcn.io text effects (CSS-first keyframes, a delay per piece, a hidden copy for screen readers), Motion's text animation guide, Magic UI Text Animate and Motion Primitives Text Effect (both MIT, API ideas only).

## API

One item, `text-motion`, in `registry/fabricator/shared/ui/text-motion.tsx`, the same HTML source for every base.

| Export             | What                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `TextMotion`       | Splits `children` by `character`, `word`, `line` or `text`, then plays `effect` and `loop` |
| `TextMotionGroup`  | Plays the Text Motions inside it one after another, on one trigger                         |
| `TextMotionRotate` | Cycles `texts` in place, each one entering and leaving with the same effects               |

```tsx
<h1>
  <TextMotion effect={["fade", "blur", "rise"]} by="word">
    Ship the interface, not the boilerplate
  </TextMotion>
</h1>

<TextMotionGroup trigger="view">
  <h2><TextMotion by="character" effect={["fade", "mask"]}>Fabricator</TextMotion></h2>
  <p><TextMotion effect="fade">Every component, on every platform.</TextMotion></p>
</TextMotionGroup>

<h2>Made for <TextMotionRotate texts={["designers", "engineers", "teams"]} /></h2>
```

### Effects

Entrance layers combine; each sets one property, so any set composes.

| Effect     | Starts from                                          | Property         |
| ---------- | ---------------------------------------------------- | ---------------- |
| `fade`     | Transparent                                          | `opacity`        |
| `blur`     | Blurred                                              | `filter`         |
| `rise`     | Below                                                | `translate`      |
| `fall`     | Above                                                | `translate`      |
| `slide`    | The end of the line                                  | `translate`      |
| `scale`    | Smaller                                              | `scale`          |
| `flip`     | Turned back on its baseline                          | `rotate`         |
| `mask`     | Below its line, clipped, so it rises out of the line | `clip-path`      |
| `scramble` | Random glyphs that settle into the text (JavaScript) | text content     |
| `type`     | Hidden, shown one piece at a time with a caret       | plays on its own |

Loops run after the entrance: `shimmer` (a band of light passes through the pieces) and `wave` (pieces lift in turn).

### Timing

- Entrance per piece: the `reveal` role; exit: `reveal-exit` on the exit curve.
- Stagger: a fraction of the piece duration per `by` (character 0.05, word 0.12, line 0.3; `type` 0.08), so a speed retimes it. `from` orders it: `start`, `end`, `center`, `edges`, `random` (seeded by the text, so the server and client agree).
- Group: each Text Motion starts when the previous one is mostly in, as a multiple of the same duration.
- Rotate: `interval` (reading time, ms) between texts; pauses on hover and focus.
- `trigger`: `view` (default, once a quarter is on screen) or `mount`. `onComplete` after the last piece lands.

### Foundations

- `instant` and `off` show the text at once; Reduce Motion keeps `fade` and `type`, drops movement, blur, mask, scramble and loops.
- A visually hidden copy carries the text; the moving pieces are `aria-hidden`. Rotate reads its texts once as a list.
- Without JavaScript the text shows (`@media (scripting: none)`).
- Words never break between characters; `line` splits at `\n`.

## Files

- Model: `shared/lib/text-motion-model.ts` (+ test): split, order, stagger, sequence starts, scramble frames, duration parsing.
- Source: `shared/ui/text-motion.tsx`; look: `styles/fabricator/text-motion.css`.
- Item in `registry/fabricator/registry.ts`; examples and docs for base, radix, aria; Basics group; catalog card; skill catalogue; changelog; DESIGN.md Motion.
- Native: dated `parity-exceptions.json` entry; a Reanimated port follows.

## Status

Web shipped on 2026-11-26 for base, radix and aria: model with tests, component, style map, ten examples, docs, group, catalog card, skill, changelog. The native explorer shows a stand-in until the port.

## Later

- `TextMotionNumber` (sliding digits with `Intl.NumberFormat`).
- Measured line splitting (lines as the browser wraps them).
- The React Native port.
