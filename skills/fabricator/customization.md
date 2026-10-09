# Customization & Theming

Components reference semantic CSS variable tokens. Change the variables to change every component.

## Contents

- How it works (CSS variables → Tailwind utilities → components)
- Color variables and OKLCH format
- Dark mode setup
- Changing the theme (presets, CSS variables)
- Adding custom colors
- Border radius
- Customizing components (variants, className, wrappers)
- Checking for updates

---

## How It Works

1. CSS variables defined in `:root` (light) and `.dark` (dark mode), in the global CSS file (`project.tailwindCss` from `npx fabricator-ui@latest info`).
2. Tailwind maps them to utilities: `bg-primary`, `text-muted-foreground`, etc.
3. Components use these utilities — changing a variable changes all components that reference it.

The global CSS file imports `tailwindcss`, `tw-animate-css`, and `shadcn/tailwind.css`. Keep these imports; `npx fabricator-ui@latest doctor` flags a missing `shadcn/tailwind.css` import.

---

## Color Variables

Every color follows the `name` / `name-foreground` convention. The base variable is for backgrounds, `-foreground` is for text/icons on that background.

| Variable                                     | Purpose                          |
| -------------------------------------------- | -------------------------------- |
| `--background` / `--foreground`              | Page background and default text |
| `--card` / `--card-foreground`               | Card surfaces                    |
| `--popover` / `--popover-foreground`         | Popover and menu surfaces        |
| `--primary` / `--primary-foreground`         | Primary buttons and actions      |
| `--secondary` / `--secondary-foreground`     | Secondary actions                |
| `--muted` / `--muted-foreground`             | Muted/disabled states            |
| `--accent` / `--accent-foreground`           | Hover and accent states          |
| `--destructive` / `--destructive-foreground` | Error and destructive actions    |
| `--border`                                   | Default border color             |
| `--input`                                    | Form input borders               |
| `--ring`                                     | Focus ring color                 |
| `--chart-1` through `--chart-5`              | Chart/data visualization         |
| `--sidebar-*`                                | Sidebar-specific colors          |
| `--surface` / `--surface-foreground`         | Secondary surface                |

Fabricator components may add tokens under their own names (for example `--surface-*` or `--motion-*`). They ship in the `cssVars` of the items that use them, so `add` writes them for you. Never rename or repurpose the standard tokens above.

Colors use OKLCH: `--primary: oklch(0.205 0 0)` where values are lightness (0–1), chroma (0 = gray), and hue (0–360).

---

## Dark Mode

Class-based toggle via `.dark` on the root element. In Next.js, use `next-themes`:

```tsx
import { ThemeProvider } from "next-themes"

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

---

## Changing the Theme

```bash
# Apply the default Fabricator preset.
npx fabricator-ui@latest apply

# Apply a preset code.
npx fabricator-ui@latest apply a2r6bw

# Only the theme (colors) or fonts; components are not reinstalled.
npx fabricator-ui@latest apply a2r6bw --only theme,font

# Keep the current look for components.
npx fabricator-ui@latest apply a2r6bw --blend

# Preserve existing components instead.
npx fabricator-ui@latest init --preset a2r6bw --force --no-reinstall

# Use a custom init URL.
npx fabricator-ui@latest apply "https://fabricator-ui.com/init?base=radix&preset=fabricator&theme=blue&..."
```

Or edit CSS variables directly in the global CSS file.

---

## Adding Custom Colors

Add variables to the file at `project.tailwindCss` from `npx fabricator-ui@latest info` (typically `globals.css`). Never create a new CSS file for this.

```css
/* 1. Define in the global CSS file. */
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}
.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}
```

```css
/* 2. Register with Tailwind v4 (@theme inline). */
@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

Fabricator UI requires Tailwind CSS v4. If `project.tailwindVersion` is `"v3"`, run `npx fabricator-ui@latest doctor` and tell the user to upgrade before adding components.

```tsx
// 3. Use in components.
<div className="bg-warning text-warning-foreground">Warning</div>
```

---

## Border Radius

`--radius` controls border radius globally. Components derive values from it (`rounded-lg` = `var(--radius)`, `rounded-md` = `calc(var(--radius) - 2px)`).

---

## Customizing Components

See also: [rules/styling.md](./rules/styling.md) for Incorrect/Correct examples.

Prefer these approaches in order:

### 1. Built-in variants

```tsx
<Button variant="outline" size="sm">
  Click
</Button>
```

### 2. Tailwind classes via `className`

```tsx
<Card className="mx-auto max-w-md">...</Card>
```

### 3. Add a new variant

Edit the component source to add a variant via `cva`:

```tsx
// components/ui/button.tsx
warning: "bg-warning text-warning-foreground hover:bg-warning/90",
```

Keep existing variant names, props, and `data-slot` values when editing a component. Add, don't rename.

### 4. Wrapper components

Compose Fabricator UI primitives into higher-level components (radix shown; use `render` for base, see [rules/base-vs-radix.md](./rules/base-vs-radix.md)):

```tsx
export function ConfirmDialog({ title, description, onConfirm, children }) {
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
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## Checking for Updates

```bash
npx fabricator-ui@latest diff button
```

To preview exactly what would change before updating, use `--dry-run` and `--diff`:

```bash
npx fabricator-ui@latest add button --dry-run        # see all affected files
npx fabricator-ui@latest add button --diff button.tsx # see the diff for a specific file
```

See [Updating Components in SKILL.md](./SKILL.md#updating-components) for the full smart merge workflow.
