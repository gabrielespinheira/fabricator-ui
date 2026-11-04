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

import { FONT, useStyles, useTheme, type Theme } from "../theme"

type NativeNavItem = NavItem<LucideIcon>

type NavContext = {
  activeId: string | null
  preferences: NavPreferences
  setOpen: (id: string, open: boolean) => void
  onNavigate: (item: NativeNavItem) => void
}

/**
 * App Nav on native views: the model's groups and rows, nested to any depth.
 * The top-level row holding the page is raised (the active fill and the
 * selection's shadow); a nested page sits on a wash. Rows with children open
 * from a trailing chevron, always visible because touch has no hover; a row
 * without a page opens from anywhere on it.
 */
export function NavList({
  groups,
  activeId,
  preferences,
  onPreferencesChange,
  onNavigate,
}: {
  groups: NavGroup<LucideIcon>[]
  activeId: string | null
  preferences: NavPreferences
  onPreferencesChange: (preferences: NavPreferences) => void
  onNavigate: (item: NativeNavItem) => void
}) {
  const context: NavContext = {
    activeId,
    preferences,
    setOpen: (id, open) =>
      onPreferencesChange(setNavOpen(preferences, id, open)),
    onNavigate,
  }
  return (
    <View role="navigation" aria-label="Main">
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
      strokeWidth={1.5}
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
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const { preferences, setOpen } = context
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
          <Text style={styles.groupLabel}>{group.label}</Text>
          {canCollapse && (
            <Chevron
              isOpen={isOpen}
              size={theme.icon[14]}
              color={theme.colors.mutedOnFrame}
            />
          )}
        </Pressable>
      )}
      {isOpen && (
        <View style={styles.rows}>
          {group.items.map((item) => (
            <NavRow key={item.id} item={item} depth={0} context={context} />
          ))}
        </View>
      )}
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
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const { activeId, preferences, setOpen, onNavigate } = context
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
  const iconSize = depth === 0 ? theme.icon[16] : theme.icon[14]

  return (
    <View style={styles.rows}>
      <View>
        <Pressable
          onPress={item.href || !hasChildren ? () => onNavigate(item) : toggle}
          disabled={item.disabled}
          accessibilityRole="button"
          accessibilityState={{
            selected: isCurrent,
            disabled: item.disabled,
            expanded: !item.href && hasChildren ? isOpen : undefined,
          }}
          style={({ pressed }) => [
            styles.row,
            {
              paddingLeft: theme.space[8] + depth * theme.space[16],
              paddingRight: hasChildren ? theme.space[36] : theme.space[8],
            },
            isRaised && styles.rowRaised,
            !isRaised && isCurrent && styles.rowCurrent,
            pressed && styles.rowPressed,
          ]}
        >
          {Icon ? (
            <Icon
              size={iconSize}
              strokeWidth={isLit ? 2 : 1.5}
              color={
                isLit ? theme.colors.foreground : theme.colors.mutedOnFrame
              }
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
                  ? theme.colors.foreground
                  : depth === 0
                    ? theme.colors.foregroundSoft
                    : theme.colors.mutedOnFrame,
              },
            ]}
          >
            {item.label}
          </Text>
          {item.badge !== undefined && (
            <Text
              style={[
                styles.badge,
                isLit && { color: theme.colors.foreground },
              ]}
            >
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
              pressed && styles.rowPressed,
            ]}
          >
            <Chevron
              isOpen={isOpen}
              size={theme.icon[14]}
              color={theme.colors.mutedOnFrame}
            />
          </Pressable>
        )}
      </View>
      {isOpen &&
        children.map((child) => (
          <NavRow
            key={child.id}
            item={child}
            depth={depth + 1}
            context={context}
          />
        ))}
    </View>
  )
}

const ROW_GAP = 2

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    group: {
      paddingHorizontal: theme.space[8],
      paddingVertical: theme.space[4],
    },
    groupHeader: {
      height: theme.space[24],
      marginBottom: theme.space[4],
      paddingHorizontal: theme.space[8],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[4],
    },
    groupLabel: {
      fontFamily: FONT.medium,
      fontSize: theme.text[12],
      color: theme.colors.mutedOnFrame,
    },
    rows: { gap: ROW_GAP },
    row: {
      height: theme.space[30],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[8],
      borderRadius: theme.radius.lg,
    },
    rowRaised: {
      backgroundColor: theme.colors.active,
      boxShadow: theme.shadows.selection,
    },
    rowCurrent: { backgroundColor: theme.colors.wash },
    rowPressed: { backgroundColor: theme.colors.hover },
    label: {
      flex: 1,
      fontFamily: FONT.regular,
      fontSize: theme.text[13],
    },
    badge: {
      fontFamily: FONT.regular,
      fontSize: theme.text[12],
      fontVariant: ["tabular-nums"],
      color: theme.colors.mutedOnFrame,
    },
    disclosure: {
      position: "absolute",
      right: theme.space[4],
      top: (theme.space[30] - theme.space[28]) / 2,
      width: theme.space[28],
      height: theme.space[28],
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
  })
