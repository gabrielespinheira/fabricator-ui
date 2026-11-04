"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import {
  getAppearanceSetter,
  getDesktopWindow,
  getTrafficLightsSetter,
  isFullscreenWindow,
  readDesktopRuntime,
} from "./desktop"

function subscribeToResize(onChange: () => void) {
  window.addEventListener("resize", onChange)
  return () => window.removeEventListener("resize", onChange)
}

function readFullscreen() {
  return isFullscreenWindow({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  })
}

/**
 * The shell hosting the page and the window it gives the App Shell. Runs in
 * the browser only (the explorer renders without SSR). A translucent window
 * needs a transparent page, so the native glass shows through; Electron's
 * glass also takes the page's theme, and its lights follow the layout.
 */
export function useDesktopWindow({ hasTitlebar }: { hasTitlebar: boolean }) {
  const [host] = React.useState(() =>
    readDesktopRuntime(window, navigator.userAgent)
  )
  const isFullscreen = React.useSyncExternalStore(
    subscribeToResize,
    readFullscreen,
    () => false
  )
  const shellWindow = getDesktopWindow({ ...host, isFullscreen, hasTitlebar })
  const { resolvedTheme } = useTheme()

  const isTranslucent = shellWindow?.isTranslucent ?? false
  React.useEffect(() => {
    if (!isTranslucent) return
    const { documentElement, body } = document
    documentElement.style.background = "transparent"
    body.style.background = "transparent"
    return () => {
      documentElement.style.background = ""
      body.style.background = ""
    }
  }, [isTranslucent])

  React.useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return
    getAppearanceSetter(window)?.(resolvedTheme)
  }, [resolvedTheme])

  const lightsX = shellWindow?.trafficLights?.x
  const lightsY = shellWindow?.trafficLights?.y
  React.useEffect(() => {
    if (lightsX === undefined || lightsY === undefined) return
    getTrafficLightsSetter(window)?.({ x: lightsX, y: lightsY })
  }, [lightsX, lightsY])

  return { host, shellWindow }
}
