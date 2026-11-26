import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, View, type LayoutChangeEvent } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg"
import { useCSSVariable, useResolveClassNames, useUniwind } from "uniwind"

import {
  FOLDER_FRONT_PATH,
  FOLDER_FRONT_VIEW_BOX,
  getFolderFileCount,
  getFolderFilePose,
} from "@/registry/fabricator/shared/lib/folder-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  getFolderColors,
  type FolderColors,
} from "@/registry/native/lib/folder-colors"
import { useMotion, usePressScale } from "@/registry/native/lib/motion"
import { usePaletteMark } from "@/registry/native/lib/palette-color"
import { PressWash, StateFill } from "@/registry/native/lib/press-wash"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// A folder as a tile, the way a drive shows one: the folder drawn with its
// first files peeking out, its name and its details below. The website's
// poses and front panel, from folder-model. A press (or a pointer resting on
// it, on iPad) lifts the files out and tips the front forward; `open` holds
// it there.

const [, , FRONT_WIDTH, FRONT_HEIGHT] =
  FOLDER_FRONT_VIEW_BOX.split(" ").map(Number)
// iOS doesn't antialias the bounds of a view tilted in 3D, so the front is
// drawn inside a margin of clear pixels, in view box units; it still pivots
// on the shape's foot.
const FRONT_MARGIN = 4
const FRONT_DRAWING_BOX = [
  -FRONT_MARGIN,
  -FRONT_MARGIN,
  FRONT_WIDTH + FRONT_MARGIN * 2,
  FRONT_HEIGHT + FRONT_MARGIN * 2,
].join(" ")
const FRONT_DRAWING_ASPECT =
  (FRONT_WIDTH + FRONT_MARGIN * 2) / (FRONT_HEIGHT + FRONT_MARGIN * 2)
const FRONT_INSET = `${(-FRONT_MARGIN / FRONT_WIDTH) * 100}%` as const
const FRONT_PIVOT = `${((FRONT_HEIGHT + FRONT_MARGIN) / (FRONT_HEIGHT + FRONT_MARGIN * 2)) * 100}%`
// The website's 4:3 drawing, its sheets 46% of its width at 3:4, and the
// shares of the width its corners and the front's tilt are drawn in.
const PREVIEW_ASPECT = 4 / 3
// Glass lines the folder in the front's colour, so the pane shows a lit
// interior rather than the dark back. The website's lining tilts with the
// glass; tilted here, iOS would stack it above the files by depth, so it
// stays flat and starts low enough (in shares of the width) that the open
// front, tipped and dropped, still covers its top.
const LINING_HEIGHT = (FRONT_HEIGHT / FRONT_WIDTH) * 0.78
const FILE_WIDTH = 0.46
const FILE_ASPECT = 3 / 4
const BACK_RADIUS = 0.05
const FILE_RADIUS = 0.025
// Glass tilts in a long perspective, so its top edge barely widens past the
// back, which fills its width: a wider pane would show the page at its corners.
const PERSPECTIVE = { default: 3.2, glass: 10 }
// The front tips 24deg; glass tips 14deg and slides 4% of its height down,
// so the lifted files stay behind clear glass, as on the website.
const FRONT_TILT = { default: -24, glass: -14 }
const FRONT_DROP = { default: 0, glass: 0.04 }
const STAGGER = 0.5

