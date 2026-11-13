"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import {
  getRatingKeyValue,
  getRatingStarFill,
  getRatingValueAtPoint,
  getRatingValueText,
  snapRatingValue,
  type RatingStep,
} from "@/registry/bases/__base__/lib/rating-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A row of stars that holds a score. Hover previews the score under the
// pointer, a click or a drag sets it, half a star at a time with step={0.5}.
// It's a slider (WAI-ARIA) from 0 to max. Read-only it's an image of the
// score, showing any fraction (4.3 fills a third of the fifth star).

const ratingVariants = cva(
  "cn-rating group/rating relative inline-flex w-fit shrink-0 touch-pan-y items-center outline-none select-none",
  {
    variants: {
      variant: {
        default: "cn-rating-variant-default",
        primary: "cn-rating-variant-primary",
        info: "cn-rating-variant-info",
        success: "cn-rating-variant-success",
        warning: "cn-rating-variant-warning",
        error: "cn-rating-variant-error",
      },
      size: {
        sm: "cn-rating-size-sm",
        default: "cn-rating-size-default",
        lg: "cn-rating-size-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type RatingProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange" | "children"
> &
  VariantProps<typeof ratingVariants> & {
    /** The score, from 0 to max. */
    value?: number
    defaultValue?: number
    onValueChange?: (value: number) => void
    /** When a click, a drag or a key ends, with the score it landed on. */
    onValueCommitted?: (value: number) => void
    /** How many stars. */
    max?: number
    /** 1 for whole stars, 0.5 for halves. */
    step?: RatingStep
    /** Shows the score, with any fraction, and takes no input. */
    readOnly?: boolean
    disabled?: boolean
    /** Submits the score with a form under this name. */
    name?: string
    /** What screen readers hear for a score. */
    getAriaValueText?: (value: number, max: number) => string
  }

type RatingStarState = "full" | "half" | "partial" | "empty"

function getStarState(fill: number): RatingStarState {
  if (fill === 1) return "full"
  if (fill === 0) return "empty"
  return fill === 0.5 ? "half" : "partial"
}

/** Where each star sits along the root, in px from its start. */
function measureStars(root: HTMLElement) {
  const left = root.getBoundingClientRect().left
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-slot=rating-star]"),
    (star) => {
      const bounds = star.getBoundingClientRect()
      return { start: bounds.left - left, end: bounds.right - left }
    }
  )
}

function RatingStarIcon() {
  return (
    <IconPlaceholder
      lucide="StarIcon"
      tabler="IconStarFilled"
      hugeicons="StarIcon"
      phosphor="StarIcon"
      remixicon="RiStarFill"
    />
  )
}

function RatingStar({
  index,
  fill,
  isActive,
}: {
  index: number
  fill: number
  isActive: boolean
}) {
  return (
    <span
      data-slot="rating-star"
      data-state={getStarState(fill)}
      data-active={isActive ? "" : undefined}
      aria-hidden
      className="cn-rating-star group/rating-star relative inline-flex shrink-0"
      style={{ "--rating-index": index } as React.CSSProperties}
    >
      <span
        data-slot="rating-star-empty"
        className="cn-rating-star-empty absolute inset-0 flex"
      >
        <RatingStarIcon />
      </span>
      <span
        data-slot="rating-star-fill"
        className="cn-rating-star-fill absolute inset-0 flex"
        style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
      >
        <RatingStarIcon />
      </span>
    </span>
  )
}

function Rating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  onValueCommitted,
  max = 5,
  step = 1,
  readOnly = false,
  disabled = false,
  name,
  getAriaValueText = getRatingValueText,
  variant = "default",
  size = "default",
  className,
  ref,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onKeyDown,
  "aria-label": ariaLabel = "Rating",
  ...props
}: RatingProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const rawValue = valueProp ?? uncontrolled
  // A read-only score keeps its fraction; one you set keeps to the step.
  const value = readOnly ? rawValue : snapRatingValue(rawValue, step, max)
  // What the handlers read: a drag can change the value twice between renders.
  const latest = React.useRef(value)
  React.useEffect(() => {
    latest.current = value
  }, [value])
  const pointerId = React.useRef<number | null>(null)
  // The score under a hovering mouse, shown until it leaves.
  const [preview, setPreview] = React.useState<number | null>(null)
  const [isPressed, setIsPressed] = React.useState(false)

  const isInteractive = !readOnly && !disabled
  const shown = preview ?? value
  const activeIndex =
    isInteractive && (preview !== null || isPressed) ? Math.ceil(shown) - 1 : -1
  const valueText = getAriaValueText(value, max)

  const change = (next: number) => {
    if (next === latest.current) return
    latest.current = next
    if (valueProp === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  const readValue = (event: React.PointerEvent<HTMLDivElement>) =>
    getRatingValueAtPoint(
      event.clientX - event.currentTarget.getBoundingClientRect().left,
      measureStars(event.currentTarget),
      step
    )

  const endPress = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== event.pointerId) return false
    pointerId.current = null
    setIsPressed(false)
    return true
  }

  const stars = Array.from(
    { length: Math.max(0, Math.ceil(max)) },
    (_, index) => (
      <RatingStar
        key={index}
        index={index}
        fill={getRatingStarFill(index, shown)}
        isActive={index === activeIndex}
      />
    )
  )

  const sharedProps = {
    "data-slot": "rating",
    "data-variant": variant,
    "data-size": size,
    "data-readonly": readOnly ? "" : undefined,
    "data-disabled": disabled ? "" : undefined,
    className: cn(ratingVariants({ variant, size }), className),
  }

  if (readOnly) {
    return (
      <div
        ref={ref}
        role="img"
        aria-label={`${ariaLabel}: ${valueText}`}
        {...sharedProps}
        {...props}
      >
        {stars}
        {name && <input type="hidden" name={name} value={value} />}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={disabled ? undefined : 0}
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      data-previewing={preview !== null ? "" : undefined}
      data-pressed={isPressed ? "" : undefined}
      {...sharedProps}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        if (event.defaultPrevented || !isInteractive) return
        if (event.pointerType === "mouse" && event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        pointerId.current = event.pointerId
        setIsPressed(true)
        setPreview(null)
        change(readValue(event))
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event)
        if (!isInteractive) return
        if (pointerId.current === event.pointerId) {
          change(readValue(event))
          return
        }
        if (event.pointerType === "mouse" && pointerId.current === null)
          setPreview(readValue(event))
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event)
        if (!endPress(event)) return
        if (event.pointerType === "mouse") setPreview(readValue(event))
        onValueCommitted?.(latest.current)
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event)
        if (!endPress(event)) return
        onValueCommitted?.(latest.current)
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event)
        setPreview(null)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || !isInteractive) return
        const next = getRatingKeyValue(event.key, latest.current, { step, max })
        if (next === null) return
        event.preventDefault()
        setPreview(null)
        change(next)
        onValueCommitted?.(next)
      }}
      {...props}
    >
      {stars}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  )
}

export { Rating, ratingVariants, type RatingProps }
