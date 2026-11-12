# Multi Select

A Fabricator-exclusive form control for picking several options from a searchable list, on every base and React Native. Reference for the feel: beUI's motion Multi Select (chips that pop in, wipe out and glide into place; a highlight that glides between rows; a check that scales in).

## Decisions

- **Built on the Combobox primitive, not a parallel one.** Base and Radix use Base UI `Combobox` with `multiple` (Radix's combobox is Base UI upstream too); Aria uses RAC `ComboBox` with `selectionMode="multiple"`. Filtering, keyboard, Backspace removal and ARIA come from the primitive.
- **Its own parts and placeholders** (`MultiSelect*`, `data-slot="multi-select-*"`, `cn-multi-select-*`), so its look can move independently of Combobox. Props extend the primitive's, like every component.
- **Selection stays open.** Picking an option keeps the list open and clears the query, which is what picking several needs. `onOpenChange` still fires for every other close.
- **Design system over the reference.** Field, chips, popup, rows, labels and the check use Fabricator tokens (input frame, `bg-active` chip, surface 3 popup, Fluid Hover, density, motion roles). The reference contributes motion only.
- **Motion by role.** Chips enter on `move` (`@starting-style`: fade, 6px rise, 0.92 scale), exit on `move-exit` (clip-path wipe), siblings FLIP on `move`; the check scales on `move`. All of it stops under reduced motion and `data-motion="off"`.
- **Pure model, thin DOM hook.** `shared/lib/multi-select-model.ts` keeps exiting chips in place and reads transition time; `shared/hooks/use-chip-presence.ts` does the DOM. Tested first.
- **Native** opens the list in a Dialog like native Combobox, with Reanimated enter/exit and layout transitions for chips and the same API.

## Steps

1. Model + tests, presence hook.
2. Base, Radix, Aria sources; `styles/fabricator/multi-select.css`; registry entry; tsconfig aliases.
3. Examples and docs per base; group (Forms), catalog card, meta.json, llms.txt, changelog, DESIGN.md.
4. Native source, style map, example, item, differences.
5. `registry:build`, `check`, `test`, `native:parity`; browser (light/dark, keyboard, widths, axe) and simulator checks.
