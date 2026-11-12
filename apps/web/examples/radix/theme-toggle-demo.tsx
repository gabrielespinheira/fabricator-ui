"use client"

import { useTheme } from "next-themes"

import { THEME_TOGGLE_VARIANTS } from "@/styles/radix-fabricator/lib/theme-toggle-model"
import { ThemeToggle } from "@/styles/radix-fabricator/ui/theme-toggle"

export function ThemeToggleDemo() {
  const { resolvedTheme, setTheme } = useTheme()
  const theme =
    resolvedTheme === "dark" || resolvedTheme === "light"
      ? resolvedTheme
      : undefined
  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-6 py-6 sm:grid-cols-4">
      {THEME_TOGGLE_VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-col items-center gap-3">
          <ThemeToggle
            theme={theme}
            onThemeChange={setTheme}
            variant={variant}
            buttonVariant="outline"
            aria-label={`Try ${variant.replaceAll("-", " ")} reveal`}
          />
          <span className="text-xs text-muted-foreground capitalize">
            {variant.replaceAll("-", " ")}
          </span>
        </div>
      ))}
    </div>
  )
}
