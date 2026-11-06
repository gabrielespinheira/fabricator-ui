import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from "@/registry/native/ui/input-otp"
import { Text } from "@/registry/native/ui/text"

function Slots({ start, count }: { start: number; count: number }) {
  return (
    <InputOTPGroup>
      {Array.from({ length: count }, (_, index) => (
        <InputOTPSlot key={index} index={start + index} />
      ))}
    </InputOTPGroup>
  )
}

function InputOtpExample() {
  const [code, setCode] = React.useState("12")
  const [completed, setCompleted] = React.useState("")
  return (
    <ExampleWrapper>
      <Example title="Default">
        <InputOTP maxLength={6}>
          <Slots start={0} count={6} />
        </InputOTP>
      </Example>
      <Example title="With a separator">
        <InputOTP maxLength={6}>
          <Slots start={0} count={3} />
          <InputOTPSeparator />
          <Slots start={3} count={3} />
        </InputOTP>
      </Example>
      <Example title="Letters and digits">
        <InputOTP maxLength={4} pattern={REGEXP_ONLY_DIGITS_AND_CHARS}>
          <Slots start={0} count={4} />
        </InputOTP>
      </Example>
      <Example title="Controlled">
        <InputOTP
          maxLength={4}
          value={code}
          onChange={setCode}
          onComplete={setCompleted}
        >
          <Slots start={0} count={4} />
        </InputOTP>
        <Text className="text-muted-foreground">
          {completed ? `Completed: ${completed}` : `Typed: ${code}`}
        </Text>
      </Example>
      <Example title="Invalid">
        <InputOTP maxLength={4} defaultValue="1234" aria-invalid>
          <Slots start={0} count={4} />
        </InputOTP>
      </Example>
      <Example title="Disabled">
        <InputOTP maxLength={4} defaultValue="12" disabled>
          <Slots start={0} count={4} />
        </InputOTP>
      </Example>
    </ExampleWrapper>
  )
}

export { InputOtpExample }
