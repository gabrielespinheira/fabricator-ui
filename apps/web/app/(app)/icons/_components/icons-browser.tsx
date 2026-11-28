"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import type * as Nodes from "@fabricator-ui/icons-static/nodes"
import type * as Variants from "@fabricator-ui/icons-static/variants"
import type * as Catalog from "@fabricator-ui/icons/catalog"
import { cn } from "cn"
import { useQueryStates } from "nuqs"

import { Button } from "@/styles/base-fabricator/ui/button"
import { Drawer, DrawerContent } from "@/styles/base-fabricator/ui/drawer"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/styles/base-fabricator/ui/empty"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/styles/base-fabricator/ui/pagination"
import { Spinner } from "@/styles/base-fabricator/ui/spinner"
import { Tabs, TabsContent } from "@/styles/base-fabricator/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/styles/base-fabricator/ui/tooltip"

import {
  DEFAULT_STROKE_WIDTH,
  getPreviewSet,
  ICON_TAB_LABELS,
  ICON_TABS,
  iconQueryParsers,
} from "../lib/icon-query"
import {
  filterByCategory,
  getCategoryOptions,
  hasStrokeWidth,
  toReactAttributes,
} from "../lib/icons"
import {
  AnimatedIconView,
  useAnimatedRenderer,
  type AnimatedRenderer,
} from "./animated-icon-view"
import { IconBrowserToolbar } from "./icon-browser-toolbar"
import { IconDetail } from "./icon-detail"
import {
  IconPreview,
  type LoadedIcon,
  type PreviewOptions,
} from "./icon-preview"

type Library = {
  catalog: typeof Catalog
  icons: Map<string, LoadedIcon>
  categoryTitles: Map<string, string>
}

const ALL_PAGE_SIZE = 120

function key(set: string, name: string) {
  return `${set}:${name}`
}

class MissingShapesError extends Error {
  override name = "MissingShapesError"
}

/** Joins the catalog with the shape data, once, for the grid and the detail panel. */
function joinLibrary(
  catalog: typeof Catalog,
  nodes: typeof Nodes,
  variants: typeof Variants
): Library {
  const icons = new Map<string, LoadedIcon>()
  for (const entry of catalog.outlineCatalog) {
    const node = nodes.outlineNodes[entry.name]
    const opticalScale = nodes.outlineScales[entry.name]
    if (!node)
      throw new MissingShapesError(`No shapes for the ${entry.name} icon`)
    icons.set(key("outline", entry.name), {
      set: "outline",
      entry,
      data: { name: entry.name, node: toReactAttributes(node), opticalScale },
      source: { set: "outline", node, opticalScale },
    })
  }
  for (const [entries, drawings] of [
    [catalog.fillCatalog, variants.fillNodes],
    [catalog.duotoneCatalog, variants.duotoneNodes],
  ] as const) {
    for (const entry of entries) {
      const data = drawings[entry.name]
      if (!data)
        throw new MissingShapesError(`No ${entry.set} shapes for ${entry.name}`)
      icons.set(key(entry.set, entry.name), {
        set: entry.set,
        entry,
        source: { set: entry.set, data },
        data: {
          ...data,
          node: toReactAttributes(data.node),
          ...(data.cutout && { cutout: toReactAttributes(data.cutout) }),
          ...(data.secondary && {
            secondary: toReactAttributes(data.secondary),
          }),
        },
      })
    }
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
    const opticalScale = nodes.outlineScales[entry.name]
    if (!node)
      throw new MissingShapesError(`No shapes for the ${entry.name} icon`)
    icons.set(key("animated", entry.name), {
      set: "animated",
      entry,
      data: { name: entry.name, node: toReactAttributes(node), opticalScale },
      source: { set: "outline", node, opticalScale },
    })
  }
  const categoryTitles = new Map(
    catalog.outlineCategories.map((category) => [category.name, category.title])
  )
  for (const entry of catalog.fileCatalog) {
    const data = nodes.fileNodes[entry.name]
    if (!data) throw new MissingShapesError(`No shapes for ${entry.name}`)
    icons.set(key("files", entry.name), {
      set: "files",
      entry,
      data: {
        ...data,
        node: toReactAttributes(data.node),
        ...(data.masks && {
          masks: data.masks.map((mask) => ({
            ...mask,
            attributes: Object.fromEntries(
              Object.entries(mask.attributes).map(([key, value]) => [
                key.replace(/-([a-z])/g, (_, letter: string) =>
                  letter.toUpperCase()
                ),
                value,
              ])
            ),
            node: toReactAttributes(mask.node),
          })),
        }),
      },
      source: { set: "files", data, palette: nodes.filePalette },
    })
  }
  categoryTitles.set("files", "Files")
  categoryTitles.set("folders", "Folders")
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
      import("@fabricator-ui/icons-static/variants"),
    ]).then(([catalog, nodes, variants]) => {
      if (isCurrent) setLibrary(joinLibrary(catalog, nodes, variants))
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
  showSet,
  onSelect,
  onAnimate,
  animated,
  tooltip,
}: {
  icon: LoadedIcon
  options: PreviewOptions
  showSet: boolean
  onSelect: (entry: LoadedIcon["entry"], trigger: HTMLButtonElement) => void
  onAnimate: () => void
  /** Empty until the animated icons load; the outline drawing stands in. */
  animated?: AnimatedRenderer | null
  tooltip: ReturnType<typeof TooltipPrimitive.createHandle>
}) {
  const [preview, setPreview] = React.useState<"idle" | "playing" | "played">(
    "idle"
  )
  const name = icon.set === "brands" ? icon.entry.title : icon.entry.name
  const label = showSet ? `${name}, ${ICON_TAB_LABELS[icon.set]}` : name
  const recipe = icon.set === "animated" ? icon.entry.motion : undefined
  const animationEvents = recipe
    ? {
        onPointerEnter(event: React.PointerEvent) {
          if (event.pointerType === "mouse") {
            onAnimate()
            setPreview("playing")
          }
        },
        onPointerLeave(event: React.PointerEvent) {
          if (!event.currentTarget.matches(":focus-visible"))
            setPreview((state) => (state === "playing" ? "played" : state))
        },
        onFocus(event: React.FocusEvent) {
          if (event.currentTarget.matches(":focus-visible")) {
            onAnimate()
            setPreview("playing")
          }
        },
        onBlur(event: React.FocusEvent) {
          if (!event.currentTarget.matches(":hover"))
            setPreview((state) => (state === "playing" ? "played" : state))
        },
      }
    : undefined
  return (
    <li
      data-icon-stroke={hasStrokeWidth(icon.set) ? "" : undefined}
      className="rounded-(--radius-surface) bg-surface-2 shadow-surface-2 transition-colors duration-feedback [contain-intrinsic-size:auto_var(--icon-tile-height)] [content-visibility:auto] hover:bg-surface-3 active:bg-active"
    >
      <TooltipTrigger
        handle={tooltip}
        payload={label}
        type="button"
        aria-haspopup="dialog"
        aria-label={label}
        onClick={(event) => onSelect(icon.entry, event.currentTarget)}
        className="grid h-(--icon-tile-height) w-full cursor-pointer place-items-center rounded-(--radius-surface) text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
        {...animationEvents}
      >
        <span aria-hidden="true" className="pointer-events-none">
          {preview !== "idle" &&
          animated &&
          recipe &&
          icon.set === "animated" ? (
            <AnimatedIconView
              component={animated}
              data={icon.data}
              recipe={recipe}
              isPlaying={preview === "playing"}
              size={options.size}
              strokeWidth={options.strokeWidth}
            />
          ) : (
            <IconPreview icon={icon} {...options} />
          )}
        </span>
      </TooltipTrigger>
    </li>
  )
})

