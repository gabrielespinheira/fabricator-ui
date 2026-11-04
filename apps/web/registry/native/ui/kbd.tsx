import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { View } from "react-native"

import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

// `self-center` stands in for the website's `w-fit`: a view stretches across its
// column otherwise, and `self-start` would leave a key at the top of a Button.
function Kbd({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-kbd-text">
      <IconProvider size={12}>
        <View
          data-slot="kbd"
          pointerEvents="none"
          className={cn(
            "cn-kbd flex-row items-center justify-center self-center",
            className
          )}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </IconProvider>
    </TextStyle>
  )
}

function KbdGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="kbd-group"
      className={cn(
        "cn-kbd-group flex-row items-center self-center",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

export { Kbd, KbdGroup }
