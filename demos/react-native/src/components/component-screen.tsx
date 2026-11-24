// Component demos rendered from the compiled native registry.
import * as React from "react"
import { NATIVE_EXAMPLES } from "@/examples/native/__index__"
import { ExampleScreenContext } from "@/examples/native/example"
import { View } from "react-native"
import Animated from "react-native-reanimated"

import { getComponentGroup } from "@/lib/component-groups"
import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import {
  AppShellContent,
  AppShellPageTitle,
} from "@/registry/native/ui/app-shell"
import { Text } from "@/registry/native/ui/text"

import { getComponentTitle } from "./component-model"

function PageTransition({
  pageKey,
  children,
}: {
  pageKey: string
  children: React.ReactNode
}) {
  const { entering } = useSurfaceAnimation("move", { translateX: 16 })
  return (
    <Animated.View key={pageKey} entering={entering} className="flex-1">
      {children}
    </Animated.View>
  )
}

function ComponentDemo({ name }: { name: string }) {
  const getExample = NATIVE_EXAMPLES[name]
  const Example = getExample?.()
  // The way back is in the header's breadcrumb. The title scrolls with the demo,
  // under the header, and takes the header's place once it's gone.
  const heading = (
    <View className="gap-1">
      <AppShellPageTitle>{getComponentTitle(name)}</AppShellPageTitle>
      <Text className="text-sm text-muted-foreground">
        {getComponentGroup(name)}
      </Text>
    </View>
  )
  if (!Example) {
    return (
      <AppShellContent size="md" contentContainerClassName="gap-6">
        {heading}
        <Text className="text-muted-foreground">No demo for {name}.</Text>
      </AppShellContent>
    )
  }
  return (
    <ExampleScreenContext value={{ Scroller: AppShellContent, heading }}>
      <Example />
    </ExampleScreenContext>
  )
}

/** One component demo, opened from its group in the sidebar. */
export function ComponentScreen({ name }: { name: string }) {
  return (
    <PageTransition pageKey={name}>
      <ComponentDemo name={name} />
    </PageTransition>
  )
}
