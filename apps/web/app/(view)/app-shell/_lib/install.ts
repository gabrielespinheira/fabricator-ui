// The CLI commands the setup cards show: what installs the selected settings
// and what installs the shell with its selected options.

import type { SiteIconLibrary, SiteSettings } from "@/lib/site-settings"
import type { AppShellWindow } from "@/styles/base-fabricator/ui/app-shell"
import {
  buildSetupCommands,
  CLI,
  DEFAULT_SETUP,
  forPackageManager,
  type PackageManager,
} from "@/app/(app)/(create)/lib/setup"

import { buildAppShellInstallUrl } from "./app-shell-source"
import type { PlaygroundOptions, WINDOWS } from "./options"

type CommandContext = {
  siteUrl: string
  packageManager: PackageManager
  /** The site's Icons setting. */
  iconLibrary?: SiteIconLibrary
}

/**
 * Installs the shell with these choices. Naming `app-shell` as well as the URL
 * makes the CLI add the `@fabricator` registry the URL's dependencies need.
 */
export function buildAppShellCommand(
  options: PlaygroundOptions,
  { siteUrl, packageManager, iconLibrary }: CommandContext
) {
  const url = buildAppShellInstallUrl(options, siteUrl, iconLibrary)
  return forPackageManager(`${CLI} add app-shell "${url}"`, packageManager)
}

/** Sets a project up with these settings: the look, the icons and the sounds. */
export function buildSettingsCommands(
  settings: SiteSettings,
  context: CommandContext
) {
  return buildSetupCommands(
    {
      ...DEFAULT_SETUP,
      appShell: false,
      project: "existing",
      sound: settings.sound,
      iconLibrary: settings.iconLibrary,
      look: {
        surface: settings.surface,
        colors: settings.colors,
        radius: settings.radius,
        motion: settings.motion,
        density: settings.density,
      },
    },
    context
  )
    .filter((command) => command.language === "bash")
    .map((command) => command.code)
}

/** The Window option a real window stands for. */
export function getWindowOption(
  shellWindow: AppShellWindow | undefined
): (typeof WINDOWS)[number] {
  if (shellWindow?.controls === "macos") return "macos"
  if (shellWindow?.controls === "overlay") return "windows"
  return "web"
}
