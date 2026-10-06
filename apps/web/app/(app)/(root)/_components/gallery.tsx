"use client"

import * as React from "react"
import Link from "next/link"

import { ArrowUpRightIcon } from "@/lib/site-icons"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/styles/base-fabricator/ui/select"

import { CATALOG, type CatalogEntry } from "./catalog"
import {
  CheckboxDemo,
  InputOTPDemo,
  RadioGroupDemo,
  SearchDemo,
  SearchFieldDemo,
  SliderDemo,
  SwitchDemo,
} from "./demos-forms"
import {
  ComboboxDemo,
  CommandDemo,
  DropdownDemo,
  SelectDemo,
} from "./demos-menus"
import {
  AccordionDemo,
  AlertDialogDemo,
  ButtonDemo,
  CalendarDemo,
  ProgressDemo,
  SidebarDemo,
  TableDemo,
  TabsDemo,
  ToastDemo,
  ToggleGroupDemo,
  TooltipDemo,
} from "./demos-other"

const CATEGORIES = [
  "All",
  "Menus",
  "Forms",
  "Navigation",
  "Overlays",
  "Data",
  "Feedback",
  "Chat",
  "Layout",
] as const

type Category = Exclude<(typeof CATEGORIES)[number], "All">

type GalleryItem = {
  /** Component docs slug. */
  slug: string
  title: string
  category: Category
  /** Card height on multi-column layouts. */
  height: "sm" | "md" | "lg"
  isNew?: boolean
} & (
  | { Demo: React.ComponentType; entry?: never }
  | { entry: CatalogEntry; Demo?: never }
)

// Featured order. Columns fill top to bottom, so heights alternate to keep the
// three columns roughly level.
const ITEMS: GalleryItem[] = [
  {
    slug: "dropdown-menu",
    title: "Dropdown Menu",
    category: "Menus",
    height: "sm",
    isNew: true,
    Demo: DropdownDemo,
  },
  {
    slug: "tabs",
    title: "Tabs",
    category: "Navigation",
    height: "sm",
    isNew: true,
    Demo: TabsDemo,
  },
  {
    slug: "switch",
    title: "Switch",
    category: "Forms",
    height: "md",
    Demo: SwitchDemo,
  },
  {
    slug: "slider",
    title: "Slider",
    category: "Forms",
    height: "sm",
    Demo: SliderDemo,
  },
  {
    slug: "toast",
    title: "Toast",
    category: "Feedback",
    height: "sm",
    Demo: ToastDemo,
  },
  {
    slug: "command",
    title: "Command",
    category: "Menus",
    height: "lg",
    isNew: true,
    Demo: CommandDemo,
  },
  {
    slug: "sidebar",
    title: "Sidebar",
    category: "Navigation",
    height: "lg",
    isNew: true,
    Demo: SidebarDemo,
  },
  {
    slug: "radio-group",
    title: "Radio Group",
    category: "Forms",
    height: "md",
    Demo: RadioGroupDemo,
  },
  {
    slug: "toggle-group",
    title: "Toggle Group",
    category: "Navigation",
    height: "md",
    isNew: true,
    Demo: ToggleGroupDemo,
  },
  {
    slug: "select",
    title: "Select",
    category: "Menus",
    height: "sm",
    isNew: true,
    Demo: SelectDemo,
  },
  {
    slug: "table",
    title: "Table",
    category: "Data",
    height: "md",
    isNew: true,
    Demo: TableDemo,
  },
  {
    slug: "input-otp",
    title: "Input OTP",
    category: "Forms",
    height: "sm",
    Demo: InputOTPDemo,
  },
  {
    slug: "calendar",
    title: "Calendar",
    category: "Data",
    height: "lg",
    Demo: CalendarDemo,
  },
  {
    slug: "checkbox",
    title: "Checkbox",
    category: "Forms",
    height: "md",
    Demo: CheckboxDemo,
  },
  {
    slug: "tooltip",
    title: "Tooltip",
    category: "Overlays",
    height: "sm",
    Demo: TooltipDemo,
  },
  {
    slug: "accordion",
    title: "Accordion",
    category: "Navigation",
    height: "md",
    isNew: true,
    Demo: AccordionDemo,
  },
  {
    slug: "combobox",
    title: "Combobox",
    category: "Menus",
    height: "sm",
    isNew: true,
    Demo: ComboboxDemo,
  },
  {
    slug: "progress",
    title: "Progress",
    category: "Feedback",
    height: "sm",
    Demo: ProgressDemo,
  },
  {
    slug: "alert-dialog",
    title: "Alert Dialog",
    category: "Overlays",
    height: "sm",
    Demo: AlertDialogDemo,
  },
  {
    slug: "search",
    title: "Search",
    category: "Forms",
    height: "sm",
    isNew: true,
    Demo: SearchFieldDemo,
  },
  {
    slug: "input-group",
    title: "Input Group",
    category: "Forms",
    height: "sm",
    Demo: SearchDemo,
  },
  {
    slug: "button",
    title: "Button",
    category: "Feedback",
    height: "md",
    Demo: ButtonDemo,
  },
]

// Curated demos first, then every other component with its docs demo.
const ALL_ITEMS: GalleryItem[] = [
  ...ITEMS,
  ...CATALOG.map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    category: entry.category,
    height: entry.height,
    entry,
  })),
]

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "name", label: "A–Z" },
]

const HEIGHTS = {
  sm: "md:h-[300px]",
  md: "md:h-[360px]",
  lg: "md:h-[420px]",
}

