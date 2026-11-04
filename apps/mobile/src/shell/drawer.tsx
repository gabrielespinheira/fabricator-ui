import * as React from "react"
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
} from "react-native"

// The move timing: in on 260ms with the entrance curve, out on 200ms.
const ENTER_MS = 260
const EXIT_MS = 200

/**
 * The phone sidebar: slides in from the leading edge over a scrim. A tap on
 * the scrim, a swipe back or the system's back gesture closes it. Reduced
 * motion shows and hides it in place.
 */
export function Drawer({
  isOpen,
  onClose,
  width,
  backgroundColor,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  width: number
  /** Opaque, so the panel's shadow renders efficiently. */
  backgroundColor: string
  children: React.ReactNode
}) {
  const progress = React.useRef(new Animated.Value(0)).current
  const [isMounted, setIsMounted] = React.useState(isOpen)
  const [reduceMotion, setReduceMotion] = React.useState(false)

  React.useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    )
    return () => subscription.remove()
  }, [])

  React.useEffect(() => {
    if (isOpen) setIsMounted(true)
    const animation = Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: reduceMotion ? 0 : isOpen ? ENTER_MS : EXIT_MS,
      easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    })
    animation.start(({ finished }) => {
      if (finished && !isOpen) setIsMounted(false)
    })
    return () => animation.stop()
  }, [isOpen, progress, reduceMotion])

  const swipe = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dx < -8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_event, gesture) =>
          progress.setValue(Math.max(0, Math.min(1, 1 + gesture.dx / width))),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx < -width / 3 || gesture.vx < -0.5) {
            onClose()
            return
          }
          Animated.spring(progress, {
            toValue: 1,
            useNativeDriver: true,
            bounciness: 0,
          }).start()
        },
      }),
    [progress, width, onClose]
  )

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.scrim,
          {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.45],
            }),
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close the sidebar"
        />
      </Animated.View>
      <Animated.View
        {...swipe.panHandlers}
        accessibilityViewIsModal
        style={[
          styles.panel,
          {
            width,
            backgroundColor,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width, 0],
                }),
              },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: "#000000" },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 4, height: 0 },
  },
})
