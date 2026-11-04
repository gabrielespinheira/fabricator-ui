import {
  containsNavItem,
  getMobileTabItems,
  type NavGroup,
  type NavItem,
} from "@fabricator-ui/app-shell-model"
import type { LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { FONT, useStyles, useTheme, type Theme } from "../theme"

/** The phone's bottom tabs: the items marked `mobile: "tab"`, as on the web. */
export function TabBar({
  groups,
  activeId,
  onNavigate,
  insetBottom,
}: {
  groups: NavGroup<LucideIcon>[]
  activeId: string | null
  onNavigate: (item: NavItem<LucideIcon>) => void
  insetBottom: number
}) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  return (
    <View
      accessibilityRole="tabbar"
      style={[styles.bar, { paddingBottom: insetBottom }]}
    >
      {getMobileTabItems(groups).map((item) => {
        const isActive = containsNavItem(item, activeId)
        const Icon = item.icon
        return (
          <Pressable
            key={item.id}
            onPress={() => onNavigate(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={styles.item}
          >
            {Icon && (
              <Icon
                size={theme.icon[16]}
                color={isActive ? theme.colors.foreground : theme.colors.muted}
                strokeWidth={isActive ? 2 : 1.5}
              />
            )}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.main,
    },
    item: {
      flex: 1,
      minHeight: theme.space[48],
      alignItems: "center",
      justifyContent: "center",
      gap: theme.space[4],
    },
    label: {
      fontFamily: FONT.regular,
      fontSize: theme.text[11],
      color: theme.colors.muted,
    },
    labelActive: {
      fontFamily: FONT.semibold,
      color: theme.colors.foreground,
    },
  })
