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
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "flex items-center gap-(--density-6) rounded-lg [[data-slot]+&]:ms-(--density-8)",
        className
      )}
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
        "relative flex size-(--density-36) cursor-text items-center justify-center rounded-lg bg-transparent text-(length:--density-text-14) text-foreground tabular-nums ring-1 ring-border transition-[background-color,box-shadow] duration-feedback ease-feedback outline-none ring-inset aria-invalid:ring-destructive/50 data-[active=true]:z-10 data-[active=true]:bg-card data-[active=true]:ring-foreground/30 data-[active=true]:aria-invalid:ring-destructive data-[filled=true]:not-data-[active=true]:not-aria-invalid:ring-foreground/15",
        className
      )}
      {...props}
    >
      {char != null ? (
        <span
          key={char}
          className="animate-in duration-feedback ease-enter fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
        >
          {char}
        </span>
      ) : (
        placeholderChar != null &&
        !hasFakeCaret && (
          <span aria-hidden className="text-muted-foreground">
            {placeholderChar}
          </span>
        )
      )}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="flex items-center text-muted-foreground [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-icon-16) [[data-slot]+&]:ms-(--density-8)"
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
