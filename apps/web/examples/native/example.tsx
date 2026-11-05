import * as React from "react"
import { cn } from "cn"
import { ScrollView, View, type ViewProps } from "react-native"

import { Text } from "@/registry/native/ui/text"

/**
 * What the screen around a demo asks of it: its own scroller, which knows the room
 * a header and a tab bar take, and a heading that scrolls with the demo.
 */
const ExampleScreenContext = React.createContext<{
  Scroller: React.ComponentType<
    React.ComponentProps<typeof ScrollView> & { size?: "md" }
  >
  heading?: React.ReactNode
} | null>(null)

/** A demo's screen: its sections stacked on the page. */
function ExampleWrapper({ className, children, ...props }: ViewProps) {
  const screen = React.use(ExampleScreenContext)
  if (screen) {
    return (
      <screen.Scroller
        size="md"
        contentContainerClassName={cn("gap-6", className)}
        {...props}
      >
        {screen.heading}
        {children}
      </screen.Scroller>
    )
  }
  return (
    <ScrollView
      contentContainerClassName={cn("gap-6 p-4 pb-12", className)}
      {...props}
    >
      {children}
    </ScrollView>
  )
}

/** One labelled state or variant, on a card. */
function Example({
  title,
  className,
  children,
  ...props
}: ViewProps & { title?: string }) {
  return (
    <View className="gap-1.5" {...props}>
      {title ? (
        <Text className="px-1 text-(length:--density-text-12) font-medium text-muted-foreground">
          {title}
        </Text>
      ) : null}
      <View
        className={cn(
          "items-start gap-(--density-16) rounded-xl bg-card p-(--density-20) shadow-surface-2",
          className
        )}
      >
        {children}
      </View>
    </View>
  )
}

export { Example, ExampleScreenContext, ExampleWrapper }
