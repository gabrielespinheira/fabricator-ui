"use client"

import * as React from "react"
import Link from "next/link"

import {
  LayersIcon,
  MonitorIcon,
  RotateCcwIcon,
  SmartphoneIcon,
} from "@/lib/site-icons"
import { useSiteSetting, useSiteSettings } from "@/lib/site-settings"
import { usePackageManager } from "@/hooks/use-package-manager"
import {
  Segmented,
  SettingRow,
  SiteSettingsFields,
} from "@/components/fabricator/site-settings"
import { getFabricatorSiteUrl } from "@/registry/fabricator"
import {
  getShellOptionSections,
  getShellPlatform,
  splitShellOptionGroups,
  type ShellOptionGroup,
  type ShellOptionKey,
  type ShellOptionRow,
  type ShellOptionSection,
  type ShellPlatform,
  type ShellProject,
} from "@/registry/fabricator/app-shell-options"
import { useAppShell } from "@/styles/base-fabricator/ui/app-shell"
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
  PLAYGROUND_HIDDEN_OPTIONS,
  PLAYGROUND_PROJECT,
  type PlaygroundOptions,
} from "../_lib/options"
import { CardInstall } from "./cli-command"

type SetOptions = (options: Partial<PlaygroundOptions> | null) => void

const SECTION_ICONS = {
  all: LayersIcon,
  desktop: MonitorIcon,
  mobile: SmartphoneIcon,
} as const

function OptionChoice({
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
  value: string
  choices: ReadonlyArray<{ value: string; label: string }>
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <SettingRow label={label} note={note} isDisabled={disabled}>
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
    <SettingRow label={label} note={note} htmlFor={id} isDisabled={disabled}>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </SettingRow>
  )
}

function OptionRow({
  row,
  options,
  setOptions,
}: {
  row: ShellOptionRow
  options: PlaygroundOptions
  setOptions: SetOptions
}) {
  if (row.kind === "switch") {
    return (
      <OptionSwitch
        label={row.label}
        note={row.note}
        checked={options[row.key]}
        disabled={row.isDisabled}
        onChange={(checked) => setOptions({ [row.key]: checked })}
      />
    )
  }
  return (
    <OptionChoice
      label={row.label}
      note={row.note}
      value={options[row.key]}
      choices={row.choices}
      disabled={row.isDisabled}
      onChange={(value) => setOptions({ [row.key]: value })}
    />
  )
}

function OptionGroup({
  group,
  options,
  setOptions,
}: {
  group: ShellOptionGroup
  options: PlaygroundOptions
  setOptions: SetOptions
}) {
  return (
    <section aria-label={group.title} className="flex flex-col">
      <h3 className="pb-1 text-xs font-medium text-foreground">
        {group.title}
      </h3>
      {group.rows.map((row) => (
        <OptionRow
          key={row.key}
          row={row}
          options={options}
          setOptions={setOptions}
        />
      ))}
    </section>
  )
}

/** One platform's options: its name and reach, then its groups in up to two columns. */
function OptionSection({
  section,
  options,
  setOptions,
}: {
  section: ShellOptionSection
  options: PlaygroundOptions
  setOptions: SetOptions
}) {
  const Icon = SECTION_ICONS[section.id]
  const columns = splitShellOptionGroups(section.groups)
  return (
    <section
      aria-label={section.title}
      className="flex flex-col gap-4 not-first:border-t not-first:pt-5 not-last:pb-5"
    >
      <header className="flex items-start gap-2.5">
        <Icon
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />
        <div className="flex min-w-0 flex-col">
          <h2 className="text-sm font-medium text-foreground">
            {section.title}
          </h2>
          <p className="text-xs text-muted-foreground">{section.description}</p>
        </div>
      </header>
      <div className="grid items-start gap-x-10 gap-y-4 @xl:grid-cols-2">
        {columns.map((groups, index) =>
          groups.length > 0 ? (
            <div key={index} className="flex flex-col gap-4">
              {groups.map((group) => (
                <OptionGroup
                  key={group.title}
                  group={group}
                  options={options}
                  setOptions={setOptions}
                />
              ))}
            </div>
          ) : null
        )}
      </div>
    </section>
  )
}

/** The options: what applies everywhere, then each kind of screen, or `platform`'s. */
export function AppShellOptionFields({
  options,
  setOptions,
  project,
  hidden,
  platform,
  notes,
}: {
  options: PlaygroundOptions
  setOptions: SetOptions
  project: ShellProject
  /** Options this shell can't honour. */
  hidden: ReadonlySet<ShellOptionKey>
  /** Shows only what this platform can preview. Left out, every section. */
  platform?: ShellPlatform
  /** Where an option applies, when it isn't everywhere. */
  notes?: Partial<Record<ShellOptionKey, string>>
}) {
  const sections = getShellOptionSections({
    options,
    project,
    hidden,
    platform,
    notes,
  })
  return (
    <div className="flex flex-col">
      {sections.map((section) => (
        <OptionSection
          key={section.id}
          section={section}
          options={options}
          setOptions={setOptions}
        />
      ))}
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
  hidden = PLAYGROUND_HIDDEN_OPTIONS,
  installOptions = options,
}: {
  options: PlaygroundOptions
  setOptions: SetOptions
  /** What Reset goes back to, and what counts as changed. */
  defaults?: PlaygroundOptions
  /** Options this shell can't honour. */
  hidden?: ReadonlySet<ShellOptionKey>
  /** The choices to install, where the shell decides some of them itself. */
  installOptions?: PlaygroundOptions
}) {
  const { packageManager } = usePackageManager()
  const [iconLibrary] = useSiteSetting("iconLibrary")
  const { size } = useAppShell()
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
          project={PLAYGROUND_PROJECT}
          hidden={hidden}
          platform={getShellPlatform({ isPhone: size === "phone" })}
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
  hidden?: ReadonlySet<ShellOptionKey>
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
