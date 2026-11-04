import * as React from "react"
import type {
  AppShellContentSize,
  PanelMobile,
} from "@fabricator-ui/app-shell-model"
import { RotateCcwIcon } from "lucide-react-native"
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native"

import { OptionCard } from "./shell/option-card"
import {
  FONT,
  useReducedMotion,
  useStyles,
  useTheme,
  type Theme,
} from "./theme"

/**
 * The website's App Shell options that native views can honour. Left out: Peek
 * (nothing hovers), a searchable workspace list and Customize (no native UI for
 * them yet), drag to reorder (no drag and drop here), Tabs (Tab Strip has no
 * native view) and Window (the system owns it).
 */
export type ShellOptions = {
  style: "inset" | "flush" | "floating"
  collapse: "icons" | "hide" | "never"
  phoneSidebar: "reveal" | "sheet"
  workspaces: "menu" | "none"
  account: "footer" | "header" | "none"
  contentSize: AppShellContentSize
  breadcrumb: boolean
  actions: boolean
  status: boolean
  tabBar: boolean
  panel: boolean
  panelOnPhones: PanelMobile
}

export const DEFAULT_SHELL_OPTIONS: ShellOptions = {
  style: "inset",
  collapse: "icons",
  phoneSidebar: "reveal",
  workspaces: "menu",
  account: "footer",
  contentSize: "md",
  breadcrumb: true,
  actions: true,
  status: true,
  tabBar: true,
  panel: true,
  panelOnPhones: "drawer",
}

// The website's rows keep their size at every density: min-h-10, 13px.
const ROW_HEIGHT = 40
const ROW_TEXT = 13
const SECTION_TEXT = 12
const CONTROL_HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 }

function countChangedOptions(options: ShellOptions) {
  return (Object.keys(options) as (keyof ShellOptions)[]).filter(
    (key) => options[key] !== DEFAULT_SHELL_OPTIONS[key]
  ).length
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const styles = useStyles(buildStyles)
  return (
    <View>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  )
}

