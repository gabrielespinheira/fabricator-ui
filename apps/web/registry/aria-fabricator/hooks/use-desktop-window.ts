"use client"

import * as React from "react"

import {
  getAppearanceSetter,
  getDesktopWindow,
  getTrafficLightsSetter,
  isFullscreenWindow,
  readDesktopRuntime,
  type DesktopHost,
} from "@/registry/aria-fabricator/lib/desktop-window"

const SERVER_HOST: DesktopHost = { runtime: "browser", platform: "linux" }

let cachedHost: DesktopHost | undefined

function readHost() {
  cachedHost ??= readDesktopRuntime(window, navigator.userAgent)
  return cachedHost
}

function subscribeToNothing() {
  return () => {}
}

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

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

function readTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

/**
 * The desktop shell hosting the page and the window it gives the App Shell.
 * `undefined` in a browser and on the server, so one layout serves both. A
 * translucent window needs a transparent page, so the native glass shows
 * through; Electron's glass also takes the page's theme, and its lights follow
 * the layout.
 */
function useDesktopWindow({
  hasTitlebar,
  isTranslucent = true,
}: {
  hasTitlebar: boolean
  isTranslucent?: boolean
}) {
  const host = React.useSyncExternalStore(
    subscribeToNothing,
    readHost,
    () => SERVER_HOST
  )
  const isFullscreen = React.useSyncExternalStore(
    subscribeToResize,
    readFullscreen,
    () => false
  )
  const theme = React.useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    () => null
  )
  const shellWindow = getDesktopWindow({
    ...host,
    isFullscreen,
    hasTitlebar,
    isTranslucent,
  })

  const isGlass = shellWindow?.isTranslucent ?? false
  React.useEffect(() => {
    if (!isGlass) return
    const { documentElement, body } = document
    documentElement.style.background = "transparent"
    body.style.background = "transparent"
    return () => {
      documentElement.style.background = ""
      body.style.background = ""
    }
  }, [isGlass])

  React.useEffect(() => {
    if (theme) getAppearanceSetter(window)?.(theme)
  }, [theme])

  const lightsX = shellWindow?.trafficLights?.x
  const lightsY = shellWindow?.trafficLights?.y
  React.useEffect(() => {
    if (lightsX === undefined || lightsY === undefined) return
    getTrafficLightsSetter(window)?.({ x: lightsX, y: lightsY })
  }, [lightsX, lightsY])

  return { host, shellWindow }
}

export { useDesktopWindow }
