"use client"

import * as React from "react"
import { cn } from "cn"
import { flushSync } from "react-dom"

import type {
  ThemeToggleStart,
  ThemeToggleTheme,
  ThemeToggleVariant,
} from "@/registry/bases/__base__/lib/theme-toggle-model"
import { runThemeTransition } from "@/registry/bases/__base__/lib/theme-transition"
import { Button } from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type ThemeToggleOptions = {
  /** The app's resolved theme; undefined while the provider is mounting. */
  theme: ThemeToggleTheme | undefined
  onThemeChange: (theme: ThemeToggleTheme) => void
  variant?: ThemeToggleVariant
  start?: ThemeToggleStart
}

const subscribe = () => () => {}
const getMounted = () => true
const getServerMounted = () => false

function useThemeToggle({
  theme,
  onThemeChange,
  variant = "circle-blur",
  start = "trigger",
}: ThemeToggleOptions) {
  const mounted = React.useSyncExternalStore(
    subscribe,
    getMounted,
    getServerMounted
  )
  const latest = React.useRef(theme)
  React.useEffect(() => {
    latest.current = theme
  }, [theme])
  const toggle = (element?: Element) => {
    if (!mounted || latest.current === undefined) return
    const next = latest.current === "dark" ? "light" : "dark"
    latest.current = next
    runThemeTransition({
      variant,
      start,
      element,
      update: () => flushSync(() => onThemeChange(next)),
    })
  }
  return { isDark: mounted && theme === "dark", mounted, toggle }
}

type ThemeToggleProps = Omit<
  React.ComponentProps<typeof Button>,
  "variant" | "children"
> &
  ThemeToggleOptions & {
    disabled?: boolean
    buttonVariant?: React.ComponentProps<typeof Button>["variant"]
    labels?: { switchToLight?: string; switchToDark?: string }
  }

function ThemeToggle({
  theme,
  onThemeChange,
  variant = "circle-blur",
  start = "trigger",
  buttonVariant = "ghost",
  size = "icon",
  labels,
  className,
  disabled,
  onClick,
  ...props
}: ThemeToggleProps) {
  const { isDark, mounted, toggle } = useThemeToggle({
    theme,
    onThemeChange,
    variant,
    start,
  })
  return (
    <Button
      {...props}
      data-slot="theme-toggle"
      data-theme={isDark ? "dark" : "light"}
      data-ready={mounted && theme !== undefined}
      type="button"
      variant={buttonVariant}
      size={size}
      disabled={disabled || !mounted || theme === undefined}
      aria-label={
        props["aria-label"] ??
        (isDark
          ? (labels?.switchToLight ?? "Switch to light theme")
          : (labels?.switchToDark ?? "Switch to dark theme"))
      }
      data-sound="tick"
      className={cn("group/theme-toggle", className)}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || disabled) return
        toggle(event.currentTarget)
      }}
    >
      <span
        data-slot="theme-toggle-icon"
        aria-hidden="true"
        className="cn-theme-toggle-icon relative inline-grid shrink-0 place-items-center"
      >
        <span
          data-slot="theme-toggle-sun"
          className="cn-theme-toggle-sun col-start-1 row-start-1 inline-flex"
        >
          <IconPlaceholder
            lucide="SunIcon"
            tabler="IconSun"
            hugeicons="Sun03Icon"
            phosphor="SunIcon"
            remixicon="RiSunLine"
          />
        </span>
        <span
          data-slot="theme-toggle-moon"
          className="cn-theme-toggle-moon col-start-1 row-start-1 inline-flex"
        >
          <IconPlaceholder
            lucide="MoonIcon"
            tabler="IconMoon"
            hugeicons="Moon02Icon"
            phosphor="MoonIcon"
            remixicon="RiMoonLine"
          />
        </span>
      </span>
    </Button>
  )
}

export {
  ThemeToggle,
  useThemeToggle,
  type ThemeToggleOptions,
  type ThemeToggleProps,
  type ThemeToggleStart,
  type ThemeToggleTheme,
  type ThemeToggleVariant,
}
