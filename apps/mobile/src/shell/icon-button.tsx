import type { LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet } from "react-native"

import type { Theme } from "../theme"

/** A 36pt ghost icon button: muted, with the hover fill while pressed. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  isActive = false,
  theme,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
  isActive?: boolean
  theme: Theme
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        isActive && { backgroundColor: theme.active },
        pressed && { backgroundColor: theme.hover },
      ]}
    >
      <Icon
        size={20}
        strokeWidth={1.75}
        color={isActive ? theme.foreground : theme.muted}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
})
