"use client"

import * as React from "react"
import Link from "next/link"

import { RotateCcwIcon } from "@/lib/site-icons"
import { useSiteSetting, useSiteSettings } from "@/lib/site-settings"
import { usePackageManager } from "@/hooks/use-package-manager"
import {
  Segmented,
  SettingRow,
  SiteSettingsFields,
} from "@/components/fabricator/site-settings"
import { getFabricatorSiteUrl } from "@/registry/fabricator"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import { Switch } from "@/styles/base-fabricator/ui/switch"

import { buildAppShellCommand, buildSettingsCommands } from "../_lib/install"
import {
  countChangedOptions,
  DEFAULT_PLAYGROUND_OPTIONS,
  isPeekAvailable,
  SIDEBAR_COLLAPSE_CHOICES,
  SIDEBAR_VARIANT_CHOICES,
  TAB_PLACEMENT_CHOICES,
  type PlaygroundOptions,
} from "../_lib/options"
import { CardInstall } from "./cli-command"

type SetOptions = (options: Partial<PlaygroundOptions> | null) => void

function OptionChoice<T extends string>({
  label,
  note,
  value,
  choices,
  disabled = false,
  onChange,
}: {
  label: string
  /** Where the option applies, when it isn't everywhere. */
  note?: string
  value: T
  choices: ReadonlyArray<{ value: T; label: string }>
  disabled?: boolean
  onChange: (value: T) => void
}) {
  return (
    <SettingRow label={label} note={note}>
      <Segmented
        label={label}
        value={value}
        options={choices}
        disabled={disabled}
        onValueChange={onChange}
      />
    </SettingRow>
  )
}

export function OptionSwitch({
  label,
  note,
  checked,
  disabled = false,
  onChange,
}: {
  label: string
  note?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  const id = React.useId()
  return (
    <SettingRow label={label} note={note} htmlFor={id}>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </SettingRow>
  )
}

function OptionSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col">
      <h2 className="pb-1 text-xs font-medium text-foreground">{title}</h2>
      {children}
    </section>
  )
}

/** Every option, in two columns once their container has room. */
export function AppShellOptionFields({
  options,
  setOptions,
  hidden,
  notes,
  tabChoices = TAB_PLACEMENT_CHOICES,
}: {
  options: PlaygroundOptions
  setOptions: SetOptions
  /** Options this shell can't honour. */
  hidden?: ReadonlySet<keyof PlaygroundOptions>
  /** Where an option applies, when it isn't everywhere. */
  notes?: Partial<Record<keyof PlaygroundOptions, string>>
  tabChoices?: ReadonlyArray<(typeof TAB_PLACEMENT_CHOICES)[number]>
}) {
  const isShown = (option: keyof PlaygroundOptions) => !hidden?.has(option)
  // Without a choice of runtime, the real window decides what applies.
  const isWindowOff = isShown("window") && options.window === "web"

  return (
    <div className="grid items-start gap-x-10 gap-y-6 @xl:grid-cols-2">
      <OptionSection title="Sidebar">
        <OptionChoice
          label="Style"
          value={options.variant}
          choices={SIDEBAR_VARIANT_CHOICES}
          onChange={(variant) => setOptions({ variant })}
        />
        <OptionChoice
          label="Collapse"
          value={options.collapse}
          choices={SIDEBAR_COLLAPSE_CHOICES}
          onChange={(collapse) => setOptions({ collapse })}
        />
        {isShown("peek") && (
          <OptionChoice
            label="Peek"
            note={notes?.peek}
            value={options.peek}
            disabled={!isPeekAvailable(options)}
            choices={[
              { value: "none", label: "Off" },
              { value: "hover", label: "Hover" },
              { value: "click", label: "Click" },
            ]}
            onChange={(peek) => setOptions({ peek })}
          />
        )}
        <OptionChoice
          label="On phones"
          value={options.mobileSidebar}
          choices={[
            { value: "reveal", label: "Reveal" },
            { value: "sheet", label: "Sheet" },
          ]}
          onChange={(mobileSidebar) => setOptions({ mobileSidebar })}
        />
        <OptionChoice
          label="Workspaces"
          value={options.switcher}
          choices={[
            { value: "menu", label: "Menu" },
            { value: "command", label: "Search" },
            { value: "none", label: "None" },
          ]}
          onChange={(switcher) => setOptions({ switcher })}
        />
        <OptionChoice
          label="Account"
          value={options.account}
          choices={[
            { value: "footer", label: "Bottom" },
            { value: "header", label: "Top" },
            { value: "none", label: "None" },
          ]}
          onChange={(account) => setOptions({ account })}
        />
        <OptionSwitch
          label="Drag to reorder"
          checked={options.reorder}
          onChange={(reorder) => setOptions({ reorder })}
        />
        <OptionSwitch
          label="Pin, hide and customize"
          checked={options.customize}
          onChange={(customize) => setOptions({ customize })}
        />
      </OptionSection>
      <div className="flex flex-col gap-6">
        <OptionSection title="Main">
          <OptionChoice
            label="Tabs"
            value={options.tabs}
            choices={tabChoices}
            onChange={(tabs) => setOptions({ tabs })}
          />
          <OptionChoice
            label="Content width"
            value={options.contentSize}
            choices={[
              { value: "sm", label: "Narrow" },
              { value: "md", label: "Default" },
              { value: "lg", label: "Wide" },
            ]}
            onChange={(contentSize) => setOptions({ contentSize })}
          />
          <OptionSwitch
            label="Breadcrumb"
            checked={options.breadcrumb}
            onChange={(breadcrumb) => setOptions({ breadcrumb })}
          />
          <OptionSwitch
            label="Header actions"
            checked={options.actions}
            onChange={(actions) => setOptions({ actions })}
          />
          <OptionSwitch
            label="Status bar"
            checked={options.status}
            onChange={(status) => setOptions({ status })}
          />
          {isShown("bottomNav") && (
            <OptionSwitch
              label="Tab bar on phones"
              checked={options.bottomNav}
              onChange={(bottomNav) => setOptions({ bottomNav })}
            />
          )}
        </OptionSection>
        <OptionSection title="Right panel">
          <OptionSwitch
            label="Panel"
            checked={options.panel}
            onChange={(panel) => setOptions({ panel })}
          />
          <OptionChoice
            label="On phones"
            value={options.panelMobile}
            disabled={!options.panel}
            choices={[
              { value: "drawer", label: "Drawer" },
              { value: "swap", label: "Screen" },
              { value: "none", label: "None" },
            ]}
            onChange={(panelMobile) => setOptions({ panelMobile })}
          />
        </OptionSection>
        {(isShown("window") || isShown("fullscreen") || isShown("glass")) && (
          <>
            <OptionSection title="Window">
              {isShown("window") && (
                <OptionChoice
                  label="Runs in"
                  value={options.window}
                  choices={[
                    { value: "web", label: "Browser" },
                    { value: "macos", label: "macOS" },
                    { value: "windows", label: "Windows" },
                  ]}
                  onChange={(runtime) => setOptions({ window: runtime })}
                />
              )}
              {isShown("fullscreen") && (
                <OptionSwitch
                  label="Fullscreen"
                  checked={options.fullscreen}
                  disabled={isWindowOff}
                  onChange={(fullscreen) => setOptions({ fullscreen })}
                />
              )}
              {isShown("glass") && (
                <OptionSwitch
                  label="Glass sidebar"
                  note={notes?.glass}
                  checked={options.glass}
                  disabled={isWindowOff}
                  onChange={(glass) => setOptions({ glass })}
                />
              )}
            </OptionSection>
          </>
        )}
      </div>
    </div>
  )
}

