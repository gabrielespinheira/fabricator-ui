import * as React from "react"
import {
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "@fabricator-ui/icons-react-native"
import { ChevronDownIcon } from "lucide-react-native"
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"

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
import { DensityScope } from "@/registry/native/ui/density"
import { Tabs, TabsList, TabsTrigger } from "@/registry/native/ui/tabs"

import { showActionMenu, type MenuButton } from "./shell/action-menu"
import { OptionCard } from "./shell/option-card"
import {
  FONT,
  useStyles,
  useTheme,
  useThemeSettings,
  type Theme,
} from "./theme"

// The website's settings rows keep their size at every density.
const ROW_HEIGHT = 40
const ROW_TEXT = 13
const SWATCH_SIZE = 12

/** Reaches the rest of the row and the room above and below the 28pt button. */
const SELECT_HIT_SLOP = { top: 6, bottom: 6, left: 48, right: 8 }

const SOUND_OPTIONS = [
  { value: true, label: "On" },
  { value: false, label: "Off" },
] as const

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
  const styles = useStyles(buildStyles)
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
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

/** A choice of a few names, in the native menu. Shows the current one. */
function SettingSelect<Option extends { label: string }>({
  label,
  options,
  value,
  swatch,
  onChange,
}: {
  label: string
  options: readonly Option[]
  /** The current option's name. */
  value: string
  /** The current colour, as a dot before the name. */
  swatch?: string
  onChange: (option: Option) => void
}) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const button = React.useRef<MenuButton>(null)
  const open = () =>
    showActionMenu({
      button,
      title: label,
      options: options.map((option) => option.label),
      mode: theme.mode,
      onSelect: (index) => {
        const picked = options[index]
        if (picked) onChange(picked)
      },
    })
  return (
    <Pressable
      ref={button}
      onPress={open}
      hitSlop={SELECT_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.select, pressed && styles.selectPressed]}
    >
      {swatch !== undefined && (
        <View style={[styles.swatch, { backgroundColor: swatch }]} />
      )}
      <Text style={styles.selectValue}>{value}</Text>
      <ChevronDownIcon
        size={theme.compact.icon[16]}
        strokeWidth={1.5}
        color={theme.colors.muted}
      />
    </Pressable>
  )
}

/**
 * The website's settings menu, for this app: the same choices in the same
 * order, drawn with the same tokens. Icons stay on the web: the app ships one
 * icon library. A link (fabricator-ui://look?surface=220_0.035&shape=pill) sets
 * the look at once.
 */
export function SettingsCard({ style }: { style?: ViewStyle }) {
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
    <OptionCard
      title="Settings"
      description="The website's settings; every screen here follows them."
      style={style}
    >
      <SettingRow label="Theme">
        <ThemeSegmented />
      </SettingRow>
      <SettingRow label="Sound">
        <SettingSelect
          label="Sound"
          options={SOUND_OPTIONS}
          value={isSoundOn ? "On" : "Off"}
          onChange={(option) => setIsSoundOn(option.value)}
        />
      </SettingRow>
      <SettingRow label="Radius">
        <SettingSelect
          label="Radius"
          options={RADIUS_OPTIONS}
          value={
            RADIUS_OPTIONS.find((option) => option.value === look.radius)
              ?.label ?? look.radius
          }
          onChange={(option) => change({ radius: option.value })}
        />
      </SettingRow>
      <SettingRow label="Density">
        <SettingSelect
          label="Density"
          options={DENSITY_OPTIONS}
          value={
            DENSITY_OPTIONS.find((option) => option.value === look.density)
              ?.label ?? look.density
          }
          onChange={(option) => change({ density: option.value })}
        />
      </SettingRow>
      <SettingRow label="Motion">
        <SettingSelect
          label="Motion"
          options={MOTION_OPTIONS}
          value={
            MOTION_OPTIONS.find((option) => option.value === look.motion)
              ?.label ?? look.motion
          }
          onChange={(option) => change({ motion: option.value })}
        />
      </SettingRow>
      <SettingRow label="Surface">
        <SettingSelect
          label="Surface"
          options={SURFACE_PRESETS}
          value={surface?.label ?? "Custom"}
          swatch={tintToHex(look.surface)}
          onChange={(option) => change({ surface: option.tint })}
        />
      </SettingRow>
      <SettingRow label="Primary">
        <SettingSelect
          label="Primary"
          options={ROLE_PRESETS.primary}
          value={primary?.label ?? "Custom"}
          swatch={roleToHex(look.colors.primary)}
          onChange={(option) =>
            change({ colors: { ...look.colors, primary: option.color } })
          }
        />
      </SettingRow>
    </OptionCard>
  )
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      height: ROW_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    rowLabel: {
      fontFamily: FONT.regular,
      fontSize: ROW_TEXT,
      color: theme.colors.muted,
    },
    select: {
      height: theme.compact.space[36],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.compact.space[8],
      marginRight: -8,
      paddingLeft: theme.compact.space[10],
      paddingRight: theme.compact.space[8],
      borderRadius: theme.radius.lg,
    },
    selectPressed: { backgroundColor: theme.colors.hover },
    selectValue: {
      fontFamily: FONT.regular,
      fontSize: ROW_TEXT,
      color: theme.colors.foreground,
    },
    swatch: {
      width: SWATCH_SIZE,
      height: SWATCH_SIZE,
      borderRadius: SWATCH_SIZE / 2,
      boxShadow: theme.isDark
        ? "inset 0 0 0 1px rgba(255, 255, 255, 0.16)"
        : "inset 0 0 0 1px rgba(0, 0, 0, 0.12)",
    },
  })
