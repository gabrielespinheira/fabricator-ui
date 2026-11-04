import * as React from "react"
import {
  containsNavItem,
  getMobileTabItems,
  type NavGroup,
  type NavItem,
} from "@fabricator-ui/app-shell-model"
import type { LucideIcon } from "lucide-react-native"
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import {
  FONT,
  useReducedMotion,
  useStyles,
  useTheme,
  type Theme,
} from "../theme"
import { GlassView } from "./glass"

export type TabBarStyle = "flat" | "glass" | "floating"

/** A floating bar's height: its rows and the capsule's padding. */
function getCapsuleHeight(theme: Theme) {
  return theme.space[48] + 2 * theme.space[6]
}

/** Where a floating bar sits: partly in the home indicator's space, as Apple's. */
function getCapsuleBottom(theme: Theme, insetBottom: number) {
  return Math.max(insetBottom - theme.space[12], theme.space[12])
}

/** The room a page leaves below its content for a bar that floats over it. */
export function getTabBarClearance(
  theme: Theme,
  style: TabBarStyle,
  insetBottom: number
) {
  if (style === "flat") return 0
  return getCapsuleBottom(theme, insetBottom) + getCapsuleHeight(theme)
}

/** The current tab's pill, sliding between the tabs. */
function ActivePill({
  index,
  width,
  style,
}: {
  /** Which tab holds it, or -1 when the page isn't one of them. */
  index: number
  width: number
  style: StyleProp<ViewStyle>
}) {
  const theme = useTheme()
  const reduceMotion = useReducedMotion()
  const { moveMs, moveEasing } = theme.motion
  const position = index * width
  const offset = React.useRef(new Animated.Value(position)).current
  const wasPlaced = React.useRef(false)
  const isShown = width > 0 && index >= 0

  React.useEffect(() => {
    if (!isShown) return
    // The first measure puts it in place; only a change of tab slides it.
    if (!wasPlaced.current) {
      wasPlaced.current = true
      offset.setValue(position)
      return
    }
    const animation = Animated.timing(offset, {
      toValue: position,
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
  }, [isShown, offset, position, reduceMotion, moveMs, moveEasing])

  if (!isShown) return null
  return (
    <Animated.View
      style={[{ width, transform: [{ translateX: offset }] }, style]}
    />
  )
}

/**
 * The phone's bottom tabs: the items marked `mobile: "tab"`, as on the web. Flat
 * is a row under the page. Glass and floating are capsules over it, so the page
 * scrolls behind them: Apple's Liquid Glass, or the sidebar's colours.
 */
export function TabBar({
  groups,
  activeId,
  onNavigate,
  insetBottom,
  style,
}: {
  groups: NavGroup<LucideIcon>[]
  activeId: string | null
  onNavigate: (item: NavItem<LucideIcon>) => void
  insetBottom: number
  style: TabBarStyle
}) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const [trackWidth, setTrackWidth] = React.useState(0)
  const items = getMobileTabItems(groups)
  const isFlat = style === "flat"
  const restingColor =
    style === "glass"
      ? theme.colors.foregroundSoft
      : style === "floating"
        ? theme.colors.mutedOnFrame
        : theme.colors.muted

  const tabs = items.map((item) => {
    const isActive = containsNavItem(item, activeId)
    const Icon = item.icon
    return (
      <Pressable
        key={item.id}
        onPress={() => onNavigate(item)}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        style={({ pressed }) => [
          styles.item,
          !isFlat && pressed && styles.itemPressed,
        ]}
      >
        {Icon && (
          <Icon
            size={isFlat ? theme.icon[16] : theme.space[20]}
            color={isActive ? theme.colors.foreground : restingColor}
            strokeWidth={isActive ? 2 : 1.5}
          />
        )}
        <Text
          numberOfLines={1}
          // A long label in a narrow tab shrinks a little instead of truncating.
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[
            styles.label,
            { color: isActive ? theme.colors.foreground : restingColor },
            isActive && styles.labelActive,
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    )
  })

  if (isFlat) {
    return (
      <View
        accessibilityRole="tabbar"
        style={[styles.bar, { paddingBottom: insetBottom }]}
      >
        {tabs}
      </View>
    )
  }

  const track = (
    <View
      onLayout={(event: LayoutChangeEvent) =>
        setTrackWidth(event.nativeEvent.layout.width)
      }
      style={styles.track}
    >
      <ActivePill
        index={items.findIndex((item) => containsNavItem(item, activeId))}
        width={trackWidth / items.length}
        style={[
          styles.pill,
          style === "glass" ? styles.pillOnGlass : styles.pillOnSidebar,
        ]}
      />
      {tabs}
    </View>
  )

  return (
    <View
      accessibilityRole="tabbar"
      style={[
        styles.capsuleSlot,
        { bottom: getCapsuleBottom(theme, insetBottom) },
      ]}
    >
      {style === "glass" ? (
        <GlassView
          isInteractive
          colorScheme={theme.mode}
          style={styles.capsule}
        >
          {track}
        </GlassView>
      ) : (
        <View style={[styles.capsule, styles.capsuleOnSidebar]}>{track}</View>
      )}
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
    capsuleSlot: {
      position: "absolute",
      left: theme.space[16],
      right: theme.space[16],
    },
    capsule: {
      height: getCapsuleHeight(theme),
      padding: theme.space[6],
      borderRadius: getCapsuleHeight(theme) / 2,
    },
    capsuleOnSidebar: {
      backgroundColor: theme.colors.frame,
      boxShadow: theme.shadows.card,
    },
    track: { flex: 1, flexDirection: "row" },
    pill: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      borderRadius: theme.space[48] / 2,
    },
    pillOnGlass: { backgroundColor: theme.colors.hover },
    pillOnSidebar: {
      backgroundColor: theme.colors.active,
      boxShadow: theme.shadows.selection,
    },
    item: {
      flex: 1,
      minHeight: theme.space[48],
      alignItems: "center",
      justifyContent: "center",
      gap: theme.space[4],
    },
    itemPressed: { opacity: 0.7 },
    label: {
      fontFamily: FONT.regular,
      fontSize: theme.text[11],
    },
    labelActive: {
      fontFamily: FONT.semibold,
    },
  })