/** Back to the defaults, with how many options differ from them. */
export function ResetOptionsButton({
  changed,
  onReset,
}: {
  changed: number
  onReset: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={changed === 0}
      onClick={onReset}
    >
      <RotateCcwIcon data-icon="inline-start" />
      Reset
      {changed > 0 && (
        <Badge variant="secondary" className="ms-0.5">
          {changed}
        </Badge>
      )}
    </Button>
  )
}

/** The shell's options, on a Home page. The URL keeps every choice. */
function OptionsCard({
  options,
  setOptions,
  defaults = DEFAULT_PLAYGROUND_OPTIONS,
  hidden,
  installOptions = options,
}: {
  options: PlaygroundOptions
  setOptions: SetOptions
  /** What Reset goes back to, and what counts as changed. */
  defaults?: PlaygroundOptions
  /** Options this shell can't honour. */
  hidden?: ReadonlySet<keyof PlaygroundOptions>
  /** The choices to install, where the shell decides some of them itself. */
  installOptions?: PlaygroundOptions
}) {
  const { packageManager } = usePackageManager()
  const [iconLibrary] = useSiteSetting("iconLibrary")
  const changed = countChangedOptions(options, defaults)

  return (
    <Card>
      <CardHeader>
        <CardTitle>App Shell</CardTitle>
        <CardDescription>
          How the shell is laid out. Every choice is saved in the URL.
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/docs/components/base/app-shell" />}
          >
            Docs
          </Button>
          <ResetOptionsButton
            changed={changed}
            onReset={() => setOptions(null)}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="@container">
        <AppShellOptionFields
          options={options}
          setOptions={setOptions}
          hidden={hidden}
        />
      </CardContent>
      <CardInstall
        commands={[
          buildAppShellCommand(installOptions, {
            siteUrl: getFabricatorSiteUrl(),
            packageManager,
            iconLibrary,
          }),
        ]}
      >
        Writes <code>components/app-shell-layout.tsx</code> with these choices,
        in a project set up with the command above.
      </CardInstall>
    </Card>
  )
}

/** The website's settings, and what sets a project up with them. */
function SettingsCard() {
  const settings = useSiteSettings()
  const { packageManager } = usePackageManager()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          The same settings as the website; everything here follows them.
        </CardDescription>
      </CardHeader>
      <CardContent className="@container">
        <SiteSettingsFields className="grid gap-x-10 @xl:grid-cols-2" />
      </CardContent>
      <CardInstall commands={buildSettingsCommands(settings, packageManager)}>
        Run it in your project&apos;s root: it adds the registry, applies this
        look and wires in the sounds.
      </CardInstall>
    </Card>
  )
}

/**
 * The website's settings and the shell's options, on a Home. Each card fills the
 * column and splits its rows in two once there's room, so a label stays close to
 * its control.
 */
export function SetupCards({
  options,
  setOptions,
  defaults,
  hidden,
  installOptions,
}: {
  options: PlaygroundOptions
  setOptions: SetOptions
  defaults?: PlaygroundOptions
  hidden?: ReadonlySet<keyof PlaygroundOptions>
  installOptions?: PlaygroundOptions
}) {
  return (
    <div className="flex flex-col gap-6">
      <SettingsCard />
      <OptionsCard
        options={options}
        setOptions={setOptions}
        defaults={defaults}
        hidden={hidden}
        installOptions={installOptions}
      />
    </div>
  )
}
