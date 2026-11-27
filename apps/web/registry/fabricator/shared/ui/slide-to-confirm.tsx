"use client"

// Slide to Confirm: a track whose thumb you drag to the end to commit, for an
// action a stray tap shouldn't set off (send a payment, end a call). The
// thumb follows the finger and gives like rubber past either end; the ink it
// leaves turns the label over as it passes. Past most of the way the arrow
// nudges forward, and letting go confirms; short of that it springs back.
// While onConfirm's promise runs the thumb spins, then the track turns the
// success colour with a check. Enter and Space confirm from the keyboard.
import * as React from "react"
import { cn } from "cn"

import {
  getSlideProgress,
  shouldConfirmSlide,
} from "@/registry/bases/__base__/lib/slide-to-confirm-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type SlidePhase = "idle" | "dragging" | "confirming" | "confirmed"

type SlideToConfirmProps = Omit<
  React.ComponentProps<"button">,
  "onClick" | "children"
> & {
  /** What sliding does, shown on the track. */
  children: React.ReactNode
  /** Shown while onConfirm's promise runs. */
  confirmingLabel?: React.ReactNode
  /** Shown once confirmed. */
  confirmedLabel?: React.ReactNode
  /** Runs on confirm; return a promise to show the confirming state. */
  onConfirm?: () => Promise<unknown> | unknown
}

type Drag = { pointerId: number; startX: number; travel: number }

function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise
}

function SlideToConfirm({
  className,
  children,
  confirmingLabel = "Confirming",
  confirmedLabel = "Done",
  onConfirm,
  disabled,
  onKeyDown,
  style,
  ...props
}: SlideToConfirmProps) {
  const thumb = React.useRef<HTMLSpanElement | null>(null)
  const drag = React.useRef<Drag | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [phase, setPhase] = React.useState<SlidePhase>("idle")
  const hintId = React.useId()

  const getTravel = (root: HTMLElement) => {
    const knob = thumb.current
    if (!knob) return 0
    return root.clientWidth - knob.offsetWidth - knob.offsetLeft * 2
  }

  const confirm = () => {
    setProgress(1)
    const result = onConfirm?.()
    if (!isPromise(result)) {
      setPhase("confirmed")
      return
    }
    setPhase("confirming")
    result.then(
      () => setPhase("confirmed"),
      () => {
        setPhase("idle")
        setProgress(0)
      }
    )
  }

  const end = () => {
    if (!drag.current) return
    drag.current = null
    if (shouldConfirmSlide(progress)) {
      confirm()
      return
    }
    setPhase("idle")
    setProgress(0)
  }

  const isLocked = disabled || phase === "confirming" || phase === "confirmed"
  const isArmed = phase === "dragging" && shouldConfirmSlide(progress)
  const inkLabel =
    phase === "confirming"
      ? confirmingLabel
      : phase === "confirmed"
        ? confirmedLabel
        : children

  return (
    <button
      type="button"
      data-slot="slide-to-confirm"
      data-state={phase}
      data-armed={isArmed ? "" : undefined}
      disabled={disabled}
      aria-disabled={isLocked || undefined}
      aria-describedby={hintId}
      className={cn(
        "cn-slide-to-confirm group/slide-to-confirm relative flex touch-none items-center overflow-hidden outline-none select-none disabled:pointer-events-none",
        className
      )}
      style={{ "--slide-progress": progress, ...style } as React.CSSProperties}
      onPointerDown={(event) => {
        if (isLocked || event.button !== 0) return
        if (!thumb.current?.contains(event.target as Node)) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          travel: getTravel(event.currentTarget),
        }
        setPhase("dragging")
      }}
      onPointerMove={(event) => {
        const current = drag.current
        if (!current || current.pointerId !== event.pointerId) return
        setProgress(
          getSlideProgress(event.clientX - current.startX, current.travel)
        )
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (isLocked || (event.key !== "Enter" && event.key !== " ")) return
        event.preventDefault()
        confirm()
      }}
      {...props}
    >
      <span
        data-slot="slide-to-confirm-label"
        className="cn-slide-to-confirm-label pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap"
      >
        {children}
      </span>
      <span
        data-slot="slide-to-confirm-ink"
        aria-hidden
        className="cn-slide-to-confirm-ink pointer-events-none absolute inset-0"
      >
        <span
          key={phase === "dragging" ? "idle" : phase}
          className="cn-slide-to-confirm-ink-label absolute inset-0 flex items-center justify-center whitespace-nowrap"
        >
          {inkLabel}
        </span>
      </span>
      <span
        ref={thumb}
        data-slot="slide-to-confirm-thumb"
        aria-hidden
        className="cn-slide-to-confirm-thumb relative z-10 flex shrink-0 items-center justify-center"
      >
        <span className="cn-slide-to-confirm-arrow absolute inset-0 flex items-center justify-center">
          <IconPlaceholder
            lucide="ArrowRightIcon"
            tabler="IconArrowRight"
            hugeicons="ArrowRight02Icon"
            phosphor="ArrowRightIcon"
            remixicon="RiArrowRightLine"
          />
        </span>
        <svg
          viewBox="0 0 24 24"
          className="cn-slide-to-confirm-spinner absolute"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="14 43"
          />
        </svg>
        <span className="cn-slide-to-confirm-check absolute inset-0 flex items-center justify-center">
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
          />
        </span>
      </span>
      <span id={hintId} hidden>
        Slide to the end, or press Enter, to confirm
      </span>
      <span className="sr-only" aria-live="polite">
        {phase === "confirming" ? confirmingLabel : null}
        {phase === "confirmed" ? confirmedLabel : null}
      </span>
    </button>
  )
}

export { SlideToConfirm }
