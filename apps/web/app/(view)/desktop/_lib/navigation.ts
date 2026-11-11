import { isNewTab } from "@/lib/component-explorer"
import {
  openTab,
  type OpenTabOptions,
  type TabStripState,
} from "@/registry/fabricator/shared/lib/app-shell-model"

export function getDesktopTabId(pathname: string) {
  if (pathname === "/desktop") return "overview"
  if (pathname === "/desktop/icons") return "icons"
  const component = /^\/desktop\/components\/([^/]+)$/.exec(pathname)
  if (component) return component[1] ?? null
  const blank = /^\/desktop\/new\/(new-\d+)$/.exec(pathname)
  return blank?.[1] ?? null
}

export function getDesktopHref(id: string | null, search = "") {
  const pathname =
    !id || id === "overview"
      ? "/desktop"
      : id === "icons"
        ? "/desktop/icons"
        : isNewTab(id)
          ? `/desktop/new/${id}`
          : `/desktop/components/${id}`
  return search ? `${pathname}?${search}` : pathname
}

export function createDesktopTabs(id: string): TabStripState {
  return openDesktopTab(
    {
      tabs: ["button"],
      pinned: [],
      recent: ["button"],
      preview: null,
      closed: [],
    },
    id
  )
}

export function openDesktopTab(
  state: TabStripState,
  id: string,
  options?: OpenTabOptions
) {
  return id === "overview" ? state : openTab(state, id, options)
}

export function getDesktopLink(href: string, search: string) {
  const component = /^\/docs\/components\/base\/([^?#/]+)(#[^?]*)?$/.exec(href)
  if (!component?.[1]) return href
  return `${getDesktopHref(component[1], search)}${component[2] ?? ""}`
}
