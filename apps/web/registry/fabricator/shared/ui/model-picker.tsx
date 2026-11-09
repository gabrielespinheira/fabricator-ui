"use client"

import * as React from "react"
import { cn } from "cn"

import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The model switcher's panel: an effort slider for the model in use, Auto
// and other routing tiles, and the models grouped by provider. It is the
// content of a popover of your own (from a Chat Input's model button, for
// one), so it fits every base.

/** The hue the top effort level turns, in degrees past the first one's. */
const EFFORT_HUE_RANGE = 60

/** Each effort level warms from the info hue toward violet. */
function getEffortHueShift(index: number, count: number) {
  if (count <= 1) return 0
  return Math.round((index / (count - 1)) * EFFORT_HUE_RANGE)
}

/** The level a key moves the effort slider to, or null for any other key. */
function getEffortKeyIndex(key: string, index: number, count: number) {
  const last = count - 1
  if (key === "ArrowRight" || key === "ArrowUp")
    return Math.min(last, index + 1)
  if (key === "ArrowLeft" || key === "ArrowDown") return Math.max(0, index - 1)
  if (key === "Home") return 0
  if (key === "End") return last
  return null
}

/**
 * The level nearest a pointer on the track. The thumb sits inside the track's
 * ends, so the first and last level centres are half a thumb in.
 */
function getEffortIndexAtPoint({
  x,
  left,
  width,
  thumb,
  count,
}: {
  x: number
  left: number
  width: number
  thumb: number
  count: number
}) {
  if (count <= 1) return 0
  const room = Math.max(1, width - thumb)
  const position = (x - left - thumb / 2) / room
  return Math.min(count - 1, Math.max(0, Math.round(position * (count - 1))))
}

