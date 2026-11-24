import * as React from "react"
import { View } from "react-native"

import { Text } from "@/registry/native/ui/text"

type ScreenBoundaryState = { error: Error | null }

/**
 * Keeps a screen that throws while rendering to itself: it shows the error in
 * its place, and the rest of the app, and the screen check, carry on. React
 * logs the error. Key it by the screen, so the next one starts clean.
 */
export class ScreenBoundary extends React.Component<
  { children: React.ReactNode },
  ScreenBoundaryState
> {
  state: ScreenBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ScreenBoundaryState {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <View role="alert" className="flex-1 gap-2 p-6">
        <Text className="text-base font-medium text-destructive">
          This screen failed to render.
        </Text>
        <Text selectable className="font-mono text-sm text-muted-foreground">
          {error.name}: {error.message}
        </Text>
      </View>
    )
  }
}