/** The icon gallery: search, filters, a grid of every icon, and a detail panel. */
export function IconsBrowser() {
  const library = useLibrary()
  const [params, setParams] = useQueryStates(iconQueryParsers)
  const catalogSet = params.set === "all" ? undefined : params.set
  const [tooltip] = React.useState(() => TooltipPrimitive.createHandle())
  const searchInput = React.useRef<HTMLInputElement>(null)
  const selectedTrigger = React.useRef<HTMLButtonElement>(null)
  const search = params.q.trim()
  const gridOptions = React.useMemo<PreviewOptions>(
    () => ({
      size: params.size,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      brandColor: params.color === "brand",
    }),
    [params.size, params.color]
  )

  const results = React.useMemo(() => {
    if (!library) return []
    const matches = library.catalog.searchIcons(params.q, { set: catalogSet })
    return filterByCategory(matches, params.category).flatMap((entry) => {
      const icon = library.icons.get(key(entry.set, entry.name))
      return icon ? [icon] : []
    })
  }, [library, params.q, catalogSet, params.category])

  const pageCount = catalogSet
    ? 1
    : Math.max(1, Math.ceil(results.length / ALL_PAGE_SIZE))
  const page = Math.min(Math.max(1, params.page), pageCount)

  const categories = React.useMemo(
    () =>
      library
        ? getCategoryOptions(
            library.catalog.catalog,
            library.catalog.outlineCategories,
            catalogSet
          )
        : [],
    [library, catalogSet]
  )

  const selected =
    library && params.icon
      ? library.icons.get(key(getPreviewSet(params), params.icon))
      : undefined
  const [isAnimationRequested, setAnimationRequested] = React.useState(false)
  const animated = useAnimatedRenderer(
    params.set === "animated" ||
      selected?.set === "animated" ||
      isAnimationRequested
  )
  const requestAnimation = React.useCallback(
    () => setAnimationRequested(true),
    []
  )
  const [lastSelected, setLastSelected] = React.useState<LoadedIcon>()
  // Keep the content measured until the drawer's exit animation completes.
  if (selected && selected !== lastSelected) setLastSelected(selected)
  const detail = selected ?? lastSelected

  const select = React.useCallback(
    (entry: LoadedIcon["entry"], trigger: HTMLButtonElement) => {
      selectedTrigger.current = trigger
      void setParams({
        icon: entry.name,
        iconSet: catalogSet ? null : entry.set,
      })
    },
    [catalogSet, setParams]
  )
  const cells = React.useMemo(() => {
    const start = (page - 1) * ALL_PAGE_SIZE
    const visible = catalogSet
      ? results
      : results.slice(start, start + ALL_PAGE_SIZE)
    return visible.map((icon) => (
      <IconCell
        key={key(icon.set, icon.entry.name)}
        icon={icon}
        options={gridOptions}
        showSet={catalogSet === undefined}
        onSelect={select}
        onAnimate={requestAnimation}
        animated={icon.set === "animated" ? animated : undefined}
        tooltip={tooltip}
      />
    ))
  }, [
    results,
    page,
    gridOptions,
    catalogSet,
    select,
    requestAnimation,
    animated,
    tooltip,
  ])
  // The slider repaints the full grid through one inherited value.
  const gridStyle: React.CSSProperties & { "--icon-grid-stroke": number } = {
    "--icon-grid-stroke": params.stroke,
  }

  return (
    <Tabs
      render={<section aria-label="Icons" />}
      value={params.set}
      onValueChange={(next) => {
        const set = ICON_TABS.find((candidate) => candidate === next)
        if (set)
          void setParams({
            set,
            category: null,
            icon: null,
            iconSet: null,
            page: null,
          })
      }}
      className="min-w-0 gap-4"
    >
      <IconBrowserToolbar
        params={params}
        categories={categories}
        searchInput={searchInput}
        setParams={setParams}
      />

      {/* The tiles are the tab stops here, so the panel isn't one itself. */}
      <TabsContent
        value={params.set}
        tabIndex={-1}
        className="flex flex-col gap-3"
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
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyTitle>No icons found</EmptyTitle>
              <EmptyDescription className="[overflow-wrap:anywhere]">
                {search
                  ? `No results for “${search}”.`
                  : "No icons match the selected filter."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => {
                  void setParams({ q: null, category: null, page: null })
                  searchInput.current?.focus()
                }}
              >
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                className="text-[13px] text-muted-foreground tabular-nums"
                aria-live="polite"
              >
                {results.length.toLocaleString("en")}{" "}
                {results.length === 1 ? "icon" : "icons"}
              </p>
              {pageCount > 1 && (
                <Pagination
                  aria-label="Icon results pages"
                  className="mx-0 w-auto"
                >
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => void setParams({ page: page - 1 })}
                      >
                        Previous
                      </Button>
                    </PaginationItem>
                    <PaginationItem className="text-[13px] text-muted-foreground tabular-nums">
                      <span aria-live="polite">
                        Page {page} of {pageCount}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === pageCount}
                        onClick={() => void setParams({ page: page + 1 })}
                      >
                        Next
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
            <ul
              style={gridStyle}
              className={cn(
                "grid gap-2 [&_[data-icon-stroke]_svg]:[stroke-width:var(--icon-grid-stroke)]",
                params.size >= 32
                  ? "grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] [--icon-tile-height:6rem]"
                  : "grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] [--icon-tile-height:4.75rem]"
              )}
            >
              {cells}
            </ul>
            <Tooltip handle={tooltip} disabled={selected !== undefined}>
              {({ payload }) =>
                typeof payload === "string" && (
                  <TooltipContent className="[overflow-wrap:anywhere]">
                    {payload}
                  </TooltipContent>
                )
              }
            </Tooltip>
          </>
        )}
      </TabsContent>

      <Drawer
        showSwipeHandle
        open={selected !== undefined}
        onOpenChange={(open) => {
          if (!open) void setParams({ icon: null, iconSet: null })
        }}
        onOpenChangeComplete={(open) => {
          if (!open) setLastSelected(undefined)
        }}
      >
        <DrawerContent
          className="data-[swipe-axis=y]:max-h-[calc(100dvh-2rem)] md:data-[swipe-axis=y]:max-w-[52rem]"
          finalFocus={() =>
            selectedTrigger.current?.isConnected
              ? selectedTrigger.current
              : searchInput.current
          }
        >
          {detail && library && (
            <IconDetail
              key={key(detail.set, detail.entry.name)}
              icon={detail}
              options={{ ...gridOptions, strokeWidth: params.stroke }}
              categoryTitles={library.categoryTitles}
              animated={animated}
            />
          )}
        </DrawerContent>
      </Drawer>
    </Tabs>
  )
}