const folderVariants = cva("cn-folder items-center", {
  variants: {
    variant: {
      default: "cn-folder-variant-default",
      glass: "cn-folder-variant-glass",
    },
    size: {
      sm: "cn-folder-size-sm",
      default: "cn-folder-size-default",
      lg: "cn-folder-size-lg",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
})

// The front's ring colour, read off for the stroke: an SVG takes no class.
const folderFrontEdgeVariants = cva("cn-folder-front-edge")

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type FolderVariant = "default" | "glass"

type FolderState = {
  variant: FolderVariant
  isOpen: boolean
  colors: FolderColors
  width: number
  setWidth: (width: number) => void
}

const FolderContext = React.createContext<FolderState | null>(null)

class FolderPartError extends Error {
  constructor(part: string) {
    super(`${part} must be inside a Folder.`)
    this.name = "FolderPartError"
  }
}

function useFolder(part: string) {
  const folder = React.use(FolderContext)
  if (!folder) throw new FolderPartError(part)
  return folder
}

function useFolderColors(color: string | undefined) {
  const { theme } = useUniwind()
  const readMark = usePaletteMark()
  const [foreground, surface1, surface3, surface4, surface5] = useCSSVariable([
    "--foreground",
    "--surface-1",
    "--surface-3",
    "--surface-4",
    "--surface-5",
  ])
  return React.useMemo(
    () =>
      getFolderColors({
        // Unset is the neutral folder, tinted with the muted text colour.
        mark: readMark(color ?? "gray"),
        foreground: String(foreground),
        surface1: String(surface1),
        surface3: String(surface3),
        surface4: String(surface4),
        surface5: String(surface5),
        isDark: theme === "dark",
      }),
    [color, foreground, readMark, surface1, surface3, surface4, surface5, theme]
  )
}

type FolderProps = Omit<React.ComponentProps<typeof Pressable>, "children"> &
  VariantProps<typeof folderVariants> & {
    children?: React.ReactNode
    /** A palette colour (`blue`), a role (`primary`) or a hex, rgb(), hsl() or oklch() colour. Neutral when unset. */
    color?: string
    /** Holds the folder open, as a press does: a drop target, the folder on view. */
    open?: boolean
  }

function Folder({
  className,
  variant = "default",
  size = "default",
  color,
  open = false,
  children,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  style,
  ...props
}: FolderProps) {
  const [isPressed, setIsPressed] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const [width, setWidth] = React.useState(0)
  const colors = useFolderColors(color)
  const press = usePressScale()
  const feedback = useFeedback()
  const isInteractive = Boolean(onPress)
  const isOpen = open || isPressed || isHovered
  const state = React.useMemo(
    () => ({ variant: variant ?? "default", isOpen, colors, width, setWidth }),
    [colors, isOpen, variant, width]
  )
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.scale.value }],
  }))

  return (
    <FolderContext value={state}>
      <AnimatedPressable
        data-slot="folder"
        data-variant={variant}
        data-size={size}
        data-open={isOpen}
        role={isInteractive ? "button" : undefined}
        accessible={isInteractive}
        className={cn(folderVariants({ variant, size }), className)}
        onPress={(event) => {
          if (!onPress) return
          feedback("tap")
          onPress(event)
        }}
        onPressIn={(event) => {
          setIsPressed(true)
          if (isInteractive) press.onPressIn()
          onPressIn?.(event)
        }}
        onPressOut={(event) => {
          setIsPressed(false)
          if (isInteractive) press.onPressOut()
          onPressOut?.(event)
        }}
        onHoverIn={(event) => {
          setIsHovered(true)
          onHoverIn?.(event)
        }}
        onHoverOut={(event) => {
          setIsHovered(false)
          onHoverOut?.(event)
        }}
        style={[isInteractive ? scaleStyle : undefined, style]}
        {...props}
      >
        <StateFill isOn={open || isHovered} className="cn-folder-wash-open" />
        {isInteractive && (
          <PressWash press={press} className="cn-folder-wash-pressed" />
        )}
        {children}
      </AnimatedPressable>
    </FolderContext>
  )
}

