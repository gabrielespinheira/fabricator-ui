import * as React from "react"
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"

import {
  getRevealDragProgress,
  getRevealWidth,
  REVEAL_SCALE,
  shouldRevealStayOpen,
} from "@/registry/fabricator/shared/lib/sidebar-model"

import { useReducedMotion, useStyles, useTheme, type Theme } from "../theme"

// The website's phone sidebar width (18rem).
const SIDEBAR_WIDTH_MOBILE = 288

/** How close to the leading edge a swipe has to start to open it. */
const OPEN_EDGE = 24

/** A horizontal move this long, and mostly sideways, claims the touch. */
const DRAG_SLOP = 8

/** How far the sidebar drifts as the page uncovers it, as a share of its width. */
const SIDEBAR_DRIFT = 0.12

const CLOSED_SIDEBAR_OPACITY = 0.5

/**
 * The phone's sidebar. `reveal`: it sits behind the page, and opening it moves
 * the page aside and shrinks it, with the rest of the page still in view beside
 * it. `sheet`: it slides over the page and a scrim. Both run on the look's sheet
 * timing: a tap on the page or dragging back closes it, a swipe from the leading
 * edge opens it, and reduced motion moves it in place.
 */
export function SidebarReveal({
  variant,
  isOpen,
  onOpenChange,
  sidebar,
  children,
}: {
  variant: "reveal" | "sheet"
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const { width: screenWidth } = useWindowDimensions()
  const width = getRevealWidth(SIDEBAR_WIDTH_MOBILE, screenWidth)
  const { sheetEnterMs, sheetExitMs, sheetEasing } = theme.motion
  const progress = React.useRef(new Animated.Value(0)).current
  // Stays true until the page is back, so its corners and shadow leave last.
  const [isAside, setIsAside] = React.useState(false)
  const reduceMotion = useReducedMotion()
  const isSheet = variant === "sheet"

  const settle = React.useCallback(
    (toOpen: boolean) => {
      Animated.timing(progress, {
        toValue: toOpen ? 1 : 0,
        duration: reduceMotion ? 0 : toOpen ? sheetEnterMs : sheetExitMs,
        easing: Easing.bezier(
          sheetEasing[0],
          sheetEasing[1],
          sheetEasing[2],
          sheetEasing[3]
        ),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !toOpen) setIsAside(false)
      })
    },
    [progress, reduceMotion, sheetEnterMs, sheetExitMs, sheetEasing]
  )

  React.useEffect(() => {
    if (isOpen) setIsAside(true)
    settle(isOpen)
  }, [isOpen, settle])

  const closeDrag = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dx < -DRAG_SLOP &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_event, gesture) =>
          progress.setValue(
            getRevealDragProgress({ deltaX: gesture.dx, width })
          ),
        onPanResponderRelease: (_event, gesture) => {
          const stayOpen = shouldRevealStayOpen({
            progress: getRevealDragProgress({ deltaX: gesture.dx, width }),
            velocity: gesture.vx,
          })
          if (stayOpen) settle(true)
          else onOpenChange(false)
        },
        onPanResponderTerminate: () => settle(true),
      }),
    [progress, width, settle, onOpenChange]
  )

  const openDrag = React.useMemo(
    () =>
      PanResponder.create({
        // `gesture.x0` is 0 until the responder is granted, so it can't say where
        // the drag began: every rightward drag on the page would open the sidebar,
        // cancelling sliders, tabs and anything else under the finger.
        onMoveShouldSetPanResponder: (event, gesture) =>
          event.nativeEvent.pageX - gesture.dx <= OPEN_EDGE &&
          gesture.dx > DRAG_SLOP &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => setIsAside(true),
        onPanResponderMove: (_event, gesture) =>
          progress.setValue(
            getRevealDragProgress({ deltaX: gesture.dx - width, width })
          ),
        onPanResponderRelease: (_event, gesture) => {
          const shouldOpen = shouldRevealStayOpen({
            progress: getRevealDragProgress({
              deltaX: gesture.dx - width,
              width,
            }),
            velocity: gesture.vx,
          })
          if (shouldOpen) onOpenChange(true)
          else settle(false)
        },
        onPanResponderTerminate: () => settle(false),
      }),
    [progress, width, settle, onOpenChange]
  )

  return (
    <View style={styles.frame}>
      <Animated.View
        {...closeDrag.panHandlers}
        accessibilityElementsHidden={!isOpen}
        onAccessibilityEscape={() => onOpenChange(false)}
        pointerEvents={isOpen ? "auto" : "none"}
        style={[
          styles.sidebar,
          isSheet && styles.sidebarOver,
          !isAside && styles.hidden,
          {
            width,
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [isSheet ? 1 : CLOSED_SIDEBAR_OPACITY, 1],
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isSheet ? -width : -width * SIDEBAR_DRIFT, 0],
                }),
              },
            ],
          },
        ]}
      >
        {sidebar}
      </Animated.View>
      <Animated.View
        {...(isOpen ? {} : openDrag.panHandlers)}
        accessibilityElementsHidden={isOpen}
        style={[
          styles.page,
          isAside && !isSheet && styles.pageAside,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, isSheet ? 0 : width],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, isSheet ? 1 : REVEAL_SCALE],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.fill} pointerEvents={isOpen ? "none" : "auto"}>
          {children}
        </View>
      </Animated.View>
      {isSheet && isAside && (
        <Animated.View
          pointerEvents="none"
          style={[styles.scrim, { opacity: progress }]}
        />
      )}
      {isOpen && (
        <View
          {...closeDrag.panHandlers}
          style={[styles.closeArea, { left: width }]}
        >
          <Pressable
            style={styles.fill}
            onPress={() => onOpenChange(false)}
            accessibilityRole="button"
            accessibilityLabel="Close the sidebar"
          />
        </View>
      )}
    </View>
  )
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    frame: { flex: 1, backgroundColor: theme.colors.frame },
    sidebar: { position: "absolute", top: 0, bottom: 0, left: 0 },
    hidden: { display: "none" },
    sidebarOver: {
      zIndex: 2,
      backgroundColor: theme.colors.frame,
      boxShadow: theme.shadows.raised,
    },
    scrim: {
      ...StyleSheet.absoluteFill,
      zIndex: 1,
      backgroundColor: theme.colors.scrim,
    },
    page: {
      flex: 1,
      transformOrigin: "left center",
      backgroundColor: theme.colors.main,
    },
    pageAside: {
      borderRadius: theme.radius["2xl"],
      boxShadow: theme.shadows.page,
      overflow: "hidden",
    },
    closeArea: { position: "absolute", top: 0, bottom: 0, right: 0, zIndex: 3 },
  })
