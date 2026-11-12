"use client"

import * as React from "react"
import { cn } from "cn"

import {
  getPreviewRailIndexAtPoint,
  getPreviewRailLit,
  getPreviewRailTickScale,
  getPreviewRailValue,
  isPreviewRailDisabledAt,
  isPreviewRailReleaseInside,
} from "@/registry/bases/__base__/lib/preview-rail-model"

// A rail of thin ticks, one per section. The ticks swell around the one the
// pointer is on, like a dock, and a card beside the rail names that section.
// With nothing pointed at, the swell rests on the current section. A finger
// scrubs: a press lights the tick under it, a drag along the rail moves the
// light, and lifting on the rail follows the lit tick.

/** How far past the rail, in px, a lifted finger still counts as on it. */
const RELEASE_SLACK = 24

type PreviewRailItem = {
  value: string
  label: string
  /** Shown on the card under the label, and read as the tick's description. */
  description?: React.ReactNode
  /** Makes the tick a link. Without it the tick is a button. */
  href?: string
  target?: React.HTMLAttributeAnchorTarget
  rel?: string
  disabled?: boolean
}

type PreviewRailProps = Omit<
  React.ComponentProps<"nav">,
  "children" | "defaultValue" | "onChange"
> & {
  items: PreviewRailItem[]
  orientation?: "vertical" | "horizontal"
  /** Where the card sits: after a vertical rail, above a horizontal one. */
  side?: "start" | "end"
  /** The current item. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** The card's content. Defaults to the item's label and description. */
  renderPreview?: (item: PreviewRailItem) => React.ReactNode
}

// The side the card opens on, as popups name it, so it grows from the rail.
function getCardSide(
  orientation: PreviewRailProps["orientation"],
  side: NonNullable<PreviewRailProps["side"]>
) {
  if (orientation === "horizontal") return side === "start" ? "top" : "bottom"
  return side === "start" ? "left" : "right"
}

