# Styling & Customization

See [customization.md](../customization.md) for theming, CSS variables, and adding custom colors.

## Contents

- Semantic colors
- Built-in variants first
- className for layout only
- No space-x-_ / space-y-_
- Prefer size-_ over w-_ h-\* when equal
- Prefer truncate shorthand
- No manual dark: color overrides
- Use cn() for conditional classes
- No manual z-index on overlay components
- Use shimmer / scroll-fade utilities, not custom animations
- Animate with motion roles, never milliseconds
- Match the cursor to the interaction
- Set density on a container, not sizes on every component

---

## Semantic colors

**Incorrect:**

```tsx
<div className="bg-blue-500 text-white">
  <p className="text-gray-600">Secondary text</p>
</div>
```

**Correct:**

```tsx
<div className="bg-primary text-primary-foreground">
  <p className="text-muted-foreground">Secondary text</p>
</div>
```

---

## No raw color values for status/state indicators

For positive, negative, or status indicators, use Badge variants, semantic tokens like `text-destructive`, or define custom CSS variables — don't reach for raw Tailwind colors.

**Incorrect:**

```tsx
<span className="text-emerald-600">+20.1%</span>
<span className="text-green-500">Active</span>
<span className="text-red-600">-3.2%</span>
```

**Correct:**

```tsx
<Badge variant="success"><ArrowUpRightIcon />+20.1%</Badge>
<Badge>Active</Badge>
<Badge variant="destructive"><ArrowDownRightIcon />−3.2%</Badge>
```

If you need a success/positive color that doesn't exist as a semantic token, use a Badge variant or ask the user about adding a custom CSS variable to the theme (see [customization.md](../customization.md)).

---

## Built-in variants first

**Incorrect:**

```tsx
<Button className="border border-input bg-transparent hover:bg-accent">
  Click me
</Button>
```

**Correct:**

```tsx
<Button variant="outline">Click me</Button>
```

---

## className for layout only

Use `className` for layout (e.g. `max-w-md`, `mx-auto`, `mt-4`), **not** for overriding component colors or typography. To change colors, use semantic tokens, built-in variants, or CSS variables.

**Incorrect:**

```tsx
<Card className="bg-blue-100 font-bold text-blue-900">
  <CardContent>Dashboard</CardContent>
</Card>
```

**Correct:**

```tsx
<Card className="mx-auto max-w-md">
  <CardContent>Dashboard</CardContent>
</Card>
```

To customize a component's appearance, prefer these approaches in order:

1. **Built-in variants** — `variant="outline"`, `variant="destructive"`, etc.
2. **Semantic color tokens** — `bg-primary`, `text-muted-foreground`.
3. **CSS variables** — define custom colors in the global CSS file (see [customization.md](../customization.md)).

---

## No space-x-_ / space-y-_

Use `gap-*` instead. `space-y-4` → `flex flex-col gap-4`. `space-x-2` → `flex gap-2`.

```tsx
<div className="flex flex-col gap-4">
  <Input />
  <Input />
  <Button>Submit</Button>
</div>
```

---

## Prefer size-_ over w-_ h-\* when equal

`size-10` not `w-10 h-10`. Applies to icons, avatars, skeletons, etc.

---

## Prefer truncate shorthand

`truncate` not `overflow-hidden text-ellipsis whitespace-nowrap`.

---

## No manual dark: color overrides

Use semantic tokens — they handle light/dark via CSS variables. `bg-background text-foreground` not `bg-white dark:bg-gray-950`.

---

## Use cn() for conditional classes

Use the `cn()` utility from the project for conditional or merged class names. Don't write manual ternaries in className strings.

**Incorrect:**

