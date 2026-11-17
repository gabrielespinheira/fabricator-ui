import { useEffect, useSyncExternalStore } from "react"

import {
  getKeyboardInset,
  parseExplorerRoute,
  writeExplorerRoute,
} from "./explorer-model"

const routeStorageKey = "fabricator.tauri-mobile.route"

const subscribeHash = (listener: () => void) => {
  window.addEventListener("hashchange", listener)
  return () => window.removeEventListener("hashchange", listener)
}

export function useExplorerRoute() {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "#/"
  )
  useEffect(() => {
    if (window.location.hash) return
    const saved = localStorage.getItem(routeStorageKey)
    if (saved)
      window.location.replace(writeExplorerRoute(parseExplorerRoute(saved)))
  }, [])
  useEffect(() => {
    if (hash)
      localStorage.setItem(
        routeStorageKey,
        writeExplorerRoute(parseExplorerRoute(hash))
      )
  }, [hash])
  return parseExplorerRoute(hash)
}

export function useMobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport
    const update = () => {
      const height = viewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty(
        "--mobile-viewport-height",
        `${height}px`
      )
      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${getKeyboardInset(window.innerHeight, height, viewport?.offsetTop ?? 0)}px`
      )
    }
    update()
    viewport?.addEventListener("resize", update)
    viewport?.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    return () => {
      viewport?.removeEventListener("resize", update)
      viewport?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])
}
