import * as React from "react"
import { MoonIcon, SunIcon } from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { BlurTargetView, BlurView } from "expo-blur"
import { StyleSheet, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import type {
  ThemeToggleStart,
  ThemeToggleTheme,
  ThemeToggleVariant,
} from "@/registry/fabricator/shared/lib/theme-toggle-model"
import { useMotion } from "@/registry/native/lib/motion"
import { Button } from "@/registry/native/ui/button"

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

type ThemeToggleOptions = {
  theme: ThemeToggleTheme | undefined
  onThemeChange: (theme: ThemeToggleTheme) => void
  variant?: ThemeToggleVariant
  start?: ThemeToggleStart
}

function useThemeToggle({ theme, onThemeChange }: ThemeToggleOptions) {
  const latest = React.useRef(theme)
  React.useEffect(() => {
    latest.current = theme
  }, [theme])
  const toggle = () => {
    if (latest.current === undefined) return
    const next = latest.current === "dark" ? "light" : "dark"
    latest.current = next
    onThemeChange(next)
  }
  return { isDark: theme === "dark", mounted: true, toggle }
}

type ThemeToggleProps = Omit<
  React.ComponentProps<typeof Button>,
  "variant" | "children"
> &
  ThemeToggleOptions & {
    buttonVariant?: React.ComponentProps<typeof Button>["variant"]
    labels?: { switchToLight?: string; switchToDark?: string }
  }

function ThemeToggle({
  theme,
  onThemeChange,
  variant = "circle-blur",
  start = "trigger",
  buttonVariant = "ghost",
  size = "icon",
  labels,
  className,
  disabled,
  onPress,
  ...props
}: ThemeToggleProps) {
  const { isDark, mounted, toggle } = useThemeToggle({
    theme,
    onThemeChange,
    variant,
    start,
  })
  const blurTarget = React.useRef<React.ComponentRef<typeof View>>(null)
  const motion = useMotion("move")
  const progress = useSharedValue(isDark ? 1 : 0)
  React.useEffect(() => {
    progress.set(
      withTiming(isDark ? 1 : 0, {
        duration: motion.isOff || motion.isReduced ? 0 : motion.enterMs,
        easing: motion.enterEasing,
      })
    )
  }, [isDark, motion, progress])
  const sunStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { rotate: `${progress.value * 45}deg` },
      { scale: 1 - progress.value * 0.75 },
    ],
  }))
  const blurStyle = useAnimatedStyle(() => ({
    opacity: Math.sin(progress.value * Math.PI),
  }))
  const moonStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { rotate: `${(progress.value - 1) * 45}deg` },
      { scale: 0.25 + progress.value * 0.75 },
    ],
  }))
  return (
    <Button
      {...props}
      data-slot="theme-toggle"
      data-theme={isDark ? "dark" : "light"}
      data-ready={mounted && theme !== undefined}
      variant={buttonVariant}
      size={size}
      disabled={disabled || theme === undefined}
      accessibilityLabel={
        props.accessibilityLabel ??
        props["aria-label"] ??
        (isDark
          ? (labels?.switchToLight ?? "Switch to light theme")
          : (labels?.switchToDark ?? "Switch to dark theme"))
      }
      data-sound="tick"
      className={cn(className)}
      onPress={(event) => {
        onPress?.(event)
        if (event.isDefaultPrevented() || disabled) return
        toggle()
      }}
    >
      <View
        data-slot="theme-toggle-icon"
        aria-hidden
        className="cn-theme-toggle-icon relative items-center justify-center"
        style={{ opacity: theme === undefined ? 0 : 1 }}
      >
        <BlurTargetView
          ref={blurTarget}
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <Animated.View
            data-slot="theme-toggle-sun"
            className="cn-theme-toggle-sun absolute"
            style={sunStyle}
          >
            <SunIcon />
          </Animated.View>
          <Animated.View
            data-slot="theme-toggle-moon"
            className="cn-theme-toggle-moon absolute"
            style={moonStyle}
          >
            <MoonIcon />
          </Animated.View>
        </BlurTargetView>
        <AnimatedBlurView
          data-slot="theme-toggle-blur"
          pointerEvents="none"
          blurTarget={blurTarget}
          blurMethod="dimezisBlurView"
          intensity={20}
          style={[StyleSheet.absoluteFill, blurStyle]}
        />
      </View>
    </Button>
  )
}

export {
  ThemeToggle,
  useThemeToggle,
  type ThemeToggleOptions,
  type ThemeToggleProps,
  type ThemeToggleStart,
  type ThemeToggleTheme,
  type ThemeToggleVariant,
}
