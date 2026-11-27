"use client"

// Hold Button: a button that confirms only when held for its whole duration,
// for an action worth a second thought (delete, publish, pay) without a
// dialog in the way. Holding fills it from the start edge, the label turning
// over under the fill; letting go early springs the fill back and shakes no;
// holding to the end calls onHoldComplete and shows a check for a moment.
// Space and Enter hold it as they press a button.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { useMergedRef } from "@/registry/bases/__base__/lib/fluid-hover"
import {
  DEFAULT_HOLD_DURATION,
  getHoldOutcome,
  isHoldKey,
} from "@/registry/bases/__base__/lib/hold-button-model"
import { resolveSpringTransition } from "@/registry/bases/__base__/lib/spring-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const holdButtonVariants = cva(
  "cn-hold-button group/hold-button relative inline-flex shrink-0 items-center justify-center overflow-hidden whitespace-nowrap outline-none select-none disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "cn-hold-button-variant-default",
        destructive: "cn-hold-button-variant-destructive",
      },
      size: {
        sm: "cn-hold-button-size-sm",
        default: "cn-hold-button-size-default",
        lg: "cn-hold-button-size-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

type HoldState = "idle" | "holding" | "complete"

// How long the check stays before the button is ready again.
const COMPLETE_MS = 1600

// A short sideways shake on the fade spring's time: the hold didn't count.
function shake(element: HTMLElement | null) {
  if (!element) return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const style = getComputedStyle(element)
  const timing = resolveSpringTransition(
    style.getPropertyValue("--motion-spring-fade-duration"),
    "ease-out",
    style.getPropertyValue("--motion-scale")
  )
  if (!timing) return
  element.animate(
    { translate: ["0", "-4px", "4px", "-2px", "1px", "0"] },
    timing
  )
}

type HoldButtonProps = Omit<React.ComponentProps<"button">, "onClick"> &
  VariantProps<typeof holdButtonVariants> & {
    /** How long a press has to last, in milliseconds. */
    duration?: number
    /** Called once a press has lasted the whole duration. */
    onHoldComplete?: () => void
  }

function HoldButton({
  className,
  variant = "default",
  size = "default",
  duration = DEFAULT_HOLD_DURATION,
  onHoldComplete,
  disabled,
  children,
  style,
  ref,
  onPointerDown,
  onKeyDown,
  onKeyUp,
  ...props
}: HoldButtonProps) {
  const [state, setState] = React.useState<HoldState>("idle")
  const button = React.useRef<HTMLButtonElement | null>(null)
  const startedAt = React.useRef(0)
  const timer = React.useRef<number | undefined>(undefined)
  const hintId = React.useId()

  const setRefs = useMergedRef(button, ref)

  const start = () => {
    if (disabled || state !== "idle") return
    startedAt.current = performance.now()
    setState("holding")
    timer.current = window.setTimeout(() => {
      setState("complete")
      onHoldComplete?.()
    }, duration)
  }

  const release = () => {
    if (state !== "holding") return
    const held = performance.now() - startedAt.current
    if (getHoldOutcome(held, duration) === "complete") return
    window.clearTimeout(timer.current)
    setState("idle")
    shake(button.current)
  }

  React.useEffect(() => {
    if (state !== "complete") return
    const reset = window.setTimeout(() => setState("idle"), COMPLETE_MS)
    return () => window.clearTimeout(reset)
  }, [state])

  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <button
      ref={setRefs}
      type="button"
      data-slot="hold-button"
      data-state={state}
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      aria-describedby={hintId}
      className={cn(holdButtonVariants({ variant, size }), className)}
      style={
        { "--hold-duration": `${duration}ms`, ...style } as React.CSSProperties
      }
      onPointerDown={(event) => {
        onPointerDown?.(event)
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        start()
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (!isHoldKey(event.key)) return
        event.preventDefault()
        if (!event.repeat) start()
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event)
        if (!isHoldKey(event.key)) return
        event.preventDefault()
        release()
      }}
      {...props}
    >
      <span
        data-slot="hold-button-label"
        className="cn-hold-button-label inline-flex items-center"
      >
        {children}
      </span>
      <span
        data-slot="hold-button-fill"
        aria-hidden
        className="cn-hold-button-fill pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className="cn-hold-button-fill-label inline-flex items-center">
          {children}
        </span>
      </span>
      <span
        data-slot="hold-button-check"
        aria-hidden
        className="cn-hold-button-check pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <IconPlaceholder
          lucide="CheckIcon"
          tabler="IconCheck"
          hugeicons="Tick02Icon"
          phosphor="CheckIcon"
          remixicon="RiCheckLine"
        />
      </span>
      <span id={hintId} hidden>
        Press and hold to confirm
      </span>
      <span className="sr-only" aria-live="polite">
        {state === "complete" ? "Confirmed" : ""}
      </span>
    </button>
  )
}

export { HoldButton, holdButtonVariants }