function PreviewRail({
  items,
  orientation = "vertical",
  side = orientation === "horizontal" ? "start" : "end",
  value: valueProp,
  defaultValue,
  onValueChange,
  renderPreview,
  className,
  onKeyDown,
  onBlur,
  "aria-label": ariaLabel = "Section navigation",
  ...props
}: PreviewRailProps) {
  const id = React.useId()
  const isHorizontal = orientation === "horizontal"
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const [pressed, setPressed] = React.useState<string | null>(null)
  const [hovered, setHovered] = React.useState<string | null>(null)
  const [focused, setFocused] = React.useState<string | null>(null)
  const [dismissed, setDismissed] = React.useState<string | null>(null)
  const [shown, setShown] = React.useState<string | null>(null)
  const layerRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<(HTMLElement | null)[]>([])
  const wasOpenRef = React.useRef(false)
  // The click a finger's lift sends on its own, after the rail has already
  // followed the lit tick.
  const isSwallowingClickRef = React.useRef(false)

  const value = getPreviewRailValue(items, valueProp ?? uncontrolledValue)
  const { litIndex, preview } = getPreviewRailLit(
    items,
    { pressed, hovered, focused },
    value
  )
  const isOpen = preview !== null && preview !== dismissed
  if (isOpen && preview !== shown) setShown(preview)
  const shownIndex = items.findIndex((item) => item.value === shown)
  const shownItem = items[shownIndex]
  const cardSide = getCardSide(orientation, side)

  // A card that opens appears at its tick; only a card already showing
  // glides from tick to tick.
  React.useLayoutEffect(() => {
    const layer = layerRef.current
    if (isOpen && !wasOpenRef.current && layer) {
      layer.dataset.instant = ""
      void layer.offsetWidth
      delete layer.dataset.instant
    }
    wasOpenRef.current = isOpen
  }, [isOpen, shownIndex])

  // Escape hides the card wherever focus is, as a hover card's should.
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(preview)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, preview])

  const select = (item: PreviewRailItem) => {
    if (valueProp === undefined) setUncontrolledValue(item.value)
    onValueChange?.(item.value)
  }

  const getValueAtPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const length = isHorizontal ? rect.width : rect.height
    const offset = isHorizontal
      ? event.clientX - rect.left
      : event.clientY - rect.top
    const index = getPreviewRailIndexAtPoint(
      items,
      offset,
      length / Math.max(items.length, 1)
    )
    return items[index]?.value ?? null
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    isSwallowingClickRef.current = false
    if (event.pointerType === "mouse") return
    event.currentTarget.setPointerCapture(event.pointerId)
    setHovered(null)
    setFocused(null)
    setDismissed(null)
    setPressed(getValueAtPoint(event))
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pressed !== null) {
      setPressed(getValueAtPoint(event))
      return
    }
    if (event.pointerType === "touch" || event.buttons !== 0) return
    const next = getValueAtPoint(event)
    if (next !== hovered) setDismissed(null)
    setHovered(next)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pressed === null) return
    const rect = event.currentTarget.getBoundingClientRect()
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const isOnEnabledTick =
      isPreviewRailReleaseInside(point, rect, RELEASE_SLACK) &&
      !isPreviewRailDisabledAt(
        items,
        isHorizontal ? point.x : point.y,
        (isHorizontal ? rect.width : rect.height) / items.length
      )
    const index = items.findIndex((item) => item.value === pressed)
    setPressed(null)
    // Following a link needs a click on it; the one the lift sends would land
    // on whichever tick the finger pressed first, so it's swallowed.
    if (isOnEnabledTick) itemRefs.current[index]?.click()
    isSwallowingClickRef.current = true
  }

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isSwallowingClickRef.current || !event.isTrusted) return
    isSwallowingClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <nav
      data-slot="preview-rail"
      data-orientation={orientation}
      data-side={side}
      aria-label={ariaLabel}
      className={cn(
        "cn-preview-rail group/preview-rail relative isolate flex w-fit",
        className
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        // A key starts its own activation: a lift's click is no longer owed.
        isSwallowingClickRef.current = false
      }}
      onBlur={(event) => {
        onBlur?.(event)
        if (event.currentTarget.contains(event.relatedTarget)) return
        setFocused(null)
      }}
      {...props}
    >
      <div
        data-slot="preview-rail-list"
        data-orientation={orientation}
        className="cn-preview-rail-list flex touch-none flex-col data-[orientation=horizontal]:flex-row"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setPressed(null)}
        onPointerLeave={() => setHovered(null)}
        onClickCapture={handleClickCapture}
      >
        {items.map((item, index) => {
          const isCurrent = item.value === value
          const descriptionId = item.description
            ? `${id}-description-${index}`
            : undefined
          const itemProps = {
            ref: (element: HTMLElement | null) => {
              itemRefs.current[index] = element
            },
            "data-slot": "preview-rail-item",
            "data-orientation": orientation,
            "data-side": side,
            "data-current": isCurrent ? "" : undefined,
            "data-lit": index === litIndex ? "" : undefined,
            "data-disabled": item.disabled ? "" : undefined,
            "aria-label": item.label,
            "aria-describedby": descriptionId,
            style: {
              "--preview-rail-scale": getPreviewRailTickScale(index, litIndex),
            } as React.CSSProperties,
            className: cn(
              "cn-preview-rail-item relative flex shrink-0 items-center justify-center outline-none data-[orientation=horizontal]:flex-col"
            ),
            onFocus: (event: React.FocusEvent<HTMLElement>) => {
              if (!event.currentTarget.matches(":focus-visible")) return
              setDismissed(null)
              setFocused(item.value)
            },
            onClick: (event: React.MouseEvent<HTMLElement>) => {
              if (item.disabled) {
                event.preventDefault()
                return
              }
              select(item)
            },
          }
          const tick = (
            <span
              data-slot="preview-rail-tick"
              data-orientation={orientation}
              data-side={side}
              aria-hidden="true"
              className="cn-preview-rail-tick block shrink-0"
            />
          )

          if (item.href !== undefined) {
            return (
              <a
                key={item.value}
                {...itemProps}
                href={item.disabled ? undefined : item.href}
                target={item.target}
                rel={
                  item.rel ??
                  (item.target === "_blank" ? "noreferrer noopener" : undefined)
                }
                role={item.disabled ? "link" : undefined}
                aria-disabled={item.disabled || undefined}
                aria-current={isCurrent ? "page" : undefined}
              >
                {tick}
              </a>
            )
          }
          return (
            <button
              key={item.value}
              {...itemProps}
              type="button"
              disabled={item.disabled}
              aria-current={isCurrent ? "true" : undefined}
            >
              {tick}
            </button>
          )
        })}
      </div>
      {items.map((item, index) =>
        item.description ? (
          <span key={item.value} id={`${id}-description-${index}`} hidden>
            {item.description}
          </span>
        ) : null
      )}
      {shownItem ? (
        <div
          ref={layerRef}
          data-slot="preview-rail-preview"
          data-orientation={orientation}
          data-side={side}
          aria-hidden="true"
          style={
            {
              "--preview-rail-index": shownIndex,
              "--preview-rail-count": items.length,
            } as React.CSSProperties
          }
          className="cn-preview-rail-preview pointer-events-none absolute z-50"
        >
          <div
            data-slot="preview-rail-card"
            data-side={cardSide}
            data-open={isOpen ? "" : undefined}
            data-closed={isOpen ? undefined : ""}
            className="cn-preview-rail-card"
          >
            <div
              key={shownItem.value}
              data-slot="preview-rail-content"
              className="cn-preview-rail-content"
            >
              {renderPreview ? (
                renderPreview(shownItem)
              ) : (
                <>
                  <p
                    data-slot="preview-rail-title"
                    className="cn-preview-rail-title"
                  >
                    {shownItem.label}
                  </p>
                  {shownItem.description ? (
                    <p
                      data-slot="preview-rail-description"
                      className="cn-preview-rail-description"
                    >
                      {shownItem.description}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  )
}

export { PreviewRail, type PreviewRailItem, type PreviewRailProps }
