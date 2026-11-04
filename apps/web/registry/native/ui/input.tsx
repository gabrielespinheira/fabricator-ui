import * as React from "react"
import { useComposedRefs } from "@rn-primitives/hooks"
import { cn } from "cn"
import { TextInput } from "react-native"

import { useFieldControl } from "@/registry/native/lib/field-model"

function Input({
  className,
  "aria-invalid": isInvalid,
  disabled,
  editable,
  ref,
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
  return (
    <TextInput
      ref={composedRef}
      data-slot="input"
      data-invalid={Boolean(isFieldInvalid)}
      aria-invalid={isFieldInvalid}
      aria-disabled={!isEditable}
      editable={isEditable}
      placeholderTextColorClassName="accent-muted-foreground"
      selectionColorClassName="accent-primary"
      className={cn("cn-input w-full disabled:opacity-50", className)}
      {...props}
    />
  )
}

export { Input }