```tsx
<div className={`flex items-center ${isActive ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
```

**Correct:**

```tsx
import { cn } from "cn"

<div className={cn("flex items-center", isActive ? "bg-primary text-primary-foreground" : "bg-muted")}>
```

---

## No manual z-index on overlay components

`Dialog`, `Sheet`, `Drawer`, `AlertDialog`, `DropdownMenu`, `Popover`, `Tooltip`, `HoverCard` handle their own stacking. Never add `z-50` or `z-[999]`.

---

## Use shimmer / scroll-fade utilities, not custom animations

For a live "thinking…" or loading-text shimmer, apply the `shimmer` utility. Don't author a custom `@keyframes` or a `bg-clip-text` gradient sweep.

For scroll-aware edge fading on a scroll container, use `scroll-fade` (and the axis variants `scroll-fade-x` / `scroll-fade-b`). Don't hand-roll mask gradients. The chat components already apply these internally: `Attachment` shimmers its title during upload, and `MessageScrollerViewport` fades its edges.

**Incorrect:**

```tsx
<span className="[animation:shimmer_1.6s_infinite] animate-pulse bg-gradient-to-r from-muted-foreground/40 via-foreground/70 to-muted-foreground/40 bg-clip-text text-transparent">
  Thinking…
</span>
```

**Correct:**

```tsx
<span className="shimmer">Thinking…</span>
```

---

## Animate with motion roles, never milliseconds

Fabricator components move by role, and one speed setting (`data-motion`) retimes all of them. Custom UI uses the same role utilities so it keeps pace. Fixed durations and curves ignore the speed the project picks.

**Incorrect:**

```tsx
<div className="transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-muted" />
<div className="animate-in fade-in zoom-in-95 duration-200" />
```

**Correct:**

```tsx
<div className="transition-colors duration-feedback ease-feedback hover:bg-muted" />
<div className="motion-popup data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
```

Roles: `duration-feedback` (hover, colour), `duration-move ease-move` (things that move on screen), `motion-tooltip`, `motion-popup`, `motion-dialog`, `motion-sheet`, `motion-disclosure`, `motion-toast`, `motion-press`. To change how fast everything moves, set `data-motion="smooth|snappy|instant|off"` on `<html>`; don't edit durations per component.

---

## Match the cursor to the interaction

Components set their cursors in the style. Tailwind gives a plain `<button>` or `<div>` the arrow, so markup you make interactive yourself needs its cursor. Prefer a `Button`, a link or an `Item` rendered as a link or button, which bring the cursor, the hover and the keyboard; otherwise pick by what a press does:

| Interaction                                     | Class                                           |
| ----------------------------------------------- | ----------------------------------------------- |
| Acts on click (a card or row that opens whole)  | `cursor-pointer`                                |
| Typing or editing text                          | `cursor-text`                                   |
| Drags (a handle, a board card, a canvas to pan) | `cursor-grab`, `cursor-grabbing` while it moves |
| A resize edge                                   | `cursor-col-resize` or `cursor-row-resize`      |
| Enlarges an image                               | `cursor-zoom-in`                                |
| Disabled but keeps hover for its tooltip        | `cursor-not-allowed`                            |
| Works in the background, still usable           | `cursor-progress`                               |

While a drag or resize runs, set its cursor and `select-none` on the document root and clear them on release, so the cursor holds when the pointer outruns the handle. What doesn't act gets no cursor class and no `hover:` styles, and a component's own cursor is never overridden. Desktop windows use the same cursors; touch has none, so no state depends on hover.

**Incorrect:**

```tsx
<Card onClick={() => openProject(project.id)} className="hover:bg-muted">
```

**Correct:**

```tsx
// render (Base, React Aria) or asChild (Radix)
<Item render={<Link href={`/projects/${project.id}`} />}>
```

---

## Set density on a container, not sizes on every component

Fabricator components size themselves from the density: `compact` (dashboards, toolbars), `default` (apps) or `spacious` (websites, landing pages). Set it once on the region, and use a `size` prop only to pin one component. Overriding heights and text sizes per component drifts from the rest of the page.

**Incorrect:**

```tsx
<header className="flex items-center gap-2">
  <Button size="sm">New</Button>
  <Input className="h-7 text-xs" placeholder="Search" />
  <Select>
    <SelectTrigger size="sm">…</SelectTrigger>
  </Select>
</header>
```

**Correct:**

```tsx
import { DensityProvider } from "@/components/ui/density"

;<DensityProvider density="compact">
  <header className="flex items-center gap-2">
    <Button>New</Button>
    <Input placeholder="Search" />
    <Select>
      <SelectTrigger>…</SelectTrigger>
    </Select>
  </header>
</DensityProvider>
```

`DensityProvider` also reaches the menus, popovers, tooltips and dialogs those components open in portals; a bare `data-density="compact"` attribute sizes everything else. For a whole marketing site, `<html data-density="spacious">`. `size="sm"` pins one control to compact and `size="lg"` to spacious; `data-density` pins any other component. Your own components stay density-aware with the tokens, named after their default value: `h-(--density-36)`, `px-(--density-12)`, `gap-(--density-8)`, `text-(length:--density-text-13)`, `size-(--density-icon-16)`.
