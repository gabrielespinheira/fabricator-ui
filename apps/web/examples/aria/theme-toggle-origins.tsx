"use client"

import { useTheme } from "next-themes"

import { THEME_TOGGLE_STARTS } from "@/styles/aria-fabricator/lib/theme-toggle-model"
import { ThemeToggle } from "@/styles/aria-fabricator/ui/theme-toggle"

export function ThemeToggleOrigins() {
  const { resolvedTheme, setTheme } = useTheme()
  const theme =
    resolvedTheme === "dark" || resolvedTheme === "light"
      ? resolvedTheme
      : undefined
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-6 py-6 sm:grid-cols-3">
      {THEME_TOGGLE_STARTS.map((start) => (
        <div key={start} className="flex flex-col items-center gap-3">
          <ThemeToggle
            theme={theme}
            onThemeChange={setTheme}
            variant="circle-blur"
            start={start}
            buttonVariant="secondary"
            aria-label={`Reveal from ${start.replaceAll("-", " ")}`}
          />
          <span className="text-xs text-muted-foreground capitalize">
            {start.replaceAll("-", " ")}
          </span>
        </div>
      ))}
    </div>
  )
}
