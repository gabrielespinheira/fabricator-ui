// The desktop example's shell options: the playground's, starting from the
// window the explorer has always been, read from and written to the URL.

import { createLoader, parseAsBoolean, parseAsStringLiteral } from "nuqs"

import { EXPLORER_DEFAULTS } from "@/lib/component-explorer"

import {
  ACCOUNT_PLACEMENTS,
  playgroundParsers,
  SWITCHER_VARIANTS,
  TAB_PLACEMENTS,
  type PlaygroundOptions,
} from "../../app-shell/_lib/options"

export const explorerParsers = {
  ...playgroundParsers,
  switcher: parseAsStringLiteral(SWITCHER_VARIANTS).withDefault(
    EXPLORER_DEFAULTS.switcher
  ),
  account: parseAsStringLiteral(ACCOUNT_PLACEMENTS).withDefault(
    EXPLORER_DEFAULTS.account
  ),
  reorder: parseAsBoolean.withDefault(EXPLORER_DEFAULTS.reorder),
  breadcrumb: parseAsBoolean.withDefault(EXPLORER_DEFAULTS.breadcrumb),
  actions: parseAsBoolean.withDefault(EXPLORER_DEFAULTS.actions),
  tabs: parseAsStringLiteral(TAB_PLACEMENTS).withDefault(
    EXPLORER_DEFAULTS.tabs
  ),
  bottomNav: parseAsBoolean.withDefault(EXPLORER_DEFAULTS.bottomNav),
}

export const DEFAULT_EXPLORER_OPTIONS: PlaygroundOptions = createLoader(
  explorerParsers
)(new URLSearchParams())

/**
 * The options this shell doesn't offer: the real window decides the runtime
 * and fullscreen (and whether there is glass at all). Bottom navigation uses
 * the web component; its material choices belong to React Native.
 */
export function getHiddenExplorerOptions({
  hasGlass,
}: {
  hasGlass: boolean
}): ReadonlySet<keyof PlaygroundOptions> {
  return new Set<keyof PlaygroundOptions>([
    "window",
    "fullscreen",
    "bottomNavStyle",
    ...(hasGlass ? [] : (["glass"] as const)),
  ])
}

/** Documentation has one routed page and no auxiliary panel. */
export function getDocsExplorerOptions(
  options: PlaygroundOptions
): PlaygroundOptions {
  return { ...options, tabs: "none", panel: false }
}

export const DEFAULT_DOCS_EXPLORER_OPTIONS = getDocsExplorerOptions(
  DEFAULT_EXPLORER_OPTIONS
)

export function getHiddenDocsExplorerOptions(): ReadonlySet<
  keyof PlaygroundOptions
> {
  return new Set<keyof PlaygroundOptions>([
    ...getHiddenExplorerOptions({ hasGlass: false }),
    "tabs",
    "panel",
    "panelMobile",
  ])
}
