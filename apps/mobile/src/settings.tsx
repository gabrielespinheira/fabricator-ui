import * as React from "react"
import { getShellSize } from "@fabricator-ui/app-shell-model"
import {
  ChevronDownIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react-native"
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"

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

import { showActionMenu, type MenuButton } from "./shell/action-menu"
import {
  FONT,
  useStyles,
  useTheme,
  useThemeSettings,
  type Theme,
  type ThemeChoice,
} from "./theme"

// The website's settings rows keep their size at every density.
const ROW_HEIGHT = 40
const ROW_TEXT = 13
const SEGMENT_WIDTH = 34
const SWATCH_SIZE = 12
const CARD_MAX_WIDTH = 320

/** Reaches the rest of the row and the room above and below the 28pt button. */
const SELECT_HIT_SLOP = { top: 6, bottom: 6, left: 48, right: 8 }

const THEME_OPTIONS: {
  value: ThemeChoice
  label: string
  icon: LucideIcon
}[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
]

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

/** Icon buttons in a pill: the theme. */
function ThemeSegmented() {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const { themeChoice, setThemeChoice } = useThemeSettings()
  return (
    <View accessibilityRole="tabbar" style={styles.track}>
      {THEME_OPTIONS.map((option) => {
        const isActive = option.value === themeChoice
        const Icon = option.icon
        return (
          <Pressable
            key={option.value}
            onPress={() => setThemeChoice(option.value)}
            accessibilityRole="button"
            accessibilityLabel={`Theme: ${option.label}`}
            accessibilityState={{ selected: isActive }}
            style={[styles.segment, isActive && styles.segmentActive]}
          >
            <Icon
              size={theme.compact.icon[16]}
              strokeWidth={isActive ? 2 : 1.5}
              color={isActive ? theme.colors.foreground : theme.colors.muted}
            />
          </Pressable>
        )
      })}
    </View>
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
 * order, drawn with the same tokens. Sound and Icons stay on the web: the app
 * has no audio engine and ships one icon library. A link
 * (fabricator-ui://look?surface=220_0.035&shape=pill) sets the look at once.
 */
export function SettingsCard({
  hasHeader = true,
}: {
  /** Off on the Settings page, whose title already says it. */
  hasHeader?: boolean
}) {
  const styles = useStyles(buildStyles)
  const { width } = useWindowDimensions()
  const { look, setLook } = useThemeSettings()
  const change = (next: Partial<FabricatorLook>) =>
    setLook({ ...look, ...next })
  const surface = SURFACE_PRESETS.find((preset) =>
    sameTint(preset.tint, look.surface)
  )
  const primary = ROLE_PRESETS.primary.find((preset) =>
    sameRoleColor(preset.color, look.colors.primary)
  )
  const isPhone = getShellSize(width) === "phone"

  return (
    <View style={[styles.card, !isPhone && styles.cardNarrow]}>
      {hasHeader && (
        <View style={styles.cardHeader}>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            Settings
          </Text>
          <Text style={styles.cardDescription}>
            The website's settings; every screen here follows them.
          </Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <SettingRow label="Theme">
          <ThemeSegmented />
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
      </View>
    </View>
  )
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: theme.space[16],
      paddingVertical: theme.space[16],
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.popover,
      boxShadow: theme.shadows.selection,
    },
    cardNarrow: { maxWidth: CARD_MAX_WIDTH },
    cardHeader: { gap: theme.space[4], paddingHorizontal: theme.space[16] },
    cardTitle: {
      fontFamily: FONT.medium,
      fontSize: theme.text[14],
      color: theme.colors.foreground,
    },
    cardDescription: {
      fontFamily: FONT.regular,
      fontSize: theme.text[13],
      lineHeight: theme.text[13] * 1.5,
      color: theme.colors.muted,
    },
    cardContent: { paddingHorizontal: theme.space[16] },
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
    track: {
      flexDirection: "row",
      gap: 2,
      padding: 2,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.segmentedTrack,
    },
    segment: {
      width: SEGMENT_WIDTH,
      height: theme.compact.space[36],
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentActive: { backgroundColor: theme.colors.active },
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
