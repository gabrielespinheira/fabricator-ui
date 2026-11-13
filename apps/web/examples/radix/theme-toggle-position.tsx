"use client"

import { useTheme } from "next-themes"

import { ThemeToggle } from "@/styles/radix-fabricator/ui/theme-toggle"

const POSITIONS = [
  { label: "top left", className: "absolute top-4 left-4" },
  { label: "top right", className: "absolute top-4 right-4" },
  { label: "bottom left", className: "absolute bottom-4 left-4" },
  { label: "bottom right", className: "absolute bottom-4 right-4" },
  {
    label: "center",
    className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
]

export function ThemeTogglePosition() {
  const { resolvedTheme, setTheme } = useTheme()
  const theme =
    resolvedTheme === "light" || resolvedTheme === "dark"
      ? resolvedTheme
      : undefined
  return (
    <div className="relative h-72 w-full">
      {POSITIONS.map(({ label, className }) => (
        <ThemeToggle
          key={label}
          theme={theme}
          onThemeChange={setTheme}
          buttonVariant="outline"
          className={className}
          aria-label={`Reveal from the ${label} button`}
        />
      ))}
    </div>
  )
}
