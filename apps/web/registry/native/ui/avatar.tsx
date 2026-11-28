import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Image, View, type ImageSourcePropType } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import { getAvatarPart } from "@/registry/native/lib/avatar-group-model"
import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/native/ui/tooltip"

type AvatarSize = "default" | "sm" | "lg"
type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error"

// React Native has no group-data-*: parts read the avatar's size from here, and
// the fallback reads whether the image has loaded.
const AvatarContext = React.createContext<{
  size: AvatarSize
  status: ImageLoadingStatus
  setStatus: (status: ImageLoadingStatus) => void
}>({ size: "default", status: "idle", setStatus: () => {} })

// The group's size for its count: the website reads it with group-has-data-*.
const AvatarGroupContext = React.createContext<AvatarSize>("default")

// Marks which of a group's avatars is held, so the others part around it.
const AvatarGroupPartingContext = React.createContext<
  ((index: number, isActive: boolean) => void) | null
>(null)
const AvatarGroupItemContext = React.createContext<number | null>(null)

// The website's geometry: avatars overlap by a third of their size, and while
// one is held it lifts 3pt and grows to 1.06 as the others slide a quarter of
// their size away from it.
const PART_LIFT = -3
const PART_SCALE = 1.06
// Each item's border-2 ring, which a margin has to take in to overlap as much.
const ITEM_RING = 2

const AVATAR_SIZE_TOKEN: Record<AvatarSize, string> = {
  default: "--density-32",
  sm: "--density-24",
  lg: "--density-40",
}

type AvatarTooltip = string | React.ComponentProps<typeof TooltipContent>

const avatarFallbackTextVariants = cva("cn-avatar-fallback-text", {
  variants: {
    size: {
      default: "cn-avatar-fallback-text-size-default",
      sm: "cn-avatar-fallback-text-size-sm",
      lg: "cn-avatar-fallback-text-size-lg",
    },
  },
})

const COUNT_ICON_TOKEN: Record<AvatarSize, string> = {
  default: "--density-icon-16",
  sm: "--density-12",
  lg: "--density-20",
}

function Avatar({
  className,
  size = "default",
  tooltip,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  size?: "default" | "sm" | "lg"
  tooltip?: AvatarTooltip
}) {
  const [status, setStatus] = React.useState<ImageLoadingStatus>("idle")
  const context = React.useMemo(
    () => ({ size, status, setStatus }),
    [size, status]
  )
  const avatar = (
    <View
      data-slot="avatar"
      data-size={size}
      className={cn("cn-avatar relative shrink-0 flex-row", className)}
      {...props}
    >
      {renderTextChildren(children)}
      <View pointerEvents="none" className="cn-avatar-edge absolute inset-0" />
    </View>
  )
  return (
    <AvatarContext value={context}>
      {tooltip ? (
        <AvatarWithTooltip tooltip={tooltip}>{avatar}</AvatarWithTooltip>
      ) : (
        avatar
      )}
    </AvatarContext>
  )
}

// A long press shows the name, as the website's hover does; in a group the
// others part around the avatar while it's held and while its name shows.
function AvatarWithTooltip({
  tooltip,
  children,
}: {
  tooltip: AvatarTooltip
  children: React.ReactNode
}) {
  const setActive = React.use(AvatarGroupPartingContext)
  const index = React.use(AvatarGroupItemContext)
  const [isPressed, setIsPressed] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const isActive = isPressed || isOpen
  React.useEffect(() => {
    if (!setActive || index === null || !isActive) return
    setActive(index, true)
    return () => setActive(index, false)
  }, [index, isActive, setActive])

  const tooltipProps =
    typeof tooltip === "string" ? { children: tooltip } : tooltip
  return (
    <Tooltip onOpenChange={setIsOpen}>
      <TooltipTrigger
        accessibilityRole="image"
        accessibilityLabel={
          typeof tooltipProps.children === "string"
            ? tooltipProps.children
            : undefined
        }
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent {...tooltipProps} />
    </Tooltip>
  )
}

function getImageKey(src?: string, source?: ImageSourcePropType) {
  if (src) return src
  if (source === undefined || typeof source === "number") return source
  return ("length" in source ? source[0] : source)?.uri
}

