import {
  applyNavPreferences,
  containsNavItem,
  setNavOpen,
  type NavGroup,
  type NavItem,
  type NavPreferences,
} from "@fabricator-ui/app-shell-model"
import { ChevronRightIcon, type LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { SIZE, type Theme } from "../theme"

type NativeNavItem = NavItem<LucideIcon>

type NavContext = {
  activeId: string | null
  preferences: NavPreferences
  setOpen: (id: string, open: boolean) => void
  onNavigate: (item: NativeNavItem) => void
  theme: Theme
}

/**
 * App Nav on native views: the model's groups and rows, nested to any depth.
 * The top-level row holding the page is raised (the active fill with a
 * hairline edge); a nested page sits on a wash. Rows with children open from their trailing chevron, the iOS place
 * for a disclosure; a row without a page opens from anywhere on it.
 */
export function NavList({
  groups,
  activeId,
  preferences,
  onPreferencesChange,
  onNavigate,
  theme,
}: {
  groups: NavGroup<LucideIcon>[]
  activeId: string | null
  preferences: NavPreferences
  onPreferencesChange: (preferences: NavPreferences) => void
  onNavigate: (item: NativeNavItem) => void
  theme: Theme
}) {
  const context: NavContext = {
    activeId,
    preferences,
    setOpen: (id, open) =>
      onPreferencesChange(setNavOpen(preferences, id, open)),
    onNavigate,
    theme,
  }
  return (
    <View role="navigation" aria-label="Main" style={styles.list}>
      {applyNavPreferences(groups, preferences).map((group) => (
        <NavGroupSection key={group.id} group={group} context={context} />
      ))}
    </View>
  )
}

function Chevron({
  isOpen,
  size,
  color,
}: {
  isOpen: boolean
  size: number
  color: string
}) {
  return (
    <ChevronRightIcon
      size={size}
      color={color}
      strokeWidth={1.75}
      style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
    />
  )
}

function NavGroupSection({
  group,
  context,
}: {
  group: NavGroup<LucideIcon>
  context: NavContext
}) {
  const { preferences, setOpen, theme } = context
  const canCollapse = Boolean(group.collapsible && group.label)
  const isOpen = preferences.open[group.id] ?? group.defaultOpen ?? true
  return (
    <View style={styles.group}>
      {group.label !== undefined && (
        <Pressable
          disabled={!canCollapse}
          onPress={() => setOpen(group.id, !isOpen)}
          accessibilityRole={canCollapse ? "button" : "header"}
          accessibilityState={canCollapse ? { expanded: isOpen } : undefined}
          style={styles.groupHeader}
        >
          <Text style={[styles.groupLabel, { color: theme.mutedOnFrame }]}>
            {group.label}
          </Text>
          {canCollapse && (
            <Chevron isOpen={isOpen} size={14} color={theme.mutedOnFrame} />
          )}
        </Pressable>
      )}
      {isOpen &&
        group.items.map((item) => (
          <NavRow key={item.id} item={item} depth={0} context={context} />
        ))}
    </View>
  )
}

function NavRow({
  item,
  depth,
  context,
}: {
  item: NativeNavItem
  depth: number
  context: NavContext
}) {
  const { activeId, preferences, setOpen, onNavigate, theme } = context
  const children = item.children ?? []
  const hasChildren = children.length > 0
  const isCurrent = item.id === activeId
  const holdsActive = !isCurrent && containsNavItem(item, activeId)
  // An explicit choice wins; otherwise open by default or to show the page.
  const isOpen =
    hasChildren &&
    (preferences.open[item.id] ?? ((item.defaultOpen ?? false) || holdsActive))
  const isRaised = depth === 0 && (isCurrent || holdsActive)
  const isLit = isRaised || isCurrent
  const toggle = () => setOpen(item.id, !isOpen)
  const Icon = item.icon
  const iconSize = depth === 0 ? SIZE.icon : SIZE.nestedIcon

  return (
    <View>
      <View>
        <Pressable
          onPress={item.href || !hasChildren ? () => onNavigate(item) : toggle}
          disabled={item.disabled}
          accessibilityRole={item.href ? "link" : "button"}
          accessibilityState={{
            selected: isCurrent,
            disabled: item.disabled,
            expanded: !item.href && hasChildren ? isOpen : undefined,
          }}
          style={({ pressed }) => [
            styles.row,
            {
              paddingLeft: 10 + depth * SIZE.indent,
              paddingRight: hasChildren ? 44 : 12,
            },
            isRaised && {
              backgroundColor: theme.active,
              borderColor: theme.cardEdge,
            },
            !isRaised && isCurrent && { backgroundColor: theme.wash },
            pressed && { backgroundColor: theme.hover },
          ]}
        >
          {Icon ? (
            <Icon
              size={iconSize}
              strokeWidth={1.75}
              color={isLit ? theme.foreground : theme.muted}
            />
          ) : (
            <View style={{ width: iconSize }} />
          )}
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: isLit
                  ? theme.foreground
                  : depth === 0
                    ? theme.foregroundSoft
                    : theme.muted,
              },
            ]}
          >
            {item.label}
          </Text>
          {item.badge !== undefined && (
            <Text style={[styles.badge, { color: theme.mutedOnFrame }]}>
              {item.badge}
            </Text>
          )}
        </Pressable>
        {hasChildren && (
          <Pressable
            onPress={toggle}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${isOpen ? "Collapse" : "Expand"} ${item.label}`}
            accessibilityState={{ expanded: isOpen }}
            style={({ pressed }) => [
              styles.disclosure,
              pressed && { backgroundColor: theme.hover },
            ]}
          >
            <Chevron isOpen={isOpen} size={16} color={theme.muted} />
          </Pressable>
        )}
      </View>
      {isOpen && (
        <View style={styles.children}>
          {children.map((child) => (
            <NavRow
              key={child.id}
              item={child}
              depth={depth + 1}
              context={context}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  group: { gap: 2 },
  groupHeader: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  groupLabel: { fontSize: SIZE.caption, fontWeight: "500" },
  row: {
    height: SIZE.row,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: SIZE.rowRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  label: { flex: 1, fontSize: SIZE.text },
  badge: { fontSize: SIZE.small, fontVariant: ["tabular-nums"] },
  disclosure: {
    position: "absolute",
    right: 4,
    top: (SIZE.row - 32) / 2,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  children: { gap: 2, paddingTop: 2 },
})
