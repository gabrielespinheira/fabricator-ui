"use client"

import { REGEXP_ONLY_DIGITS } from "input-otp"

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/aria-nova/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/styles/aria-nova/ui/input-otp"

export function InputOTPDemo() {
  return (
    <Field className="w-fit">
      <FieldLabel htmlFor="otp-demo">Verification code</FieldLabel>
      <InputOTP
        id="otp-demo"
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        autoComplete="one-time-code"
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <FieldDescription>
        Enter the 6-digit code sent to your email.
      </FieldDescription>
    </Field>
  )
}