/** The folder drawn: its back, the files inside and the front panel. */
function FolderPreview({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { colors, variant, width, setWidth } = useFolder("FolderPreview")
  const onLayout = React.useCallback(
    (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width),
    [setWidth]
  )
  const isGlass = variant === "glass"
  return (
    <View
      data-slot="folder-preview"
      className={cn("cn-folder-preview relative w-full", className)}
      style={{ aspectRatio: PREVIEW_ASPECT }}
      onLayout={onLayout}
      {...props}
    >
      <View
        data-slot="folder-back"
        className="cn-folder-back absolute"
        style={{
          backgroundColor: colors.back,
          borderRadius: width * BACK_RADIUS,
          // Glass widens the back to fill the front, as on the website.
          left: isGlass ? 0 : "5%",
          right: isGlass ? 0 : "5%",
          top: "4%",
          bottom: isGlass ? "1%" : "8%",
        }}
      />
      {isGlass && (
        <View
          data-slot="folder-lining"
          className="cn-folder-lining absolute inset-x-0 bottom-0"
          style={{
            backgroundColor: colors.front,
            borderRadius: width * BACK_RADIUS,
            height: width * LINING_HEIGHT,
          }}
        />
      )}
      {width > 0 && children}
      {width > 0 && <FolderFront />}
    </View>
  )
}

/** The front's tilt: it tips forward from its foot as the folder opens. */
function useFrontTilt() {
  const { isOpen, width, variant } = useFolder("FolderFront")
  const motion = useMotion("move")
  const tiltDegrees = FRONT_TILT[variant]
  const drop = FRONT_DROP[variant] * (width / FRONT_DRAWING_ASPECT)
  const progress = useSharedValue(isOpen ? 1 : 0)
  const isStill = motion.isOff || motion.isReduced
  React.useEffect(() => {
    progress.set(
      isStill
        ? isOpen
          ? 1
          : 0
        : withTiming(isOpen ? 1 : 0, {
            duration: isOpen ? motion.enterMs : motion.exitMs,
            easing: motion.moveEasing,
            reduceMotion: ReduceMotion.Never,
          })
    )
  }, [isOpen, isStill, motion, progress])
  return useAnimatedStyle(() => ({
    transform: [
      { perspective: width * PERSPECTIVE[variant] },
      { translateY: progress.value * drop },
      { rotateX: `${progress.value * tiltDegrees}deg` },
    ],
  }))
}

function FolderFront() {
  const { colors, variant, width } = useFolder("FolderFront")
  const tilt = useFrontTilt()
  const id = React.useId()
  const { color: edge } = useResolveClassNames(folderFrontEdgeVariants())
  const isGlass = variant === "glass"
  return (
    <Animated.View
      data-slot="folder-front"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="cn-folder-front absolute"
      style={[
        {
          left: FRONT_INSET,
          right: FRONT_INSET,
          bottom: (-FRONT_MARGIN / FRONT_WIDTH) * width,
          aspectRatio: FRONT_DRAWING_ASPECT,
          transformOrigin: ["50%", FRONT_PIVOT, 0],
        },
        tilt,
      ]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={FRONT_DRAWING_BOX}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={isGlass ? colors.glassTop : colors.frontTop}
            />
            <Stop
              offset="1"
              stopColor={isGlass ? colors.glassBottom : colors.front}
            />
          </LinearGradient>
        </Defs>
        <Path d={FOLDER_FRONT_PATH} fill={`url(#${id}-fill)`} />
        <Path
          d={FOLDER_FRONT_PATH}
          fill="none"
          stroke={String(edge)}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    </Animated.View>
  )
}

type FolderFilePlace = { index: number; count: number }

const FolderFileContext = React.createContext<FolderFilePlace>({
  index: 0,
  count: 1,
})

/** The files that peek out, the first on top. Shows up to three. */
function FolderFiles({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const files = React.Children.toArray(children)
  const count = getFolderFileCount(files.length)
  return (
    <View
      data-slot="folder-files"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={cn("cn-folder-files absolute inset-0", className)}
      {...props}
    >
      {files.slice(0, count).map((file, index) => (
        <FolderFileContext
          key={React.isValidElement(file) && file.key ? file.key : index}
          value={{ index, count }}
        >
          {file}
        </FolderFileContext>
      ))}
    </View>
  )
}

/** Where a file sits as the folder opens: rising one after another on the bounce. */
function useFilePose(index: number, count: number) {
  const { isOpen, width } = useFolder("FolderFile")
  const bounce = useMotion("bounce")
  const move = useMotion("move")
  const feedback = useMotion("feedback")
  const progress = useSharedValue(isOpen ? 1 : 0)
  const isStill = move.isOff || move.isReduced
  React.useEffect(() => {
    if (isStill) {
      progress.set(isOpen ? 1 : 0)
      return
    }
    progress.set(
      isOpen
        ? withDelay(
            index * feedback.enterMs * STAGGER,
            withTiming(1, {
              duration: bounce.enterMs,
              easing: bounce.bounceEasing,
              reduceMotion: ReduceMotion.Never,
            })
          )
        : withTiming(0, {
            duration: move.exitMs,
            easing: move.moveEasing,
            reduceMotion: ReduceMotion.Never,
          })
    )
  }, [bounce, feedback.enterMs, index, isOpen, isStill, move, progress])
  const { rest, open, layer } = getFolderFilePose(index, count)
  const fileWidth = width * FILE_WIDTH
  const fileHeight = fileWidth / FILE_ASPECT
  const style = useAnimatedStyle(() => {
    const share = progress.value
    return {
      transform: [
        { translateX: (rest.x + (open.x - rest.x) * share) * fileWidth },
        { translateY: (rest.y + (open.y - rest.y) * share) * fileHeight },
        { rotate: `${rest.rotate + (open.rotate - rest.rotate) * share}deg` },
      ],
    }
  })
  return { style, layer, fileWidth }
}

/** A sheet of paper with lines, or the thumbnail you put in it. */
function FolderFile({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  const { colors, width } = useFolder("FolderFile")
  const { index, count } = React.use(FolderFileContext)
  const pose = useFilePose(index, count)
  return (
    <Animated.View
      data-slot="folder-file"
      data-index={index}
      className={cn("cn-folder-file absolute overflow-hidden", className)}
      style={[
        {
          left: "27%",
          top: "10%",
          width: pose.fileWidth,
          aspectRatio: FILE_ASPECT,
          borderRadius: width * FILE_RADIUS,
          backgroundColor: colors.paper,
          transformOrigin: "bottom",
          zIndex: pose.layer,
        },
        pose.style,
        style,
      ]}
      {...props}
    >
      {children ?? <FolderFileLines />}
    </Animated.View>
  )
}

const LINES = [0.75, 1, 1, 1, 0.5]

function FolderFileLines() {
  const { colors, width } = useFolder("FolderFile")
  return (
    <View
      data-slot="folder-file-lines"
      className="cn-folder-file-lines"
      style={{ padding: width * 0.045, gap: width * 0.025 }}
    >
      {LINES.map((share, index) => (
        <View
          key={index}
          style={{
            width: `${share * 100}%`,
            height: width * (index === 0 ? 0.03 : 0.015),
            marginBottom: index === 0 ? width * 0.01 : 0,
            borderRadius: width,
            backgroundColor: colors.line,
          }}
        />
      ))}
    </View>
  )
}

/** What's printed on the front panel: a badge, avatars, a logo. */
function FolderCover({
  className,
  children,
  style,
  ...props
}: Omit<React.ComponentProps<typeof Animated.View>, "children"> & {
  children?: React.ReactNode
}) {
  const { width } = useFolder("FolderCover")
  const tilt = useFrontTilt()
  const margin = (FRONT_MARGIN / FRONT_WIDTH) * width
  return (
    <Animated.View
      data-slot="folder-cover"
      className="cn-folder-cover absolute justify-end"
      style={[
        {
          // The front's exact box and pivot: tilted in 3D, iOS stacks views
          // by depth, and any difference would sink the cover behind it.
          left: FRONT_INSET,
          right: FRONT_INSET,
          bottom: -margin,
          aspectRatio: FRONT_DRAWING_ASPECT,
          transformOrigin: ["50%", FRONT_PIVOT, 0],
          padding: width * 0.05 + margin,
          zIndex: 20,
        },
        tilt,
        style,
      ]}
      {...props}
    >
      {/* A row along the foot: a child's own alignSelf (Badge sets one)
          can't lift it off the bottom, as items-end alone would let it. */}
      <View
        className={cn("flex-row items-center justify-between", className)}
        style={{ gap: width * 0.03 }}
      >
        <TextStyle className="cn-folder-cover-text">
          {renderTextChildren(children)}
        </TextStyle>
      </View>
    </Animated.View>
  )
}

function FolderTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="folder-title"
      numberOfLines={1}
      className={cn("cn-folder-title w-full text-center", className)}
      {...props}
    />
  )
}

function FolderDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="folder-description"
      numberOfLines={1}
      className={cn("cn-folder-description w-full text-center", className)}
      {...props}
    />
  )
}

export {
  Folder,
  FolderCover,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
  folderVariants,
}
