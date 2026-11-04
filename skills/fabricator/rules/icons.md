# Icons

**Always use the project's configured `iconLibrary` for imports.** Check `config.iconLibrary` in `info --json`: `lucide` → `lucide-react`, `tabler` → `@tabler/icons-react`, etc. Never assume `lucide-react`.

---

## Icons in Button use data-icon attribute

Add `data-icon="inline-start"` (prefix) or `data-icon="inline-end"` (suffix) to the icon. No sizing classes on the icon.

**Incorrect:**

```tsx
<Button>
  <SearchIcon className="mr-2 size-4" />
  Search
</Button>
```

**Correct:**

```tsx
<Button>
  <SearchIcon data-icon="inline-start"/>
  Search
</Button>

<Button>
  Next
  <ArrowRightIcon data-icon="inline-end"/>
</Button>
```

---

## No sizing classes on icons inside components

Components handle icon sizing via CSS. Don't add `size-4`, `w-4 h-4`, or other sizing classes to icons inside `Button`, `DropdownMenuItem`, `Alert`, `Sidebar*`, or other Fabricator UI components. Unless the user explicitly asks for custom icon sizes.

**Incorrect:**

```tsx
<Button>
  <SearchIcon className="size-4" data-icon="inline-start" />
  Search
</Button>

<DropdownMenuItem>
  <SettingsIcon className="mr-2 size-4" />
  Settings
</DropdownMenuItem>
```

**Correct:**

```tsx
<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>

<DropdownMenuItem>
  <SettingsIcon />
  Settings
</DropdownMenuItem>
```

---

## Pass icons as component objects, not string keys

Use `icon={CheckIcon}`, not a string key to a lookup map.

**Incorrect:**

```tsx
const iconMap = {
  check: CheckIcon,
  alert: AlertIcon,
}

function StatusBadge({ icon }: { icon: string }) {
  const Icon = iconMap[icon]
  return <Icon />
}

;<StatusBadge icon="check" />
```

**Correct:**

```tsx
// Import from the project's configured iconLibrary (e.g. lucide-react, @tabler/icons-react).
import { CheckIcon } from "lucide-react"

function StatusBadge({ icon: Icon }: { icon: React.ComponentType }) {
  return <Icon />
}

;<StatusBadge icon={CheckIcon} />
```

---

## Brand logos come from `@fabricator-ui/icons/brands`

Lucide has no brand icons. Don't hand-write a logo `<svg>`, draw one with outline icons, or import brand icons from `lucide-react`. Install `@fabricator-ui/icons` and import the mark; `color="brand"` gives the brand's own colours.

**Incorrect:**

```tsx
<Button variant="outline">
  <svg viewBox="0 0 24 24">
    <path d="M12 .297c-6.63 0-12 5.373…" />
  </svg>
  Continue with GitHub
</Button>
```

**Correct:**

```tsx
import { GithubIcon } from "@fabricator-ui/icons/brands"

;<Button variant="outline">
  <GithubIcon data-icon="inline-start" />
  Continue with GitHub
</Button>
```

Slack, Microsoft, AWS, Visual Studio Code and OpenAI aren't in the set: their owners' terms forbid redistributing the logos. Point the user to the brand's own kit instead of drawing one.

---

## Icon names stored in data use `DynamicIcon`

When the icon comes from data (a CMS, a database, a user's choice), render it by name with `DynamicIcon` instead of building a lookup map. It loads each icon on demand and renders `fallback` for unknown names.

**Correct:**

```tsx
import { DynamicIcon } from "@fabricator-ui/icons/dynamic"

<DynamicIcon name={project.icon} fallback={<FolderIcon />} />
<DynamicIcon set="brands" name={integration.slug} />
```

For an icon picker, `searchIcons` from `@fabricator-ui/icons/catalog` searches names, aliases, tags and brand titles.

---

## `@fabricator-ui/icons` is a drop-in for `lucide-react`

The outline icons are Lucide's, under Lucide's names and aliases, with Lucide's props. In a project that uses `@fabricator-ui/icons`, import outline icons from it rather than adding `lucide-react` next to it. Registry components keep importing from `config.iconLibrary`; both render the same glyphs.

---

## Animated icons

`@fabricator-ui/icons/animated` has Lucide icons that play on hover, with the same names and props as the outline icons, on Motion (`motion`, an optional peer). They're web only, and they stay still with reduced motion.

An icon in a button should play when the button is hovered. Pass a `ref`, which takes the icon off its own hover, and pair `startAnimation` with `stopAnimation`:

```tsx
const icon = useRef<AnimatedIconHandle>(null)

<Button
  onMouseEnter={() => icon.current?.startAnimation()}
  onMouseLeave={() => icon.current?.stopAnimation()}
>
  <UploadIcon ref={icon} data-icon="inline-start" />
  Upload
</Button>
```

Use them where motion carries meaning (a copy confirming, a bell ringing), not on every icon in a list.
