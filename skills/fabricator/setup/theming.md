# Theming and extending

Changing what the tokens are. What they mean on a screen: [foundations.md](../foundations.md). How classes are written: [rules/styling.md](../rules/styling.md).

## Contents

- How it works
- Colour variables
- Brand and surface tint
- Dark mode
- Changing the theme
- Adding a colour
- Radius, motion and density
- Extending components
- Checking for updates

---

## How it works

CSS variables in the global stylesheet (`project.tailwindCss` in `info --json`) define the theme for `:root` and `.dark`; Tailwind v4 maps them to utilities; components use the utilities. Change a variable and everything follows. Keep the imports of `tailwindcss`, `tw-animate-css` and `shadcn/tailwind.css`. Colours are OKLCH.

In package mode (`@fabricator-ui/react`), override the same variables after importing `styles.css`.

## Colour variables

Shared with every shadcn-compatible registry, so keep their names and meaning: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive` (each with its `-foreground`), `--border`, `--input`, `--ring`, `--chart-1` to `-5`, `--sidebar-*`, `--radius`.

Fabricator adds its own: `--surface-0` to `-8` with `--shadow-1` to `-8`, the role tokens (`--info`, `--success`, `--warning` and each role's `-text`, `-border`, `-surface-N`), `--hover`, `--active`, `--selected`, `--tint`, `--focus-ring`, `--chart-series-1` to `-8`, `--density-*`, `--motion-*`. They ship in the `cssVars` of the items that use them, so `add` writes them.

## Brand and surface tint

Each role and the surfaces are one hue and one strength. Every fill, text and state is calculated from them and tested for contrast.

```css
:root {
  --primary-hue: 277;
  --primary-chroma: 0.2;
  --surface-hue: 277;
  --surface-chroma: 0.01;
}
```

Primary and secondary take any hue; statuses are clamped to their family. The preset writes the shared tokens as plain colours, so after setting the variables point those tokens at the roles and surfaces as the Colors page's generated CSS does, or pick them at Get started and apply the code it gives.

## Dark mode

`.dark` on the root element. In Next.js, `next-themes`:

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

`ThemeToggle` switches it.

## Changing the theme

```bash
npx fabricator-ui@latest apply <preset> --only theme,font   # colours and fonts, no component reinstall
npx fabricator-ui@latest apply <preset>                      # also reinstalls components: ask first
```

Preset codes are opaque; pass them through. See [cli.md](cli.md#switching-presets).

## Adding a colour

Define it for both themes in the global stylesheet, register it, use it. Never a new stylesheet.

```css
:root {
  --brand-2: oklch(0.62 0.15 200);
  --brand-2-foreground: oklch(0.99 0.01 200);
}
.dark {
  --brand-2: oklch(0.72 0.12 200);
  --brand-2-foreground: oklch(0.2 0.03 200);
}
@theme inline {
  --color-brand-2: var(--brand-2);
  --color-brand-2-foreground: var(--brand-2-foreground);
}
```

Check 4.5:1 for text and 3:1 for controls in both themes. `warning`, `success` and `info` exist already.

## Radius, motion and density

- **Radius:** `--radius` (`0.5rem`; Pill is `1.25rem`, `add radius-pill`). Everything derives from it.
- **Motion:** `data-motion="smooth|snappy|instant|off"` on `<html>`, or any element for its subtree; portalled popups follow `<html>`. Retune one role with `:root { --motion-popup: 200ms; }`; `--motion-scale` multiplies all.
- **Density:** `<html data-density="spacious">` or `DensityProvider` around a region. `density-*` utilities take breakpoints.

## Extending components

In order of preference:

1. A built-in variant or size.
2. Layout classes through `className`.
3. A new `cva` variant in the installed source, using tokens. Keep every existing name, prop and `data-slot`; add, never rename. In package mode, wrap instead.
4. A wrapper that composes components into the product's own piece:

```tsx
// Radix shown; Base UI uses render={children}
export function ConfirmDialog({ title, description, action, onConfirm, children }: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

## Checking for updates

```bash
npx fabricator-ui@latest diff button
npx fabricator-ui@latest add button --dry-run
npx fabricator-ui@latest add button --diff button.tsx
```

Merge by hand around local edits: [cli.md](cli.md#updating-components).
