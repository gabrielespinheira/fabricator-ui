import * as React from "react"
import { cn } from "cn"
import { View } from "react-native"

import { renderTextChildren } from "@/registry/native/ui/text"

function AspectRatio({
  ratio,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof View> & { ratio: number }) {
  return (
    <View
      data-slot="aspect-ratio"
      style={[{ aspectRatio: ratio }, style]}
      className={cn("relative", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

export { AspectRatio }
