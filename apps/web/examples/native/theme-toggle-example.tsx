import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { Appearance, View } from "react-native"
import { Uniwind, useUniwind } from "uniwind"

import {
  THEME_TOGGLE_STARTS,
  THEME_TOGGLE_VARIANTS,
} from "@/registry/fabricator/shared/lib/theme-toggle-model"
import { Text } from "@/registry/native/ui/text"
import { ThemeToggle } from "@/registry/native/ui/theme-toggle"

function ThemeToggleExample() {
  const { theme } = useUniwind()
  const setTheme = (next: "light" | "dark") => {
    Appearance.setColorScheme(next)
    Uniwind.setTheme(next)
  }
  const resolvedTheme = theme === "dark" ? "dark" : "light"
  return (
    <ExampleWrapper fit>
      <Example title="Theme toggle">
        <View className="flex-row flex-wrap gap-6">
          {THEME_TOGGLE_VARIANTS.map((variant) => (
            <View key={variant} className="items-center gap-3">
              <ThemeToggle
                theme={resolvedTheme}
                onThemeChange={setTheme}
                accessibilityLabel={`Toggle theme: ${variant}`}
                variant={variant}
                buttonVariant="outline"
              />
              <Text className="text-muted-foreground">{variant}</Text>
            </View>
          ))}
        </View>
      </Example>
      <Example title="Origins">
        <View className="flex-row flex-wrap gap-6">
          {THEME_TOGGLE_STARTS.map((start) => (
            <View key={start} className="items-center gap-3">
              <ThemeToggle
                theme={resolvedTheme}
                onThemeChange={setTheme}
                variant="circle-blur"
                accessibilityLabel={`Toggle theme from ${start}`}
                start={start}
              />
              <Text className="text-muted-foreground">{start}</Text>
            </View>
          ))}
        </View>
      </Example>
      <Example title="Button variants">
        <View className="flex-row flex-wrap gap-4">
          {(
            [
              "default",
              "outline",
              "secondary",
              "ghost",
              "destructive",
              "link",
            ] as const
          ).map((buttonVariant) => (
            <ThemeToggle
              key={buttonVariant}
              theme={resolvedTheme}
              onThemeChange={setTheme}
              accessibilityLabel={`Toggle theme: ${buttonVariant} button`}
              buttonVariant={buttonVariant}
            />
          ))}
        </View>
      </Example>
      <Example title="Sizes and disabled">
        <View className="flex-row flex-wrap items-center gap-4">
          {(["icon-xs", "icon-sm", "icon", "icon-lg"] as const).map((size) => (
            <ThemeToggle
              key={size}
              theme={resolvedTheme}
              onThemeChange={setTheme}
              accessibilityLabel={`Toggle theme: ${size} size`}
              size={size}
              buttonVariant="outline"
            />
          ))}
          <ThemeToggle
            theme={resolvedTheme}
            onThemeChange={setTheme}
            accessibilityLabel="Theme switching disabled"
            disabled
          />
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { ThemeToggleExample }
