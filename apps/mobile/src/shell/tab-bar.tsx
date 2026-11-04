import {
  containsNavItem,
  getMobileTabItems,
  type NavGroup,
  type NavItem,
} from "@fabricator-ui/app-shell-model"
import type { LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { SIZE, type Theme } from "../theme"

/** The phone's bottom tabs: the items marked `mobile: "tab"`, as on the web. */
export function TabBar({
  groups,
  activeId,
  onNavigate,
  insetBottom,
  theme,
}: {
  groups: NavGroup<LucideIcon>[]
  activeId: string | null
  onNavigate: (item: NavItem<LucideIcon>) => void
  insetBottom: number
  theme: Theme
}) {
  return (
    <View
      role="tablist"
      style={[
        styles.bar,
        {
          paddingBottom: insetBottom,
          backgroundColor: theme.main,
          borderTopColor: theme.border,
        },
      ]}
    >
      {getMobileTabItems(groups).map((item) => {
        const isActive = containsNavItem(item, activeId)
        const color = isActive ? theme.foreground : theme.muted
        const Icon = item.icon
        return (
          <Pressable
            key={item.id}
            onPress={() => onNavigate(item)}
            role="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.item}
          >
            {Icon && (
              <Icon size={22} color={color} strokeWidth={isActive ? 2 : 1.75} />
            )}
            <Text
              style={[
                styles.label,
                { color, fontWeight: isActive ? "600" : "400" },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    height: SIZE.tabBar,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  label: { fontSize: 11 },
})
