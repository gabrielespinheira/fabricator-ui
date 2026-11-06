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

// Whether a demo's controls keep a form's width on a tablet.
const ExampleFitContext = React.createContext(false)

/**
 * A demo's screen: its sections stacked on the page. `fit` is for controls that fill
 * their box, which on a tablet is far wider than anything would give them.
 */
function ExampleWrapper({
  className,
  fit = false,
  children,
  ...props
}: ViewProps & { fit?: boolean }) {
  const screen = React.use(ExampleScreenContext)
  if (screen) {
    return (
      <ExampleFitContext value={fit}>
        <screen.Scroller
          size="md"
          contentContainerClassName={cn("gap-6", className)}
          {...props}
        >
          {screen.heading}
          {children}
        </screen.Scroller>
      </ExampleFitContext>
    )
  }
  return (
    <ExampleFitContext value={fit}>
      <ScrollView
        contentContainerClassName={cn("gap-6 p-4 pb-12", className)}
        {...props}
      >
        {children}
      </ScrollView>
    </ExampleFitContext>
  )
}

/** One labelled state or variant, on a card. */
function Example({
  title,
  className,
  children,
  ...props
}: ViewProps & { title?: string }) {
  const fit = React.use(ExampleFitContext)
  const body = "items-start gap-(--density-16)"
  return (
    <View className="gap-1.5" {...props}>
      {title ? (
        <Text className="px-1 text-(length:--density-text-12) font-medium text-muted-foreground">
          {title}
        </Text>
      ) : null}
      <View
        className={cn(
          "rounded-xl bg-card p-(--density-20) shadow-surface-2",
          !fit && body,
          !fit && className
        )}
      >
        {fit ? (
          <View className={cn("w-full md:max-w-[440px]", body, className)}>
            {children}
          </View>
        ) : (
          children
        )}
      </View>
    </View>
  )
}

export { Example, ExampleScreenContext, ExampleWrapper }
