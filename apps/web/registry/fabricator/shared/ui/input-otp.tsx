"use client"

import * as React from "react"
import { cn } from "cn"
import { OTPInput, OTPInputContext } from "input-otp"

import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream input OTP (identical in every base).
// - `defaultValue` works: input-otp reads it but also spreads it onto its
//   native input next to its own `value`, which React rejects. The root keeps
//   the uncontrolled value itself and always hands input-otp `value`.
// - Each typed character rises into its slot; the slot keeps its `key` per
//   character so a replaced digit animates again.
// - Slots show input-otp's `placeholder` characters, muted, and mark
//   `data-filled` so the code's progress reads at a glance.
function InputOTP({
  className,
  containerClassName,
  value: valueProp,
  defaultValue,
  onChange,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    typeof defaultValue === "string" ? defaultValue : ""
  )
  const isControlled = valueProp !== undefined
  const value = isControlled ? valueProp : uncontrolledValue

  const handleChange = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) setUncontrolledValue(nextValue)
      onChange?.(nextValue)
    },
    [isControlled, onChange]
  )

  return (
    <OTPInput
      data-slot="input-otp"
      value={value}
      onChange={handleChange}
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName
      )}
      spellCheck={false}
      className={cn(
        "cn-input-otp-input disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("cn-input-otp-group flex items-center", className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, placeholderChar, hasFakeCaret, isActive } =
    inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      data-filled={char != null}
      className={cn(
        "cn-input-otp-slot relative flex items-center justify-center data-[active=true]:z-10",
        className
      )}
      {...props}
    >
      {char != null ? (
        <span key={char} className="cn-input-otp-char">
          {char}
        </span>
      ) : (
        placeholderChar != null &&
        !hasFakeCaret && (
          <span aria-hidden className="cn-input-otp-placeholder">
            {placeholderChar}
          </span>
        )
      )}
      {hasFakeCaret && (
        <div className="cn-input-otp-caret pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="cn-input-otp-caret-line" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="cn-input-otp-separator flex items-center"
      role="separator"
      {...props}
    >
      <IconPlaceholder
        lucide="MinusIcon"
        tabler="IconMinus"
        hugeicons="MinusSignIcon"
        phosphor="MinusIcon"
        remixicon="RiSubtractLine"
      />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
