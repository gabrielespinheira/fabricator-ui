"use client"

import * as React from "react"
import { flushSync } from "react-dom"

import {
  getResolvedTheme,
  getThemePreference,
  getThemePreferenceStep,
  type ThemePreference,
  type ThemeToggleStart,
  type ThemeToggleVariant,
} from "@/registry/bases/__base__/lib/theme-toggle-model"
import {
  runThemeTransition,
  slideThemeTabs,
} from "@/registry/bases/__base__/lib/theme-transition"

export type ThemePreferenceOptions = {
  /**
   * The app's theme: light, dark or system. Undefined while the provider is
   * mounting; any other value picks no tab.
   */
  theme: string | undefined
  onThemeChange: (theme: ThemePreference) => void
  /** The page reveal, as in Theme Toggle. */
  variant?: ThemeToggleVariant
  start?: ThemeToggleStart
}

const TAB = "[data-theme-preference]"

function getTab(tabs: HTMLElement, preference: ThemePreference) {
  return (
    tabs.querySelector<HTMLElement>(
      `[data-theme-preference="${preference}"]`
    ) ?? undefined
  )
}

// Left and right move between the tabs; the menu they sit in only listens for
// up and down.
function moveBetweenTabs(event: KeyboardEvent) {
  const { currentTarget, target } = event
  if (!(currentTarget instanceof HTMLElement) || !(target instanceof Element))
    return
  const tabs = Array.from(currentTarget.querySelectorAll<HTMLElement>(TAB))
  const index = tabs.findIndex((tab) => tab.contains(target))
  if (index === -1) return
  const step = getThemePreferenceStep(event.key, index)
  if (step === null) return
  event.preventDefault()
  event.stopPropagation()
  tabs[step]?.focus()
}

/**
 * Light, dark and system as a row of tabs: the pill slides to the picked one and
 * the page reveals from it. The page is only swept when its theme changes.
 */
export function useThemePreference({
  theme: appTheme,
  onThemeChange,
  variant = "circle-blur",
  start = "trigger",
}: ThemePreferenceOptions) {
  const theme =
    appTheme === undefined ? undefined : getThemePreference(appTheme)
  const tabsRef = React.useRef<HTMLElement | null>(null)
  const latest = React.useRef(theme)
  const shown = React.useRef(theme)

  React.useEffect(() => {
    latest.current = theme
  }, [theme])

  // A ref, not state: React Aria mounts the row before this component.
  const attach = React.useCallback((tabs: HTMLElement | null) => {
    tabsRef.current = tabs
    tabs?.addEventListener("keydown", moveBetweenTabs)
  }, [])

  React.useLayoutEffect(() => {
    const tabs = tabsRef.current
    const previous = shown.current
    shown.current = theme
    if (!tabs || !theme || !previous || previous === theme) return
    const to = getTab(tabs, theme)
    const from = getTab(tabs, previous)
    if (to && from) slideThemeTabs(tabs, from.offsetLeft - to.offsetLeft)
  }, [theme])

  const select = (value: string) => {
    const tabs = tabsRef.current
    const next = getThemePreference(value)
    const current = latest.current
    if (!next || next === current) return
    latest.current = next
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light"
    if (
      !tabs ||
      !current ||
      getResolvedTheme(current, systemTheme) ===
        getResolvedTheme(next, systemTheme)
    ) {
      onThemeChange(next)
      return
    }
    runThemeTransition({
      variant,
      start,
      element: getTab(tabs, next),
      layer: tabs,
      // A later pick that needs no sweep may land before this one runs.
      update: () => flushSync(() => onThemeChange(latest.current ?? next)),
    })
  }

  return { attach, select, value: theme }
}