function AvatarImage({
  className,
  src,
  source,
  onLoad,
  onError,
  onLoadingStatusChange,
  ...props
}: React.ComponentProps<typeof Image> & {
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void
}) {
  const { status, setStatus } = React.use(AvatarContext)
  const imageKey = getImageKey(src, source)

  // A layout effect, so a cached image's onLoad can't land before this reset.
  React.useLayoutEffect(() => {
    setStatus(imageKey === undefined ? "error" : "loading")
  }, [imageKey, setStatus])

  const statusListener = React.useRef(onLoadingStatusChange)
  React.useLayoutEffect(() => {
    statusListener.current = onLoadingStatusChange
  })
  React.useLayoutEffect(() => {
    if (status !== "idle") statusListener.current?.(status)
  }, [status])

  if (imageKey === undefined) return null
  // The image has to be mounted to load: it stays under the fallback until then.
  return (
    <Image
      data-slot="avatar-image"
      src={src}
      source={source}
      className={cn("cn-avatar-image absolute inset-0 size-full", className)}
      onLoad={(event) => {
        setStatus("loaded")
        onLoad?.(event)
      }}
      onError={(event) => {
        setStatus("error")
        onError?.(event)
      }}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  delay,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  delay?: number
}) {
  const { size, status } = React.use(AvatarContext)
  const [isDelayOver, setIsDelayOver] = React.useState(delay === undefined)
  React.useEffect(() => {
    if (delay === undefined) return
    const timer = setTimeout(() => setIsDelayOver(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (status === "loaded" || !isDelayOver) return null
  return (
    <TextStyle className={avatarFallbackTextVariants({ size })}>
      <View
        data-slot="avatar-fallback"
        className={cn(
          "cn-avatar-fallback size-full items-center justify-center",
          className
        )}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </TextStyle>
  )
}

function AvatarBadge({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { size } = React.use(AvatarContext)
  return (
    <TextStyle className="cn-avatar-badge-text">
      <IconProvider size={8}>
        <View
          data-slot="avatar-badge"
          data-size={size}
          className={cn(
            "cn-avatar-badge absolute z-10 items-center justify-center",
            className
          )}
          {...props}
        >
          {size === "sm" ? null : renderTextChildren(children)}
        </View>
      </IconProvider>
    </TextStyle>
  )
}

function AvatarGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const items = React.Children.toArray(children)
  const size = items
    .map((item) =>
      React.isValidElement<{ size?: AvatarSize }>(item) && item.type === Avatar
        ? item.props.size
        : undefined
    )
    .find(Boolean)
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
  const setActive = React.useCallback(
    (index: number, isActive: boolean) =>
      setActiveIndex((current) =>
        isActive ? index : current === index ? null : current
      ),
    []
  )
  return (
    <AvatarGroupContext value={size ?? "default"}>
      <AvatarGroupPartingContext value={setActive}>
        <View
          data-slot="avatar-group"
          className={cn("cn-avatar-group flex-row items-center", className)}
          {...props}
        >
          {/* No -space-x-* or ring-* here: a bordered wrapper overlaps its neighbour. */}
          {items.map((item, index) => (
            <AvatarGroupItem
              key={React.isValidElement(item) ? item.key : index}
              index={index}
              activeIndex={activeIndex}
            >
              {item}
            </AvatarGroupItem>
          ))}
        </View>
      </AvatarGroupPartingContext>
    </AvatarGroupContext>
  )
}

// Springs to its place in the parting on the settle role, both ways, as the
// website does. Reduced motion and motion off keep the held avatar in front and
// drop the moves.
function AvatarGroupItem({
  index,
  activeIndex,
  children,
}: {
  index: number
  activeIndex: number | null
  children: React.ReactNode
}) {
  const motion = useMotion("settle")
  const size = React.use(AvatarGroupContext)
  const avatarSize = parseNumber(useCSSVariable(AVATAR_SIZE_TOKEN[size]), 32)
  const part = getAvatarPart(index, activeIndex)
  const isStill = motion.isReduced || motion.isOff
  const shift = useSharedValue(0)
  const lift = useSharedValue(0)
  React.useEffect(() => {
    const isParting = activeIndex !== null
    const config = {
      duration: isParting ? motion.enterMs : motion.exitMs,
      easing: motion.settleEasing,
    }
    const distance = isStill ? 0 : (part.shift * avatarSize) / 4
    shift.set(withTiming(distance, config))
    lift.set(withTiming(isStill || !part.isLifted ? 0 : 1, config))
  }, [
    activeIndex,
    avatarSize,
    isStill,
    lift,
    motion,
    part.isLifted,
    part.shift,
    shift,
  ])
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: shift.get() },
      { translateY: lift.get() * PART_LIFT },
      { scale: 1 + lift.get() * (PART_SCALE - 1) },
    ],
  }))
  const overlap = index === 0 ? 0 : avatarSize / 3 + ITEM_RING * 2
  return (
    <AvatarGroupItemContext value={index}>
      <Animated.View
        className="cn-avatar-group-item"
        style={[
          style,
          { marginStart: -overlap, zIndex: part.isLifted ? 10 : 0 },
        ]}
      >
        {children}
      </Animated.View>
    </AvatarGroupItemContext>
  )
}

function AvatarGroupCount({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const size = React.use(AvatarGroupContext)
  const iconSize = parseNumber(useCSSVariable(COUNT_ICON_TOKEN[size]), 16)
  return (
    <TextStyle className="cn-avatar-group-count-text">
      <IconProvider size={iconSize}>
        <View
          data-slot="avatar-group-count"
          data-size={size}
          className={cn(
            "cn-avatar-group-count relative shrink-0 items-center justify-center",
            className
          )}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </IconProvider>
    </TextStyle>
  )
}

export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
}