/** One of a few, as labels in a pill: the website's Segmented. */
function OptionChoice<Value extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string
  value: Value
  choices: readonly { value: Value; label: string }[]
  onChange: (value: Value) => void
}) {
  const styles = useStyles(buildStyles)
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View accessibilityRole="tabbar" style={styles.group}>
        {choices.map((choice) => {
          const isActive = choice.value === value
          return (
            <Pressable
              key={choice.value}
              onPress={() => onChange(choice.value)}
              hitSlop={CONTROL_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${choice.label}`}
              accessibilityState={{ selected: isActive }}
              style={[styles.segment, isActive && styles.segmentActive]}
            >
              <Text
                numberOfLines={1}
                style={[styles.segmentLabel, isActive && styles.segmentLabelOn]}
              >
                {choice.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function OptionSwitch({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const reduceMotion = useReducedMotion()
  const { moveMs, moveEasing } = theme.motion
  const progress = React.useRef(new Animated.Value(value ? 1 : 0)).current

  React.useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: reduceMotion ? 0 : moveMs,
      easing: Easing.bezier(
        moveEasing[0],
        moveEasing[1],
        moveEasing[2],
        moveEasing[3]
      ),
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [value, progress, reduceMotion, moveMs, moveEasing])

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Pressable
        onPress={() => onChange(!value)}
        hitSlop={CONTROL_HIT_SLOP}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        style={[styles.switch, value && styles.switchOn]}
      >
        <Animated.View
          style={[
            styles.thumb,
            value && styles.thumbOn,
            {
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, theme.space[14]],
                  }),
                },
              ],
            },
          ]}
        />
      </Pressable>
    </View>
  )
}

/**
 * How the shell is laid out, as on the website's App Shell card. A row only
 * shows where it does something: Style and Collapse need a docked sidebar, the
 * tab bar and the sheets a phone.
 */
export function ShellOptionsCard({
  options,
  onChange,
  isPhone,
  style,
}: {
  options: ShellOptions
  onChange: (options: ShellOptions) => void
  isPhone: boolean
  style?: ViewStyle
}) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const change = (next: Partial<ShellOptions>) =>
    onChange({ ...options, ...next })
  const changed = countChangedOptions(options)

  return (
    <OptionCard
      title="App Shell"
      description="How the shell is laid out."
      style={style}
      action={
        <Pressable
          onPress={() => onChange(DEFAULT_SHELL_OPTIONS)}
          disabled={changed === 0}
          accessibilityRole="button"
          accessibilityLabel={
            changed > 0
              ? `Reset ${changed} changed ${changed === 1 ? "option" : "options"}`
              : "Reset"
          }
          accessibilityState={{ disabled: changed === 0 }}
          style={({ pressed }) => [
            styles.reset,
            changed === 0 && styles.resetOff,
            pressed && styles.resetPressed,
          ]}
        >
          <RotateCcwIcon
            size={theme.compact.icon[16]}
            strokeWidth={1.5}
            color={theme.colors.foreground}
          />
          <Text style={styles.resetLabel}>Reset</Text>
          {changed > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{changed}</Text>
            </View>
          )}
        </Pressable>
      }
    >
      <View style={styles.sections}>
        <Section title="Sidebar">
          {!isPhone && (
            <>
              <OptionChoice
                label="Style"
                value={options.style}
                choices={[
                  { value: "inset", label: "Inset" },
                  { value: "flush", label: "Flush" },
                  { value: "floating", label: "Floating" },
                ]}
                onChange={(next) => change({ style: next })}
              />
              <OptionChoice
                label="Collapse"
                value={options.collapse}
                choices={[
                  { value: "icons", label: "Icons" },
                  { value: "hide", label: "Hide" },
                  { value: "never", label: "Never" },
                ]}
                onChange={(next) => change({ collapse: next })}
              />
            </>
          )}
          {isPhone && (
            <OptionChoice
              label="On phones"
              value={options.phoneSidebar}
              choices={[
                { value: "reveal", label: "Reveal" },
                { value: "sheet", label: "Sheet" },
              ]}
              onChange={(next) => change({ phoneSidebar: next })}
            />
          )}
          <OptionChoice
            label="Workspaces"
            value={options.workspaces}
            choices={[
              { value: "menu", label: "Menu" },
              { value: "none", label: "None" },
            ]}
            onChange={(next) => change({ workspaces: next })}
          />
          <OptionChoice
            label="Account"
            value={options.account}
            choices={[
              { value: "footer", label: "Bottom" },
              { value: "header", label: "Top" },
              { value: "none", label: "None" },
            ]}
            onChange={(next) => change({ account: next })}
          />
        </Section>
        <Section title="Main">
          {!isPhone && (
            <OptionChoice
              label="Content width"
              value={options.contentSize}
              choices={[
                { value: "sm", label: "Narrow" },
                { value: "md", label: "Default" },
                { value: "lg", label: "Wide" },
              ]}
              onChange={(next) => change({ contentSize: next })}
            />
          )}
          {!isPhone && (
            <OptionSwitch
              label="Breadcrumb"
              value={options.breadcrumb}
              onChange={(next) => change({ breadcrumb: next })}
            />
          )}
          <OptionSwitch
            label="Header actions"
            value={options.actions}
            onChange={(next) => change({ actions: next })}
          />
          {!isPhone && (
            <OptionSwitch
              label="Status bar"
              value={options.status}
              onChange={(next) => change({ status: next })}
            />
          )}
          {isPhone && (
            <OptionSwitch
              label="Tab bar on phones"
              value={options.tabBar}
              onChange={(next) => change({ tabBar: next })}
            />
          )}
        </Section>
        <Section title="Right panel">
          <OptionSwitch
            label="Panel"
            value={options.panel}
            onChange={(next) => change({ panel: next })}
          />
          {isPhone && options.panel && (
            <OptionChoice
              label="On phones"
              value={options.panelOnPhones}
              choices={[
                { value: "drawer", label: "Drawer" },
                { value: "swap", label: "Screen" },
                { value: "none", label: "None" },
              ]}
              onChange={(next) => change({ panelOnPhones: next })}
            />
          )}
        </Section>
      </View>
    </OptionCard>
  )
}

const buildStyles = (theme: Theme) => {
  const thumb = theme.space[20] - 4
  return StyleSheet.create({
    sections: { gap: 24 },
    sectionTitle: {
      paddingBottom: 4,
      fontFamily: FONT.medium,
      fontSize: SECTION_TEXT,
      color: theme.colors.foreground,
    },
    row: {
      minHeight: ROW_HEIGHT,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      columnGap: 12,
      rowGap: 4,
    },
    rowLabel: {
      fontFamily: FONT.regular,
      fontSize: ROW_TEXT,
      color: theme.colors.muted,
    },
    group: {
      flexDirection: "row",
      gap: 2,
      padding: 2,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.segmentedTrack,
    },
    segment: {
      height: theme.compact.space[36],
      paddingHorizontal: 8,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentActive: { backgroundColor: theme.colors.active },
    segmentLabel: {
      fontFamily: FONT.medium,
      fontSize: theme.compact.text[13],
      color: theme.colors.segmentLabel,
    },
    segmentLabelOn: { color: theme.colors.foreground },
    switch: {
      width: thumb + theme.space[14] + 4,
      height: theme.space[20],
      padding: 2,
      borderRadius: theme.space[20] / 2,
      backgroundColor: theme.colors.hover,
    },
    switchOn: { backgroundColor: theme.colors.primary },
    thumb: {
      width: thumb,
      height: thumb,
      borderRadius: thumb / 2,
      backgroundColor: theme.colors.switchThumb,
      boxShadow:
        "0 1px 2px rgba(0, 0, 0, 0.15), 0 0 0 0.5px rgba(0, 0, 0, 0.04)",
    },
    thumbOn: { backgroundColor: theme.colors.primaryForeground },
    badge: {
      paddingHorizontal: theme.compact.space[8],
      paddingVertical: 2,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.active,
    },
    badgeLabel: {
      fontFamily: FONT.medium,
      fontSize: theme.compact.text[12],
      color: theme.colors.foreground,
    },
    reset: {
      height: theme.compact.space[36],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.compact.space[6],
      paddingLeft: theme.compact.space[10],
      paddingRight: theme.compact.space[12],
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    resetOff: { opacity: 0.5 },
    resetPressed: { backgroundColor: theme.colors.hover },
    resetLabel: {
      fontFamily: FONT.medium,
      fontSize: theme.compact.text[13],
      color: theme.colors.foreground,
    },
  })
}
