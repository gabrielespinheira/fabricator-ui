import {
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import { roleToHex, sameRoleColor } from "@/registry/fabricator/color-roles"
import type { FabricatorLook } from "@/registry/fabricator/look"
import {
  DENSITY_OPTIONS,
  MOTION_OPTIONS,
  RADIUS_OPTIONS,
  ROLE_PRESETS,
  SURFACE_PRESETS,
} from "@/registry/fabricator/look-presets"
import { sameTint, tintToHex } from "@/registry/fabricator/surface-tint"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/native/ui/card"
import { DensityScope } from "@/registry/native/ui/density"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/native/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/registry/native/ui/tabs"
import { Text } from "@/registry/native/ui/text"

import { useThemeSettings } from "./theme"

const SOUND_OPTIONS = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
]

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
] as const

function SettingRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <View className="min-h-10 flex-row items-center justify-between gap-3">
      <Text className="text-(length:--density-text-13) text-muted-foreground">
        {label}
      </Text>
      {children}
    </View>
  )
}

/** Icon tabs on a track: the theme. */
function ThemeSegmented() {
  const { themeChoice, setThemeChoice } = useThemeSettings()
  return (
    <Tabs
      value={themeChoice}
      onValueChange={(next) => {
        const picked = THEME_OPTIONS.find((option) => option.value === next)
        if (picked) setThemeChoice(picked.value)
      }}
    >
      <DensityScope density="compact">
        <TabsList accessibilityLabel="Theme">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <TabsTrigger
                key={option.value}
                value={option.value}
                accessibilityLabel={`Theme: ${option.label}`}
              >
                <Icon />
              </TabsTrigger>
            )
          })}
        </TabsList>
      </DensityScope>
    </Tabs>
  )
}

/** A choice of a few names: a sheet on a phone, a popover on a tablet. */
function SettingSelect({
  label,
  options,
  value,
  swatch,
  onChange,
}: {
  label: string
  options: readonly { value: string; label: string }[]
  value: string
  /** The current colour, as a dot before the name. */
  swatch?: string
  onChange: (value: string) => void
}) {
  return (
    <SettingRow label={label}>
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onChange(next)
        }}
      >
        <SelectTrigger
          accessibilityLabel={label}
          className="w-auto gap-2 border-0 bg-transparent px-0"
        >
          {swatch === undefined ? null : (
            <View
              className="size-3 rounded-full"
              style={{ backgroundColor: swatch }}
            />
          )}
          <SelectValue className="grow-0 text-foreground" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </SettingRow>
  )
}

/**
 * The website's settings menu, for this app: the same choices in the same order.
 * Icons stay on the web: the app ships one icon library. A link
 * (fabricator-ui://look?surface=220_0.035&shape=pill) sets the look at once.
 */
export function SettingsCard({ className }: { className?: string }) {
  const { look, setLook, isSoundOn, setIsSoundOn } = useThemeSettings()
  const change = (next: Partial<FabricatorLook>) =>
    setLook({ ...look, ...next })
  const surface = SURFACE_PRESETS.find((preset) =>
    sameTint(preset.tint, look.surface)
  )
  const primary = ROLE_PRESETS.primary.find((preset) =>
    sameRoleColor(preset.color, look.colors.primary)
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          The website's settings; every screen here follows them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingRow label="Theme">
          <ThemeSegmented />
        </SettingRow>
        <SettingSelect
          label="Sound"
          options={SOUND_OPTIONS}
          value={isSoundOn ? "on" : "off"}
          onChange={(next) => setIsSoundOn(next === "on")}
        />
        <SettingSelect
          label="Radius"
          options={RADIUS_OPTIONS}
          value={look.radius}
          onChange={(next) => {
            const picked = RADIUS_OPTIONS.find(
              (option) => option.value === next
            )
            if (picked) change({ radius: picked.value })
          }}
        />
        <SettingSelect
          label="Density"
          options={DENSITY_OPTIONS}
          value={look.density}
          onChange={(next) => {
            const picked = DENSITY_OPTIONS.find(
              (option) => option.value === next
            )
            if (picked) change({ density: picked.value })
          }}
        />
        <SettingSelect
          label="Motion"
          options={MOTION_OPTIONS}
          value={look.motion}
          onChange={(next) => {
            const picked = MOTION_OPTIONS.find(
              (option) => option.value === next
            )
            if (picked) change({ motion: picked.value })
          }}
        />
        <SettingSelect
          label="Surface"
          options={SURFACE_PRESETS}
          value={surface?.value ?? "custom"}
          swatch={tintToHex(look.surface)}
          onChange={(next) => {
            const picked = SURFACE_PRESETS.find(
              (preset) => preset.value === next
            )
            if (picked) change({ surface: picked.tint })
          }}
        />
        <SettingSelect
          label="Primary"
          options={ROLE_PRESETS.primary}
          value={primary?.value ?? "custom"}
          swatch={roleToHex(look.colors.primary)}
          onChange={(next) => {
            const picked = ROLE_PRESETS.primary.find(
              (preset) => preset.value === next
            )
            if (picked) {
              change({ colors: { ...look.colors, primary: picked.color } })
            }
          }}
        />
      </CardContent>
    </Card>
  )
}