/** The panel, inside a popover's content: scrolls past its max height. */
function ModelPicker({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="model-picker"
      className={cn(
        "cn-model-picker relative flex flex-col overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

/** A caption row at the top, such as "Select model" with a back button. */
function ModelPickerHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="model-picker-header"
      className={cn(
        "cn-model-picker-header flex shrink-0 items-center",
        className
      )}
      {...props}
    />
  )
}

/** Routing choices side by side above the models, such as Auto. */
function ModelPickerRoutes({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="model-picker-routes"
      className={cn(
        "cn-model-picker-routes grid shrink-0 auto-cols-fr grid-flow-col",
        className
      )}
      {...props}
    />
  )
}

type ModelPickerRouteProps = React.ComponentProps<"button"> & {
  /** Picked in place of a model. */
  selected?: boolean
  /** What the route does, under its label. */
  caption?: React.ReactNode
}

/**
 * A routing tile: its icon and label (the children), then a caption. Picked
 * in place of a model (`selected`), or checked on top of one with
 * `aria-pressed`.
 */
function ModelPickerRoute({
  className,
  selected = false,
  caption,
  type = "button",
  children,
  ...props
}: ModelPickerRouteProps) {
  return (
    <button
      type={type}
      data-slot="model-picker-route"
      data-selected={selected ? "true" : undefined}
      aria-current={selected || undefined}
      className={cn(
        "cn-model-picker-route relative grid content-start text-start outline-none disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      <span className="cn-model-picker-route-label flex min-w-0 items-center">
        {children}
        {selected && (
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            aria-hidden
            data-slot="model-picker-check"
            className="cn-model-picker-check ms-auto shrink-0"
          />
        )}
      </span>
      {caption && (
        <span
          data-slot="model-picker-route-caption"
          className="cn-model-picker-route-caption"
        >
          {caption}
        </span>
      )}
    </button>
  )
}

/** One provider's models, under a label that stays pinned while they scroll. */
function ModelPickerGroup({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="model-picker-group"
      className={cn("cn-model-picker-group flex flex-col", className)}
      {...props}
    />
  )
}

function ModelPickerGroupLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="model-picker-group-label"
      className={cn(
        "cn-model-picker-group-label sticky top-0 z-10 flex shrink-0 items-center",
        className
      )}
      {...props}
    />
  )
}

type ModelPickerItemProps = React.ComponentProps<"button"> & {
  /** The model in use: tinted, with a check at the end. */
  selected?: boolean
}

/** One model: its name, then `ModelPickerItemMeta`, then the check. */
function ModelPickerItem({
  className,
  selected = false,
  type = "button",
  children,
  ...props
}: ModelPickerItemProps) {
  return (
    <button
      type={type}
      data-slot="model-picker-item"
      data-selected={selected ? "true" : undefined}
      aria-current={selected || undefined}
      className={cn(
        "cn-model-picker-item relative flex w-full items-center text-start outline-none disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
      <IconPlaceholder
        lucide="CheckIcon"
        tabler="IconCheck"
        hugeicons="Tick02Icon"
        phosphor="CheckIcon"
        remixicon="RiCheckLine"
        aria-hidden
        data-slot="model-picker-check"
        className="cn-model-picker-check shrink-0"
      />
    </button>
  )
}

/** The model's name, truncated to the room it has. */
function ModelPickerItemName({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="model-picker-item-name"
      className={cn("min-w-0 flex-1 truncate", className)}
      {...props}
    />
  )
}

/** Quiet facts at the end of a row: Default, the context window, a fast speed. */
function ModelPickerItemMeta({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="model-picker-item-meta"
      className={cn(
        "cn-model-picker-item-meta flex shrink-0 items-center",
        className
      )}
      {...props}
    />
  )
}

type ModelPickerEffortLevel = { value: string; label: string }

type ModelPickerEffortProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue"
> & {
  /** The model's levels, lowest first. */
  levels: readonly ModelPickerEffortLevel[]
  /** The level in use. Without one, the slider rests in the middle and reads "Default". */
  value?: string | null
  onValueChange?: (value: string) => void
  /** The model button over the slider, which opens the model list. */
  children?: React.ReactNode
}

/**
 * Reasoning effort for the model in use: a slider whose fill warms from blue
 * toward violet as the effort rises, the top level glowing. The model's
 * button sits above it, with the level's name across from it.
 */
function ModelPickerEffort({
  className,
  levels,
  value,
  onValueChange,
  children,
  ...props
}: ModelPickerEffortProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const thumbRef = React.useRef<HTMLSpanElement>(null)
  const [preview, setPreview] = React.useState<number | null>(null)
  const count = levels.length
  const chosenIndex = levels.findIndex((level) => level.value === value)
  const isChosen = chosenIndex >= 0 || preview !== null
  const index =
    preview ?? (chosenIndex >= 0 ? chosenIndex : Math.floor((count - 1) / 2))
  const level = levels[index]
  const steps = Math.max(1, count - 1)
  const isPeak = isChosen && count > 1 && index === count - 1

  const indexAt = (x: number) => {
    const track = trackRef.current
    if (!track) return index
    const rect = track.getBoundingClientRect()
    return getEffortIndexAtPoint({
      x,
      left: rect.left,
      width: rect.width,
      thumb: thumbRef.current?.offsetWidth ?? 0,
      count,
    })
  }

  const commit = (next: number) => {
    setPreview(null)
    const picked = levels[next]
    if (picked && picked.value !== value) onValueChange?.(picked.value)
  }

  if (count === 0) return null

  return (
    <div
      data-slot="model-picker-effort"
      data-chosen={isChosen ? "" : undefined}
      data-peak={isPeak ? "" : undefined}
      style={
        {
          "--model-picker-effort-shift": getEffortHueShift(index, count),
          "--model-picker-effort-at": index / steps,
        } as React.CSSProperties
      }
      className={cn("cn-model-picker-effort grid", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        {children}
        <span
          data-slot="model-picker-effort-label"
          className="cn-model-picker-effort-label shrink-0"
        >
          {isChosen ? level?.label : "Default"}
        </span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Reasoning effort"
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={index}
        aria-valuetext={isChosen ? level?.label : "Default"}
        data-slot="model-picker-effort-track"
        className="cn-model-picker-effort-track group/model-picker-effort relative flex cursor-pointer touch-none items-center outline-none select-none"
        onKeyDown={(event) => {
          const next = getEffortKeyIndex(event.key, index, count)
          if (next === null) return
          event.preventDefault()
          commit(next)
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          setPreview(indexAt(event.clientX))
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
          setPreview(indexAt(event.clientX))
        }}
        onPointerUp={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
          commit(indexAt(event.clientX))
        }}
        onPointerCancel={() => setPreview(null)}
      >
        <span
          aria-hidden
          data-slot="model-picker-effort-rail"
          className="cn-model-picker-effort-rail absolute inset-x-0 overflow-hidden"
        >
          <span
            data-slot="model-picker-effort-fill"
            className="cn-model-picker-effort-fill absolute inset-y-0 start-0"
          />
          {levels.map((step, at) => (
            <span
              key={step.value}
              data-slot="model-picker-effort-step"
              data-reached={at <= index ? "" : undefined}
              style={
                {
                  "--model-picker-effort-step": at / steps,
                } as React.CSSProperties
              }
              className="cn-model-picker-effort-step absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          ))}
        </span>
        <span
          ref={thumbRef}
          aria-hidden
          data-slot="model-picker-effort-thumb"
          className="cn-model-picker-effort-thumb absolute z-10"
        />
      </div>
    </div>
  )
}

/** A labelled control under the panel, ruled off from what's above: speed, permissions. */
function ModelPickerSetting({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<"div"> & { label: React.ReactNode }) {
  return (
    <div
      data-slot="model-picker-setting"
      className={cn(
        "cn-model-picker-setting flex items-center justify-between",
        className
      )}
      {...props}
    >
      <span className="cn-model-picker-setting-label shrink-0">{label}</span>
      {children}
    </div>
  )
}

export {
  ModelPicker,
  ModelPickerHeader,
  ModelPickerRoutes,
  ModelPickerRoute,
  ModelPickerGroup,
  ModelPickerGroupLabel,
  ModelPickerItem,
  ModelPickerItemName,
  ModelPickerItemMeta,
  ModelPickerEffort,
  ModelPickerSetting,
  getEffortHueShift,
  getEffortKeyIndex,
  getEffortIndexAtPoint,
  type ModelPickerEffortLevel,
}
