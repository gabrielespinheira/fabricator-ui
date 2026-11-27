"use client"

// Password Strength: four bars under a password field that fill one after
// another as the password gets stronger, turning from the destructive role to
// success, with a word that says how strong it is. The score comes from
// length and the kinds of character used (password-strength-model). Put it
// under the field, in the same Field.
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

export { PasswordStrength }
