# Styling

How classes are written. What the tokens mean: [foundations.md](../foundations.md). Changing their values: [setup/theming.md](../setup/theming.md).

## Contents

- Variants, then tokens, then variables
- className is layout
- Class habits
- Stacking
- Text and scroll effects
- Motion you write
- Hover and cursors
- Density

---

## Variants, then tokens, then variables

1. A built-in variant: `<Button variant="outline">`, `<Badge variant="success">`.
2. A token: `text-muted-foreground`, `bg-hover`, `text-warning-text`.
3. A CSS variable in the global stylesheet, registered with Tailwind, when the product needs a colour the roles don't have.

```tsx
// Wrong: palette colours, hand-made outline
<span className="text-emerald-600">+20.1%</span>
<Button className="border border-input bg-transparent hover:bg-accent">Filter</Button>

// Right
<Badge variant="success"><ArrowUpRightIcon />+20.1%</Badge>
<Button variant="outline">Filter</Button>
```

No `dark:` overrides: tokens already carry both themes.

## className is layout

`className` on a component places it: width, grid span, margin, `self-*`. It doesn't change colour, type, height, padding, radius, border or shadow. A repeated need becomes a variant in the component's source.

```tsx
// Wrong
<Card className="border-2 bg-blue-50 shadow-lg">
// Right
<Card className="@4xl:col-span-6">
```

## Class habits

- `flex flex-col gap-*`, never `space-x-*` or `space-y-*`.
- `size-*` when width and height match; `truncate` for one-line ellipsis; logical sides (`ms-`, `pe-`, `text-start`).
- `cn()` for conditional classes, imported as the project does.
- `@container` and `@2xl:` / `@4xl:` for layout inside an app; viewport breakpoints for websites.
- Arbitrary values are for density tokens and grid templates. A pixel value usually means a token was missed.

## Stacking

Overlays stack themselves. No `z-*` on `Dialog`, `Sheet`, `Drawer`, `DropdownMenu`, `Popover`, `Tooltip` or `HoverCard`.

## Text and scroll effects

Live text is `<span className="shimmer">Thinking…</span>`.

### Scroll fades

Content that scrolls dissolves into its edge; it is never cut at a line. `ScrollArea`, `SidebarContent`, `TabStrip`, `MessageScrollerViewport` and `Attachment` already fade. On a scroller you write, pick by where the content leaves view:

| Content scrolls | On | Class |
| --- | --- | --- |
| Past the scroller's edges | the scroller | `scroll-fade` (vertical), `scroll-fade-x` (sideways); `scroll-fade-t` or `scroll-fade-b` for one edge |
| Under a sticky header, footer, composer or pinned column inside it | the scroller | `scroll-fade` + `scroll-fade-inset-{t,b,s,e}-<n>`, `<n>` the sticky part's size |
| Under a fixed or sticky part over a scroller that can't be masked, such as the page itself | the sticky part | `sticky-fade-b` (header), `sticky-fade-t` (footer, composer), `sticky-fade-e` (pinned start column) |

```tsx
// Wrong: the sticky header crops the rows at a line
<div className="overflow-y-auto">
  <header className="sticky top-0 h-10 border-b bg-background">Today</header>
  {rows}
</div>
// Right: the rows fade as they reach the header
<div className="scroll-fade scroll-fade-inset-t-10 overflow-y-auto">
  <header className="sticky top-0 h-10 bg-background">Today</header>
  {rows}
</div>
```

- The fade replaces the line: a sticky part over faded content drops its `border-b` and shadow.
- A mask fades everything inside its scroller. Give every sticky part in it an inset; for a sticky part whose size changes, set `scroll-fade-inset-t-[var(--header-height)]`.
- The card's surface and a focusable scroller's focus ring go on a wrapper (the mask clips the scroller's own), the fade on the scroller inside it. `sticky-fade-*` paints `--background`; on another surface set `[--sticky-fade-color:var(--card)]`. It draws with `::after`, on a sticky, fixed or positioned element.
- Keep the default depth. Only a strip under 40px tall sets one (`scroll-fade-6`). `scroll-fade-none` turns it off at a breakpoint.

## Motion you write

Roles, never milliseconds, so one speed setting retimes everything:

```tsx
// Wrong
<div className="transition-all duration-300 ease-out hover:bg-muted" />
// Right
<div className="transition-colors duration-feedback ease-feedback hover:bg-hover" />
<div className="motion-popup data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
```

`duration-feedback ease-feedback` (colour), `duration-move ease-move` (travel), `motion-tooltip`, `motion-popup`, `motion-dialog`, `motion-sheet`, `motion-disclosure`, `motion-toast`, `motion-press`. The speed is `data-motion` on `<html>`.

Text that animates is `TextMotion` around the string, inside its element, with effects as layers; it already splits, staggers, times and labels the text ([foundations.md](../foundations.md#text-that-plays-in)).

```tsx
// Wrong: hand-split spans with their own delays
{words.map((word, i) => <span style={{ animationDelay: `${i * 80}ms` }}>{word} </span>)}
// Right
<h2><TextMotion effect={["fade", "mask"]}>Every release, on time</TextMotion></h2>
```

## Hover and cursors

Components bring their hover and cursor. Prefer a `Button`, a link or an `Item` rendered as one; markup you make interactive takes the cursor of what a press does:

| A press | Class |
| --- | --- |
| Acts (a card or row that opens whole) | `cursor-pointer` |
| Types or edits text | `cursor-text` |
| Drags | `cursor-grab`, `cursor-grabbing` moving |
| Resizes | `cursor-col-resize`, `cursor-row-resize` |
| Enlarges | `cursor-zoom-in` |
| Is disabled but keeps its tooltip | `cursor-not-allowed` |
| Waits on background work, still usable | `cursor-progress` |

While a drag or resize runs, set its cursor and `select-none` on the document root, and clear them on release. What doesn't act gets no cursor class and no `hover:`.

```tsx
// Wrong: a div that acts
<Card onClick={() => open(project.id)} className="hover:bg-muted">
// Right: render (Base, React Aria) or asChild (Radix)
<Item render={<Link href={`/projects/${project.id}`} />}>
```

## Density

Set it once on the region:

```tsx
// Wrong
<header className="flex gap-2">
  <Button size="sm">New</Button>
  <Input className="h-7 text-xs" />
</header>

// Right
<DensityProvider density="compact">
  <header className="flex gap-(--density-8)">
    <Button>New</Button>
    <Input />
  </header>
</DensityProvider>
```

`DensityProvider` reaches the popups opened inside; `data-density` and `density-*` classes don't. `size="sm"` or `"lg"` pins one control; `data-density` pins any other component.
