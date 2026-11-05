// The desktop example's shell options: the playground's, starting from the
// window the explorer has always been, read from and written to the URL.

import { createLoader, parseAsBoolean, parseAsStringLiteral } from "nuqs"

import {
  ACCOUNT_PLACEMENTS,
  playgroundParsers,
  SWITCHER_VARIANTS,
  TAB_PLACEMENTS,
  type PlaygroundOptions,
} from "../../app-shell/_lib/options"

export const explorerParsers = {
  ...playgroundParsers,
  switcher: parseAsStringLiteral(SWITCHER_VARIANTS).withDefault("none"),
  account: parseAsStringLiteral(ACCOUNT_PLACEMENTS).withDefault("none"),
  reorder: parseAsBoolean.withDefault(false),
  breadcrumb: parseAsBoolean.withDefault(false),
  actions: parseAsBoolean.withDefault(false),
  tabs: parseAsStringLiteral(TAB_PLACEMENTS).withDefault("main"),
}

export const DEFAULT_EXPLORER_OPTIONS: PlaygroundOptions = createLoader(
  explorerParsers
)(new URLSearchParams())

/**
 * The options this shell doesn't offer: the real window decides the runtime
 * and fullscreen (and whether there is glass at all), and the explorer's
 * navigation has no tabs for a phone's tab bar, in any style.
 */
export function getHiddenExplorerOptions({
  hasGlass,
}: {
  hasGlass: boolean
}): ReadonlySet<keyof PlaygroundOptions> {
  return new Set<keyof PlaygroundOptions>([
    "window",
    "fullscreen",
    "bottomNav",
    "bottomNavStyle",
    ...(hasGlass ? [] : (["glass"] as const)),
  ])
}
