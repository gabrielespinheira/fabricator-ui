import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"

import { FONT, useStyles, type Theme } from "../theme"

/** One choice of a few: Fabricator's tab track, as the panel's tabs use it. */
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
  style,
}: {
  label: string
  options: readonly { value: Value; label: string }[]
  value: Value | null
  onChange: (value: Value) => void
  style?: ViewStyle
}) {
  const styles = useStyles(buildStyles)
  return (
    <View accessibilityRole="tabbar" style={[styles.track, style]}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.value)}
            style={[styles.item, isActive && styles.itemActive]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, isActive && styles.labelActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: "row",
      height: theme.space[36],
      padding: theme.space[4],
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.tabTrack,
    },
    item: {
      flexGrow: 1,
      height: theme.space[28],
      paddingHorizontal: theme.space[8],
      borderRadius: theme.radius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    itemActive: {
      backgroundColor: theme.colors.tabActive,
      boxShadow: theme.shadows.raised,
    },
    label: {
      fontFamily: FONT.regular,
      fontSize: theme.text[13],
      color: theme.colors.muted,
    },
    labelActive: {
      fontFamily: FONT.semibold,
      color: theme.colors.foreground,
    },
  })
