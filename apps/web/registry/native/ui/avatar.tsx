import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Image, View, type ImageSourcePropType } from "react-native"
import { useCSSVariable } from "uniwind"

import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

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
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  size?: "default" | "sm" | "lg"
}) {
  const [status, setStatus] = React.useState<ImageLoadingStatus>("idle")
  const context = React.useMemo(
    () => ({ size, status, setStatus }),
    [size, status]
  )
  return (
    <AvatarContext value={context}>
      <View
        data-slot="avatar"
        data-size={size}
        className={cn("cn-avatar relative shrink-0 flex-row", className)}
        {...props}
      >
        {renderTextChildren(children)}
        <View
          pointerEvents="none"
          className="cn-avatar-edge absolute inset-0"
        />
      </View>
    </AvatarContext>
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
  return (
    <AvatarGroupContext value={size ?? "default"}>
      <View
        data-slot="avatar-group"
        className={cn("cn-avatar-group flex-row items-center", className)}
        {...props}
      >
        {/* No -space-x-* or ring-* here: a bordered wrapper overlaps its neighbour. */}
        {items.map((item, index) => (
          <View
            key={React.isValidElement(item) ? item.key : index}
            data-first={index === 0}
            className="cn-avatar-group-item"
          >
            {item}
          </View>
        ))}
      </View>
    </AvatarGroupContext>
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
      <IconProvider size={iconSize} strokeWidth={1.5}>
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
