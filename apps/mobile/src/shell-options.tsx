import {
  IconProvider,
  LayersIcon,
  RotateCcwIcon,
  ShareIcon,
  SmartphoneIcon,
  TabletIcon,
} from "@fabricator-ui/icons-react-native"
import { Share, View } from "react-native"
import { useCSSVariable } from "uniwind"

import {
  getShellOptionSections,
  getShellPlatform,
  type ShellOptionGroup,
  type ShellOptionRow,
  type ShellOptionSection,
} from "@/registry/fabricator/app-shell-options"
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
import { Separator } from "@/registry/native/ui/separator"
import { Switch } from "@/registry/native/ui/switch"
import { Text } from "@/registry/native/ui/text"

import {
  buildInstallCommand,
  countChangedOptions,
  getDefaultShellOptions,
  getNativeHiddenOptions,
  getOptionNotes,
  getTabBarStyleChoices,
  NATIVE_PROJECT,
  type ShellOptions,
} from "./shell-options-model"
import { hasLiquidGlass } from "./shell/glass"
import { SegmentedControl } from "./shell/segmented-control"

export type { ShellOptions } from "./shell-options-model"

export const DEFAULT_SHELL_OPTIONS = getDefaultShellOptions({
  hasGlass: hasLiquidGlass(),
})

const SECTION_ICONS = {
  all: LayersIcon,
  desktop: TabletIcon,
  mobile: SmartphoneIcon,
} as const

type ChangeOptions = (next: Partial<ShellOptions>) => void

function OptionRowLayout({
  row,
  children,
}: {
  row: ShellOptionRow
  children: React.ReactNode
}) {
  return (
    <View className="min-h-10 flex-row items-center justify-between gap-x-3 py-1">
      {/* Takes what the control leaves, so a long note wraps instead of the row. */}
      <View className="flex-1 gap-0.5">
        <Text
          className={
            row.isDisabled
              ? "text-(length:--density-text-13) text-muted-foreground/60"
              : "text-(length:--density-text-13) text-muted-foreground"
          }
        >
          {row.label}
        </Text>
        {row.note ? (
          <Text className="text-(length:--density-text-11) text-muted-foreground">
            {row.note}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  )
}

/** A row's control: a switch, or one of a few as labels on the tab track. */
function OptionRow({
  row,
  options,
  change,
}: {
  row: ShellOptionRow
  options: ShellOptions
  change: ChangeOptions
}) {
  if (row.kind === "switch") {
    return (
      <OptionRowLayout row={row}>
        <Switch
          accessibilityLabel={row.label}
          checked={options[row.key]}
          disabled={row.isDisabled}
          onCheckedChange={(checked) => change({ [row.key]: checked })}
        />
      </OptionRowLayout>
    )
  }
  return (
    <OptionRowLayout row={row}>
      <SegmentedControl
        label={row.label}
        options={
          row.key === "bottomNavStyle"
            ? getTabBarStyleChoices({ hasGlass: hasLiquidGlass() })
            : row.choices
        }
        value={options[row.key]}
        disabled={row.isDisabled}
        onChange={(value) => change({ [row.key]: value })}
      />
    </OptionRowLayout>
  )
}

function OptionGroup({
  group,
  options,
  change,
}: {
  group: ShellOptionGroup
  options: ShellOptions
  change: ChangeOptions
}) {
  return (
    <View>
      <Text
        role="heading"
        className="pb-1 text-(length:--density-text-12) font-medium text-foreground"
      >
        {group.title}
      </Text>
      {group.rows.map((row) => (
        <OptionRow key={row.key} row={row} options={options} change={change} />
      ))}
    </View>
  )
}

/** One kind of screen's options: its name and reach, then its groups. */
function OptionSection({
  section,
  options,
  change,
}: {
  section: ShellOptionSection
  options: ShellOptions
  change: ChangeOptions
}) {
  const Icon = SECTION_ICONS[section.id]
  const color = useCSSVariable("--muted-foreground")
  return (
    <View className="gap-4">
      <View className="flex-row items-start gap-2.5">
        <View className="pt-0.5">
          <IconProvider
            size={16}
            color={typeof color === "string" ? color : undefined}
          >
            <Icon />
          </IconProvider>
        </View>
        <View className="flex-1">
          <Text
            role="heading"
            className="text-(length:--density-text-14) font-medium text-foreground"
          >
            {section.title}
          </Text>
          <Text className="text-(length:--density-text-12) text-muted-foreground">
            {section.description}
          </Text>
        </View>
      </View>
      {section.groups.map((group) => (
        <OptionGroup
          key={group.title}
          group={group}
          options={options}
          change={change}
        />
      ))}
    </View>
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

/** The website's App Shell card: what applies everywhere, then this device's section. */
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
  const change: ChangeOptions = (next) => onChange({ ...options, ...next })
  const changed = countChangedOptions(options, DEFAULT_SHELL_OPTIONS)
  const sections = getShellOptionSections({
    options,
    project: NATIVE_PROJECT,
    hidden: getNativeHiddenOptions({ isPhone }),
    platform: getShellPlatform({ isPhone }),
    notes: getOptionNotes({ hasGlass: hasLiquidGlass() }),
  })

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
            {changed > 0 ? (
              <Badge variant="secondary" className="self-center">
                {changed}
              </Badge>
            ) : null}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="gap-5">
        {sections.map((section, index) => (
          <View key={section.id} className="gap-5">
            {index > 0 ? <Separator /> : null}
            <OptionSection
              section={section}
              options={options}
              change={change}
            />
          </View>
        ))}
      </CardContent>
      <InstallCommand options={options} />
    </Card>
  )
}
