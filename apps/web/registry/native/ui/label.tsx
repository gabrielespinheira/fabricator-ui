import * as React from "react"
import { cn } from "cn"

import { Text } from "@/registry/native/ui/text"

function Label({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="label"
      data-disabled={Boolean(disabled)}
      disabled={disabled}
      className={cn("cn-label", className)}
      {...props}
    />
  )
}

export { Label }
