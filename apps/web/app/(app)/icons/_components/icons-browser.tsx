"use client"

import * as React from "react"
import type * as Nodes from "@fabricator-ui/icons-static/nodes"
import type * as Catalog from "@fabricator-ui/icons/catalog"
import {
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/styles/base-fabricator/ui/empty"
import { Search } from "@/styles/base-fabricator/ui/search"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/styles/base-fabricator/ui/select"
import { Sheet, SheetContent } from "@/styles/base-fabricator/ui/sheet"
import { Spinner } from "@/styles/base-fabricator/ui/spinner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/base-fabricator/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

import {
  filterByCategory,
  getCategoryOptions,
  toComponentName,
  toReactAttributes,
} from "../lib/icons"
import {
  AnimatedIconView,
  useAnimatedComponents,
  type AnimatedComponents,
} from "./animated-icon-view"
import { IconDetail } from "./icon-detail"
import {
  IconPreview,
  type LoadedIcon,
  type PreviewOptions,
} from "./icon-preview"

const SETS = ["outline", "brands", "animated"] as const
const SIZES = [16, 20, 24] as const
const STROKES = [1.5, 2] as const
const COLORS = ["mono", "brand"] as const
const ALL = "all"
// The three tabs and their counts need 332px: under that, the labels alone fit.
const TAB_COUNT_CLASS = "tabular-nums max-[359px]:hidden"

const iconParsers = {
  q: parseAsString.withDefault(""),
  set: parseAsStringLiteral(SETS).withDefault("outline"),
  category: parseAsString,
  icon: parseAsString,
  size: parseAsNumberLiteral(SIZES).withDefault(24),
  stroke: parseAsNumberLiteral(STROKES).withDefault(2),
  color: parseAsStringLiteral(COLORS).withDefault("mono"),
}

type Library = {
  catalog: typeof Catalog
  icons: Map<string, LoadedIcon>
  categoryTitles: Map<string, string>
}

function key(set: string, name: string) {
  return `${set}:${name}`
}

class MissingShapesError extends Error {
  override name = "MissingShapesError"
}

/** Joins the catalog with the shape data, once, for the grid and the detail panel. */
function joinLibrary(catalog: typeof Catalog, nodes: typeof Nodes): Library {
  const icons = new Map<string, LoadedIcon>()
  for (const entry of catalog.outlineCatalog) {
    const node = nodes.outlineNodes[entry.name]
    if (!node)
      throw new MissingShapesError(`No shapes for the ${entry.name} icon`)
    icons.set(key("outline", entry.name), {
      set: "outline",
      entry,
      data: { name: entry.name, node: toReactAttributes(node) },
      source: { set: "outline", node },
    })
  }
  for (const entry of catalog.brandCatalog) {
    const brand = nodes.brandNodes[entry.name]
    if (!brand)
      throw new MissingShapesError(`No shapes for the ${entry.name} mark`)
    icons.set(key("brands", entry.name), {
      set: "brands",
      entry,
      data: {
        name: entry.name,
        ...brand,
        node: toReactAttributes(brand.node),
        ...(brand.art && {
          art: { ...brand.art, node: toReactAttributes(brand.art.node) },
        }),
      },
      source: { set: "brands", name: entry.name, data: brand },
    })
  }
  for (const entry of catalog.animatedCatalog) {
    const node = nodes.outlineNodes[entry.name]
    if (!node)
      throw new MissingShapesError(`No shapes for the ${entry.name} icon`)
    icons.set(key("animated", entry.name), {
      set: "animated",
      entry,
      data: { name: entry.name, node: toReactAttributes(node) },
      source: { set: "outline", node },
    })
  }
  const categoryTitles = new Map(
    catalog.outlineCategories.map((category) => [category.name, category.title])
  )
  return { catalog, icons, categoryTitles }
}

/** The catalog and the shape data load on this page only, in their own chunks. */
function useLibrary() {
  const [library, setLibrary] = React.useState<Library | null>(null)
  React.useEffect(() => {
    let isCurrent = true
    void Promise.all([
      import("@fabricator-ui/icons/catalog"),
      import("@fabricator-ui/icons-static/nodes"),
    ]).then(([catalog, nodes]) => {
      if (isCurrent) setLibrary(joinLibrary(catalog, nodes))
    })
    return () => {
      isCurrent = false
    }
  }, [])
  return library
}

const IconCell = React.memo(function IconCell({
  icon,
  options,
  onSelect,
  animated,
}: {
  icon: LoadedIcon
  options: PreviewOptions
  onSelect: (name: string) => void
  /** Empty until the animated icons load; the outline drawing stands in. */
  animated?: AnimatedComponents | null
}) {
  const [isActive, setIsActive] = React.useState(false)
  const label = icon.set === "brands" ? icon.entry.title : icon.entry.name
  const moving =
    icon.set === "animated"
      ? animated?.get(toComponentName(icon.entry.name))
      : undefined
  return (
    <li className="[contain-intrinsic-size:auto_96px] [content-visibility:auto]">
      <button
        type="button"
        onClick={() => onSelect(icon.entry.name)}
        onMouseEnter={() => setIsActive(true)}
        onMouseLeave={() => setIsActive(false)}
        onFocus={() => setIsActive(true)}
        onBlur={() => setIsActive(false)}
        className="flex h-24 w-full flex-col items-center justify-center gap-2.5 rounded-xl px-1 text-foreground outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-focus-ring active:bg-active"
      >
        {moving ? (
          <AnimatedIconView
            component={moving}
            isPlaying={isActive}
            size={options.size}
            strokeWidth={options.strokeWidth}
          />
        ) : (
          <IconPreview icon={icon} {...options} />
        )}
        <span className="w-full truncate text-center text-[11px] text-muted-foreground">
          {label}
        </span>
      </button>
    </li>
  )
})

function NumberToggle<Value extends number>({
  label,
  values,
  value,
  onValueChange,
  format,
}: {
  label: string
  values: readonly Value[]
  value: Value
  onValueChange: (value: Value) => void
  format: (value: Value) => string
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[String(value)]}
      onValueChange={(next) => {
        const selected = values.find(
          (candidate) => String(candidate) === next[0]
        )
        if (selected !== undefined) onValueChange(selected)
      }}
      spacing={0.5}
      size="sm"
      className="rounded-lg p-0.5 [&_[data-slot^=fluid-hover]]:rounded-md"
    >
      {values.map((candidate) => (
        <ToggleGroupItem
          key={candidate}
          value={String(candidate)}
          className="h-7 rounded-md! px-2.5 text-[12px] text-muted-foreground tabular-nums aria-pressed:text-foreground"
        >
          {format(candidate)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** The icon gallery: search, filters, a grid of every icon, and a detail panel. */
export function IconsBrowser() {
  const library = useLibrary()
  const [params, setParams] = useQueryStates(iconParsers)
  const animated = useAnimatedComponents(params.set === "animated")
  const options: PreviewOptions = {
    size: params.size,
    strokeWidth: params.stroke,
    brandColor: params.color === "brand",
  }

  const results = React.useMemo(() => {
    if (!library) return []
    const matches = library.catalog.searchIcons(params.q, { set: params.set })
    return filterByCategory(matches, params.category).flatMap((entry) => {
      const icon = library.icons.get(key(entry.set, entry.name))
      return icon ? [icon] : []
    })
  }, [library, params.q, params.set, params.category])

  const categories = React.useMemo(
    () =>
      library
        ? getCategoryOptions(
            library.catalog.catalog,
            library.catalog.outlineCategories,
            params.set
          )
        : [],
    [library, params.set]
  )

  const selected =
    library && params.icon
      ? library.icons.get(key(params.set, params.icon))
      : undefined

  const select = React.useCallback(
    (name: string) => void setParams({ icon: name }),
    [setParams]
  )

  const counts = library
    ? {
        outline: library.catalog.outlineCatalog.length,
        brands: library.catalog.brandCatalog.length,
        animated: library.catalog.animatedCatalog.length,
      }
    : undefined
  const categoryItems = [
    {
      value: ALL,
      label: params.set === "brands" ? "All groups" : "All categories",
    },
    ...categories.map((category) => ({
      value: category.value,
      label: category.label,
    })),
  ]

  return (
    <Tabs
      render={<section aria-label="Icons" />}
      value={params.set}
      onValueChange={(next) => {
        const set = SETS.find((candidate) => candidate === next)
        if (set) void setParams({ set, category: null, icon: null })
      }}
      className="gap-4 px-4 pb-4 sm:px-5"
    >
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <Search
          collapsible={false}
          value={params.q}
          onValueChange={(q) => void setParams({ q: q || null })}
          label="Search icons"
          placeholder={
            counts
              ? `Search ${(counts.outline + counts.brands).toLocaleString("en")} icons`
              : "Search icons"
          }
          width="100%"
          rootProps={{ className: "min-w-0 flex-1 basis-60 sm:max-w-sm" }}
        />
        <TabsList
          // The sliding selection measures its items once: remount it when
          // the counts arrive and widen them.
          key={counts ? "counted" : "loading"}
          aria-label="Icon set"
        >
          <TabsTrigger value="outline">
            Outline
            {counts && (
              <span className={TAB_COUNT_CLASS}>
                {counts.outline.toLocaleString("en")}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="brands">
            Brands
            {counts && <span className={TAB_COUNT_CLASS}>{counts.brands}</span>}
          </TabsTrigger>
          <TabsTrigger value="animated">
            Animated
            {counts && (
              <span className={TAB_COUNT_CLASS}>{counts.animated}</span>
            )}
          </TabsTrigger>
        </TabsList>
        <Select
          items={categoryItems}
          value={params.category ?? ALL}
          onValueChange={(value) => {
            if (typeof value !== "string") return
            void setParams({ category: value === ALL ? null : value })
          }}
        >
          <SelectTrigger aria-label="Filter by category" className="min-w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
          <NumberToggle
            label="Preview size"
            values={SIZES}
            value={params.size}
            onValueChange={(size) => void setParams({ size })}
            format={(size) => `${size}px`}
          />
          {params.set !== "brands" ? (
            <NumberToggle
              label="Stroke width"
              values={STROKES}
              value={params.stroke}
              onValueChange={(stroke) => void setParams({ stroke })}
              format={(stroke) => `${stroke}`}
            />
          ) : (
            <ToggleGroup
              aria-label="Brand colours"
              value={[params.color]}
              onValueChange={(next) => {
                const color = COLORS.find((candidate) => candidate === next[0])
                if (color) void setParams({ color })
              }}
              spacing={0.5}
              size="sm"
              className="rounded-lg p-0.5 [&_[data-slot^=fluid-hover]]:rounded-md"
            >
              <ToggleGroupItem
                value="mono"
                className="h-7 rounded-md! px-2.5 text-[12px] text-muted-foreground aria-pressed:text-foreground"
              >
                One colour
              </ToggleGroupItem>
              <ToggleGroupItem
                value="brand"
                className="h-7 rounded-md! px-2.5 text-[12px] text-muted-foreground aria-pressed:text-foreground"
              >
                Brand colour
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </div>

      {/* The tiles are the tab stops here, so the panel isn't one itself. */}
      <TabsContent
        value={params.set}
        tabIndex={-1}
        className="flex flex-col gap-4"
      >
        {!library ? (
          <div
            className="flex justify-center py-24 text-muted-foreground"
            role="status"
          >
            <Spinner />
            <span className="sr-only">Loading icons</span>
          </div>
        ) : results.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No icons match “{params.q}”</EmptyTitle>
              <EmptyDescription>
                Try another word, or search the other set.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <p className="text-[13px] text-muted-foreground" aria-live="polite">
              {results.length.toLocaleString("en")}{" "}
              {results.length === 1 ? "icon" : "icons"}
            </p>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1">
              {results.map((icon) => (
                <IconCell
                  key={key(icon.set, icon.entry.name)}
                  icon={icon}
                  options={options}
                  onSelect={select}
                  animated={icon.set === "animated" ? animated : undefined}
                />
              ))}
            </ul>
          </>
        )}
      </TabsContent>

      <Sheet
        open={selected !== undefined}
        onOpenChange={(open) => {
          if (!open) void setParams({ icon: null })
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selected && library && (
            <IconDetail
              icon={selected}
              options={options}
              categoryTitles={library.categoryTitles}
              animated={animated}
            />
          )}
        </SheetContent>
      </Sheet>
    </Tabs>
  )
}
