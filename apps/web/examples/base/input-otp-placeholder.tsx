"use client"

import { REGEXP_ONLY_DIGITS } from "input-otp"

import { Field, FieldLabel } from "@/styles/base-nova/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/styles/base-nova/ui/input-otp"

export function InputOTPPlaceholder() {
  return (
    <Field className="w-fit">
      <FieldLabel htmlFor="otp-placeholder">PIN</FieldLabel>
      <InputOTP
        id="otp-placeholder"
        maxLength={4}
        pattern={REGEXP_ONLY_DIGITS}
        placeholder="0000"
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    </Field>
  )
}
