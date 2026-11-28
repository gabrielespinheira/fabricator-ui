import type { Ref } from "react"
import { cn } from "cn"
import type { SetValues } from "nuqs"

import { InputSearch } from "@/styles/base-fabricator/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/styles/base-fabricator/ui/select"
import { Slider } from "@/styles/base-fabricator/ui/slider"
import { TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"

import {
  ICON_TAB_LABELS,
  ICON_TABS,
  PREVIEW_SIZES,
  PREVIEW_STROKE,
  type IconQuery,
  type iconQueryParsers,
} from "../lib/icon-query"
import { hasStrokeWidth, type CategoryOption } from "../lib/icons"

const SIZE_ITEMS = PREVIEW_SIZES.map((value) => ({
  value,
  label: `${value} px`,
}))
const BRAND_COLOR_ITEMS = [
  { value: "mono", label: "One colour" },
  { value: "brand", label: "Brand colour" },
] as const
const ALL = "all"

function FilterSelect<Value extends string | number>({
  label,
  caption,
  items,
  value,
  onChange,
  className,
  contentClassName,
}: {
  label: string
  caption?: string
  items: readonly { value: Value; label: string }[]
  value: Value
  onChange: (value: Value) => void
  className?: string
  contentClassName?: string
}) {
  return (
    <Select<Value>
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
    >
      <SelectTrigger
        aria-label={label}
        className={cn(
          "gap-(--density-6) *:data-[slot=select-value]:block",
          className
        )}
      >
        {caption && <span className="text-muted-foreground">{caption}</span>}
        <SelectValue className="min-w-0 truncate tabular-nums" />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className={cn("min-w-28", contentClassName)}
      >
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function IconBrowserToolbar({
  params,
  categories,
  searchInput,
  setParams,
}: {
  params: IconQuery
  categories: CategoryOption[]
  searchInput: Ref<HTMLInputElement>
  setParams: SetValues<typeof iconQueryParsers>
}) {
  const { set, q, category, size, stroke, color } = params
  const categoryItems = [
    {
      value: ALL,
      label: set === "brands" ? "All groups" : "All categories",
    },
    ...categories,
  ]
  const hasStroke = set === "all" || hasStrokeWidth(set)
  const brandColorSelect = (
    <FilterSelect
      label="Brand colour"
      items={BRAND_COLOR_ITEMS}
      value={color}
      onChange={(value) => void setParams({ color: value })}
      contentClassName="min-w-40"
    />
  )

  return (
    <div className="flex flex-col gap-3 bg-background py-2 md:sticky md:top-0 md:z-10 md:pb-3">
      <div className="max-w-full overflow-x-auto p-px">
        <TabsList
          aria-label="Icon set"
          className="min-w-full justify-start sm:min-w-0"
        >
          {ICON_TABS.map((name) => (
            <TabsTrigger
              key={name}
              value={name}
              className="px-1.5 sm:px-(--density-12)"
            >
              {ICON_TAB_LABELS[name]}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <InputSearch
          ref={searchInput}
          className="min-w-0 basis-full md:max-w-md md:flex-[1_1_14rem]"
          value={q}
          onValueChange={(query) =>
            void setParams({ q: query || null, page: null })
          }
          aria-label="Search icons"
          placeholder="Search icons"
        />
        <FilterSelect
          label={set === "brands" ? "Filter by group" : "Filter by category"}
          items={categoryItems}
          value={category ?? ALL}
          onChange={(value) =>
            void setParams({
              category: value === ALL ? null : value,
              page: null,
            })
          }
          className="min-w-28 flex-1 md:w-44 md:flex-none"
          contentClassName="min-w-52"
        />
        {set === "all" && brandColorSelect}
        <div
          className={cn(
            "ms-auto flex max-w-full items-center gap-2",
            hasStroke && "w-full sm:w-auto"
          )}
        >
          <FilterSelect
            label="Preview size"
            caption="Size"
            items={SIZE_ITEMS}
            value={size}
            className="shrink-0"
            onChange={(value) => void setParams({ size: value })}
          />
          {hasStroke && (
            <div className="flex h-(--density-36) min-w-0 flex-1 items-center gap-(--density-10) rounded-(--radius-control) border border-border px-(--density-10) text-(length:--density-text-13) sm:w-52 sm:flex-none">
              <span className="text-muted-foreground">Stroke</span>
              <Slider
                aria-label="Stroke width"
                size="sm"
                {...PREVIEW_STROKE}
                value={[stroke]}
                className="min-w-0 flex-1"
                onValueChange={(value) => {
                  const width = typeof value === "number" ? value : value[0]
                  if (width !== undefined) void setParams({ stroke: width })
                }}
              />
              <span
                aria-hidden="true"
                className="w-8 shrink-0 truncate text-end tabular-nums"
                title={String(stroke)}
              >
                {stroke}
              </span>
            </div>
          )}
          {set === "brands" && brandColorSelect}
        </div>
      </div>
    </div>
  )
}
