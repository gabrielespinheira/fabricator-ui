import * as React from "react"
import { useComposedRefs } from "@rn-primitives/hooks"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { TextInput } from "react-native"
import Animated from "react-native-reanimated"

import { useFieldFrame } from "@/registry/native/lib/field-frame"
import { useFieldControl } from "@/registry/native/lib/field-model"

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

const inputRestVariants = cva("cn-input-rest")
const inputFocusVariants = cva("cn-input-focus")

function Input({
  className,
  "aria-invalid": isInvalid,
  disabled,
  editable,
  ref,
  style,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  "aria-invalid"?: boolean
  disabled?: boolean
}) {
  const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null)
  const composedRef = useComposedRefs(inputRef, ref)
  const field = useFieldControl({
    activate: () => inputRef.current?.focus(),
  })
  const isFieldInvalid = isInvalid ?? field.isInvalid
  const isEditable = editable ?? !(disabled ?? field.isDisabled)
  const frame = useFieldFrame({
    restClassName: inputRestVariants(),
    focusClassName: inputFocusVariants(),
    isInvalid: Boolean(isFieldInvalid),
    onFocus,
    onBlur,
  })
  return (
    <AnimatedTextInput
      ref={composedRef}
      data-slot="input"
      data-invalid={Boolean(isFieldInvalid)}
      aria-invalid={isFieldInvalid}
      aria-disabled={!isEditable}
      editable={isEditable}
      placeholderTextColorClassName="accent-muted-foreground"
      selectionColorClassName="accent-primary"
      className={cn("cn-input w-full disabled:opacity-50", className)}
      style={[frame.frameStyle, style]}
      onFocus={frame.onFocus}
      onBlur={frame.onBlur}
      {...props}
    />
  )
}

export { Input }