const HEIGHT_PX = { sm: 300, md: 360, lg: 420 }

// Each card goes to the shortest column, so the columns end level.
function balance(items: GalleryItem[], count: number) {
  const columns: GalleryItem[][] = Array.from({ length: count }, () => [])
  const heights = new Array<number>(count).fill(0)
  for (const item of items) {
    const shortest = heights.indexOf(Math.min(...heights))
    columns[shortest].push(item)
    heights[shortest] += HEIGHT_PX[item.height]
  }
  return columns
}

export function Gallery() {
  const [category, setCategory] =
    React.useState<(typeof CATEGORIES)[number]>("All")
  const [sort, setSort] = React.useState("featured")

  const items = React.useMemo(() => {
    const filtered = ALL_ITEMS.filter(
      (item) => category === "All" || item.category === category
    )
    return sort === "name"
      ? [...filtered].sort((a, b) => a.title.localeCompare(b.title))
      : filtered
  }, [category, sort])

  const columns = React.useMemo(() => balance(items, 3), [items])

  return (
    <section
      aria-label="Components"
      className="flex flex-col gap-5 px-4 pb-20 sm:px-5"
    >
      <div className="flex items-center gap-3">
        <div
          role="group"
          aria-label="Filter by category"
          className="-mx-4 scrollbar-hide flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
              className={cn(
                "h-9 shrink-0 rounded-full bg-foreground/[0.06] px-3.5 text-[15px] font-medium text-foreground/75 transition-[background-color,color,scale] duration-moderate ease-spring outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus-ring active:scale-[0.97] motion-reduce:transition-none",
                "aria-pressed:bg-foreground aria-pressed:text-background"
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <Select
          items={SORTS}
          value={sort}
          onValueChange={(value) => value && setSort(value as string)}
        >
          <SelectTrigger
            aria-label="Sort components"
            className="hidden h-9! shrink-0 rounded-full px-4 text-[15px] sm:flex"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {SORTS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {/* Three balanced flex columns on wide screens. Below xl the columns
          dissolve (display: contents) and CSS columns lay the cards out. */}
      <div className="columns-1 gap-3 md:columns-2 xl:flex xl:items-stretch xl:gap-3">
        {columns.map((column, index) => (
          <div
            key={index}
            className="contents xl:flex xl:min-w-0 xl:flex-1 xl:flex-col xl:gap-3"
          >
            {column.map((item) => (
              <GalleryCard key={item.slug} item={item} />
            ))}
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nothing in this category yet.
        </p>
      )}
    </section>
  )
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const href = `/docs/components/base/${item.slug}`

  return (
    <article
      className={cn(
        "group/card relative mb-3 flex min-h-[280px] break-inside-avoid items-center-safe justify-center overflow-hidden rounded-[28px] bg-surface-3 px-6 pt-16 pb-12 shadow-surface-1 md:py-12 xl:mb-0 dark:bg-surface-2 dark:shadow-none",
        HEIGHTS[item.height],
        // In the three-column layout, cards in shorter columns share the
        // spare height (a few pixels each), so all columns end level.
        "xl:h-auto xl:min-h-(--card-height) xl:grow"
      )}
      style={
        {
          "--card-height": `${HEIGHT_PX[item.height]}px`,
        } as React.CSSProperties
      }
    >
      <Link
        href={href}
        className="absolute top-4 left-4 z-10 inline-flex h-6 items-center gap-1 rounded-lg bg-foreground/[0.07] px-2 text-xs font-medium text-foreground/80 transition-colors duration-fast outline-none hover:bg-foreground/[0.12] hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {item.isNew && (
          <span aria-hidden className="size-1.5 rounded-full bg-info" />
        )}
        {item.title}
        {item.isNew && <span className="sr-only">(new)</span>}
      </Link>
      <Link
        href={href}
        aria-label={`${item.title} docs`}
        className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full bg-foreground/[0.07] text-foreground/70 opacity-0 transition-[opacity,background-color] duration-moderate ease-spring outline-none group-focus-within/card:opacity-100 group-hover/card:opacity-100 hover:bg-foreground/[0.12] hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <ArrowUpRightIcon className="size-4" />
      </Link>
      <div
        className="flex w-full max-w-full min-w-0 items-center justify-center"
        style={item.entry?.zoom ? { zoom: item.entry.zoom } : undefined}
      >
        {item.Demo ? <item.Demo /> : <LazyDemo entry={item.entry} />}
      </div>
      {/* Tall demos start at the top and fade out at the bottom edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-surface-3 to-transparent dark:from-surface-2"
      />
    </article>
  )
}

/**
 * Mounts a catalog demo once its card comes near the viewport, so the page
 * downloads each demo's code only when it is about to be seen.
 */
function LazyDemo({ entry }: { entry: CatalogEntry }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([observed]) => {
        if (observed?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px 0px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { Demo } = entry
  const placeholder = (
    <div
      aria-hidden
      className="h-24 w-full max-w-64 animate-pulse rounded-xl bg-foreground/[0.04]"
    />
  )

  return (
    <div
      ref={ref}
      className="flex w-full max-w-full min-w-0 items-center justify-center"
    >
      {visible ? (
        <DemoBoundary fallback={placeholder}>
          <React.Suspense fallback={placeholder}>
            <Demo />
          </React.Suspense>
        </DemoBoundary>
      ) : (
        placeholder
      )}
    </div>
  )
}

/** Keeps one failing demo from taking the whole gallery down. */
class DemoBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
