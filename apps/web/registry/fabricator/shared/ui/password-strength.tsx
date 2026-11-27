"use client"

// Password Strength: four bars under a password field that fill one after
// another as the password gets stronger, turning from the destructive role to
// success, with a word that says how strong it is. The score comes from
// length and the kinds of character used (password-strength-model). Put it
// under the field, in the same Field. PasswordToggle shows and hides the
// password: its eye draws a slash across itself while the text is hidden.
import * as React from "react"
import { cn } from "cn"

import {
  getPasswordScore,
  PASSWORD_SCORE_LABELS,
} from "@/registry/bases/__base__/lib/password-strength-model"

type PasswordStrengthProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The password as typed. */
  value: string
  /** The word for each score, from nothing typed to strong. */
  labels?: readonly [string, string, string, string, string]
}

const BARS = [1, 2, 3, 4] as const

function PasswordStrength({
  value,
  labels = PASSWORD_SCORE_LABELS,
  className,
  ...props
}: PasswordStrengthProps) {
  const score = getPasswordScore(value)
  return (
    <div
      data-slot="password-strength"
      data-score={score}
      className={cn(
        "cn-password-strength group/password-strength flex flex-col",
        className
      )}
      {...props}
    >
      <div aria-hidden className="cn-password-strength-bars flex">
        {BARS.map((bar) => (
          <span
            key={bar}
            data-slot="password-strength-bar"
            data-filled={bar <= score ? "" : undefined}
            className="cn-password-strength-bar relative flex-1 overflow-hidden"
            style={{ "--bar-index": bar - 1 } as React.CSSProperties}
          >
            <span className="cn-password-strength-bar-fill absolute inset-0" />
          </span>
        ))}
      </div>
      <span
        data-slot="password-strength-label"
        aria-live="polite"
        className="cn-password-strength-label"
      >
        {score > 0 ? (
          <>
            <span className="sr-only">Password strength: </span>
            <span key={score} className="cn-password-strength-word">
              {labels[score]}
            </span>
          </>
        ) : null}
      </span>
    </div>
  )
}

type PasswordToggleProps = Omit<React.ComponentProps<"button">, "onClick"> & {
  /** Whether the password shows as text. */
  visible: boolean
  onVisibleChange: (visible: boolean) => void
}

/** Shows or hides a password field's text. Put it in the field's end addon. */
function PasswordToggle({
  visible,
  onVisibleChange,
  className,
  ...props
}: PasswordToggleProps) {
  return (
    <button
      type="button"
      data-slot="password-toggle"
      data-visible={visible ? "" : undefined}
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      className={cn(
        "cn-password-toggle group/password-toggle inline-flex shrink-0 items-center justify-center outline-none",
        className
      )}
      onClick={() => onVisibleChange(!visible)}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="cn-password-toggle-eye"
      >
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" className="cn-password-toggle-pupil" />
        <path
          d="M4.5 4.5l15 15"
          pathLength={1}
          className="cn-password-toggle-slash"
        />
      </svg>
    </button>
  )
}

export { PasswordStrength, PasswordToggle }
