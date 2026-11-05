import { RotateCcwIcon, ShareIcon } from "@fabricator-ui/icons-react-native"
import { Share, View } from "react-native"

import { Badge } from "@/registry/native/ui/badge"
import { Button } from "@/registry/native/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/native/ui/card"
import { DensityScope } from "@/registry/native/ui/density"
import { Switch } from "@/registry/native/ui/switch"
import { Text } from "@/registry/native/ui/text"

import {
  buildInstallCommand,
  countChangedOptions,
  getDefaultShellOptions,
  getOptionNotes,
  getTabBarStyleChoices,
  type ShellOptions,
} from "./shell-options-model"
import { hasLiquidGlass } from "./shell/glass"
import { SegmentedControl } from "./shell/segmented-control"

export type { ShellOptions } from "./shell-options-model"

export const DEFAULT_SHELL_OPTIONS = getDefaultShellOptions({
  hasGlass: hasLiquidGlass(),
})

const GLASS_NOTE =
  "Glass needs iOS 26 and a build with its module: bun run mobile."

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View>
      <Text
        role="heading"
        className="pb-1 text-(length:--density-text-12) font-medium text-foreground"
      >
        {title}
      </Text>
      {children}
    </View>
  )
}

function OptionRow({
  label,
  note,
  isDisabled,
  children,
}: {
  label: string
  note?: string
  isDisabled: boolean
  children: React.ReactNode
}) {
  return (
    <View className="min-h-10 flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1">
      <View className="max-w-full shrink gap-0.5">
        <Text
          className={
            isDisabled
              ? "text-(length:--density-text-13) text-muted-foreground/60"
              : "text-(length:--density-text-13) text-muted-foreground"
          }
        >
          {label}
        </Text>
        {note ? (
          <Text className="text-(length:--density-text-11) text-muted-foreground/60">
            {note}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  )
}

/** One of a few, as labels on the tab track. */
function OptionChoice<Value extends string>({
  label,
  note,
  value,
  choices,
  disabled = false,
  onChange,
}: {
  label: string
  note?: string
  value: Value
  choices: readonly { value: Value; label: string; disabled?: boolean }[]
  disabled?: boolean
  onChange: (value: Value) => void
}) {
  return (
    <OptionRow label={label} note={note} isDisabled={disabled}>
      <DensityScope density="compact">
        <SegmentedControl
          label={label}
          options={choices}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      </DensityScope>
    </OptionRow>
  )
}

function OptionSwitch({
  label,
  note,
  value,
  disabled = false,
  onChange,
}: {
  label: string
  note?: string
  value: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <OptionRow label={label} note={note} isDisabled={disabled}>
      <Switch
        accessibilityLabel={label}
        checked={value}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </OptionRow>
  )
}

/** What installs these choices. The share sheet has Copy. */
function InstallCommand({ options }: { options: ShellOptions }) {
  const command = buildInstallCommand(options)
  return (
    <CardFooter className="flex-col items-stretch gap-2 border-t border-border pt-4">
      <Text
        role="heading"
        className="text-(length:--density-text-12) font-medium text-foreground"
      >
        Install with the CLI
      </Text>
      <View className="flex-row items-start gap-2 rounded-lg bg-foreground/5 py-2 pr-1 pl-3">
        <Text
          selectable
          className="flex-1 font-mono text-(length:--density-text-11) text-foreground"
        >
          {command}
        </Text>
        <Button
          variant="ghost"
          size="icon-sm"
          accessibilityLabel="Share the install command"
          onPress={() => void Share.share({ message: command })}
        >
          <ShareIcon />
        </Button>
      </View>
      <Text className="text-(length:--density-text-12) text-muted-foreground">
        Writes components/app-shell-layout.tsx with these choices.
      </Text>
    </CardFooter>
  )
}

/**
 * The website's App Shell card: the same rows in the same order. A row that
 * can't show its effect on this device stays, disabled, and says where it applies.
 */
export function ShellOptionsCard({
  options,
  onChange,
  isPhone,
  className,
}: {
  options: ShellOptions
  onChange: (options: ShellOptions) => void
  isPhone: boolean
  className?: string
}) {
  const change = (next: Partial<ShellOptions>) =>
    onChange({ ...options, ...next })
  const changed = countChangedOptions(options, DEFAULT_SHELL_OPTIONS)
  const notes = getOptionNotes({ isPhone })
  const hasGlass = hasLiquidGlass()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>App Shell</CardTitle>
        <CardDescription>How the shell is laid out.</CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={changed === 0}
            onPress={() => onChange(DEFAULT_SHELL_OPTIONS)}
            accessibilityLabel={
              changed > 0
                ? `Reset ${changed} changed ${changed === 1 ? "option" : "options"}`
                : "Reset"
            }
          >
            <RotateCcwIcon />
            Reset
            {changed > 0 ? <Badge variant="secondary">{changed}</Badge> : null}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="gap-6">
        <Section title="Sidebar">
          <OptionChoice
            label="Style"
            note={notes.variant}
            disabled={notes.variant !== undefined}
            value={options.variant}
            choices={[
              { value: "inset", label: "Inset" },
              { value: "sidebar", label: "Flush" },
              { value: "floating", label: "Floating" },
            ]}
            onChange={(variant) => change({ variant })}
          />
          <OptionChoice
            label="Collapse"
            note={notes.collapse}
            disabled={notes.collapse !== undefined}
            value={options.collapse}
            choices={[
              { value: "icon", label: "Icons" },
              { value: "offcanvas", label: "Hide" },
              { value: "none", label: "Never" },
            ]}
            onChange={(collapse) => change({ collapse })}
          />
          <OptionChoice
            label="On phones"
            note={notes.mobileSidebar}
            disabled={notes.mobileSidebar !== undefined}
            value={options.mobileSidebar}
            choices={[
              { value: "reveal", label: "Reveal" },
              { value: "sheet", label: "Sheet" },
            ]}
            onChange={(mobileSidebar) => change({ mobileSidebar })}
          />
          <OptionChoice
            label="Workspaces"
            value={options.switcher}
            choices={[
              { value: "menu", label: "Menu" },
              { value: "command", label: "Search" },
              { value: "none", label: "None" },
            ]}
            onChange={(switcher) => change({ switcher })}
          />
          <OptionChoice
            label="Account"
            value={options.account}
            choices={[
              { value: "footer", label: "Bottom" },
              { value: "header", label: "Top" },
              { value: "none", label: "None" },
            ]}
            onChange={(account) => change({ account })}
          />
          <OptionSwitch
            label="Drag to reorder"
            value={options.reorder}
            onChange={(reorder) => change({ reorder })}
          />
          <OptionSwitch
            label="Pin, hide and customize"
            value={options.customize}
            onChange={(customize) => change({ customize })}
          />
        </Section>
        <Section title="Main">
          <OptionChoice
            label="Tabs"
            value={options.tabs}
            choices={[
              { value: "none", label: "None" },
              { value: "main", label: "Page" },
            ]}
            onChange={(tabs) => change({ tabs })}
          />
          <OptionChoice
            label="Content width"
            note={notes.contentSize}
            disabled={notes.contentSize !== undefined}
            value={options.contentSize}
            choices={[
              { value: "sm", label: "Narrow" },
              { value: "md", label: "Default" },
              { value: "lg", label: "Wide" },
            ]}
            onChange={(contentSize) => change({ contentSize })}
          />
          <OptionSwitch
            label="Breadcrumb"
            value={options.breadcrumb}
            onChange={(breadcrumb) => change({ breadcrumb })}
          />
          <OptionSwitch
            label="Header actions"
            note={notes.actions}
            disabled={notes.actions !== undefined}
            value={options.actions}
            onChange={(actions) => change({ actions })}
          />
          <OptionSwitch
            label="Status bar"
            note={notes.status}
            disabled={notes.status !== undefined}
            value={options.status}
            onChange={(status) => change({ status })}
          />
          <OptionSwitch
            label="Tab bar on phones"
            note={notes.bottomNav}
            disabled={notes.bottomNav !== undefined}
            value={options.bottomNav}
            onChange={(bottomNav) => change({ bottomNav })}
          />
          <OptionChoice
            label="Tab bar style"
            note={notes.bottomNavStyle ?? (hasGlass ? undefined : GLASS_NOTE)}
            disabled={notes.bottomNavStyle !== undefined || !options.bottomNav}
            value={options.bottomNavStyle}
            choices={getTabBarStyleChoices({ hasGlass })}
            onChange={(bottomNavStyle) => change({ bottomNavStyle })}
          />
        </Section>
        <Section title="Right panel">
          <OptionSwitch
            label="Panel"
            value={options.panel}
            onChange={(panel) => change({ panel })}
          />
          <OptionChoice
            label="On phones"
            note={notes.panelMobile}
            disabled={notes.panelMobile !== undefined || !options.panel}
            value={options.panelMobile}
            choices={[
              { value: "drawer", label: "Drawer" },
              { value: "swap", label: "Screen" },
              { value: "none", label: "None" },
            ]}
            onChange={(panelMobile) => change({ panelMobile })}
          />
        </Section>
      </CardContent>
      <InstallCommand options={options} />
    </Card>
  )
}
