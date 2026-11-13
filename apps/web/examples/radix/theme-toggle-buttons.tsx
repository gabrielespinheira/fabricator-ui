"use client"

import { useTheme } from "next-themes"

import { ThemeToggle } from "@/styles/radix-fabricator/ui/theme-toggle"

export function ThemeToggleButtons() {
  const { resolvedTheme, setTheme } = useTheme()
  const theme =
    resolvedTheme === "dark" || resolvedTheme === "light"
      ? resolvedTheme
      : undefined
  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="flex items-center gap-4">
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
            theme={theme}
            onThemeChange={setTheme}
            variant="circle-blur"
            buttonVariant={buttonVariant}
            aria-label={`${buttonVariant} theme button`}
          />
        ))}
      </div>
      <div className="flex items-center gap-4">
        {(["icon-xs", "icon-sm", "icon", "icon-lg"] as const).map((size) => (
          <ThemeToggle
            key={size}
            theme={theme}
            onThemeChange={setTheme}
            size={size}
            buttonVariant="outline"
            aria-label={`${size} theme button`}
          />
        ))}
        <ThemeToggle
          theme={theme}
          onThemeChange={setTheme}
          disabled
          buttonVariant="outline"
          aria-label="Theme switching disabled"
        />
      </div>
    </div>
  )
}
