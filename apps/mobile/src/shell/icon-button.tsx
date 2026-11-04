import { Pressable, StyleSheet, type ViewStyle } from "react-native"

import { useStyles, type Theme } from "../theme"

// A finger needs more than the button's 28pt: this makes the target 44pt.
const HIT_SLOP = 8

/**
 * A ghost icon button, as the website's `size="icon-sm"`: 28pt at every density,
 * with the hover fill while pressed.
 */
export function IconButton({
  label,
  onPress,
  isExpanded,
  style,
  children,
}: {
  label: string
  onPress: () => void
  /** For a button that shows and hides something. */
  isExpanded?: boolean
  style?: ViewStyle
  children: React.ReactNode
}) {
  const styles = useStyles(buildStyles)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: isExpanded }}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  )
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      width: theme.compact.space[36],
      height: theme.compact.space[36],
      borderRadius: theme.radius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { backgroundColor: theme.colors.hover },
  })
