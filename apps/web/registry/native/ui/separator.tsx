import * as React from "react"
import { cn } from "cn"
import { View } from "react-native"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof View> & {
  orientation?: "horizontal" | "vertical"
}) {
  return (
    <View
      data-slot="separator"
      data-orientation={orientation}
      role="separator"
      className={cn("cn-separator", className)}
      {...props}
    />
  )
}

export { Separator }
