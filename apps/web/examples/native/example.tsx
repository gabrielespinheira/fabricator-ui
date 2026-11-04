import * as React from "react"
import { cn } from "cn"
import { ScrollView, View, type ViewProps } from "react-native"

import { Text } from "@/registry/native/ui/text"

/** A demo's screen: its sections stacked on the page. */
function ExampleWrapper({ className, children, ...props }: ViewProps) {
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
        <Text className="px-1 text-xs font-medium text-muted-foreground">
          {title}
        </Text>
      ) : null}
      <View
        className={cn(
          "items-start gap-4 rounded-xl bg-card p-5 shadow-surface-2",
          className
        )}
      >
        {children}
      </View>
    </View>
  )
}

export { Example, ExampleWrapper }
