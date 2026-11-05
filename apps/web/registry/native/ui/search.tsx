import * as React from "react"
import { SearchIcon, XIcon } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, TextInput, View } from "react-native"
import Animated, {
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"

import { useFeedback, useSurfaceFeedback } from "@/registry/native/lib/feedback"
import {
  useMotion,
  usePressScale,
  useSurfaceAnimation,
} from "@/registry/native/lib/motion"
import { PressWash } from "@/registry/native/lib/press-wash"
import {
  nextSearchAction,
  toDimension,
} from "@/registry/native/lib/search-model"
import { DensityScope, useControlSize } from "@/registry/native/ui/density"
import { TextStyle } from "@/registry/native/ui/text"

// A search button that opens into a search field, as one object: the round
// button grows its width, the icon stays put at the start, and the field fades
// in and takes focus. Leaving an empty field closes it.

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// The clear button's pop, the website's `zoom-in-75`: inside a field, not a surface.
const CLEAR_ZOOM = 0.75
// A closed search is as tall as a button; compact's 28pt takes this to 44pt.
const HIT_SLOP = 8

const searchVariants = cva(
  "cn-search relative shrink-0 flex-row items-center overflow-hidden",
  {
    variants: {
      variant: {
        default: "cn-search-variant-default",
        outline: "cn-search-variant-outline",
      },
      size: {
        default: "cn-search-size-default",
        sm: "cn-search-size-sm",
        lg: "cn-search-size-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type SearchSize = NonNullable<VariantProps<typeof searchVariants>["size"]>

type SearchProps = Omit<
  React.ComponentProps<typeof TextInput>,
  "value" | "defaultValue" | "onChange" | "onChangeText"
> &
  VariantProps<typeof searchVariants> & {
    /** Open (the field is showing). Controlled. */
    open?: boolean
    /** Open on first render. */
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    /** The search text. Controlled. */
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    /** Starts as a round button that opens into the field. Default true. */
    collapsible?: boolean
    /** Shows a clear button while there is text. Default true. */
    clearable?: boolean
    /** Open width, in points or as a length. Each size has a default. */
    width?: number | string
    /** Accessible name for the button and the field. Default "Search". */
    label?: string
    /** Props for the root element. */
    rootProps?: React.ComponentProps<typeof View>
  }

function Search({
  className,
  variant = "default",
  size = "default",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  collapsible = true,
  clearable = true,
  width,
  label = "Search",
  placeholder = "Search",
  rootProps,
  ref,
  onKeyPress,
  onBlur,
  ...props
}: SearchProps) {
  const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null)
  const focusOnOpen = React.useRef(false)

  const [openState = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const [value = "", setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const open = !collapsible || openState

  // Focus moves into the field once it is rendered open.
  React.useEffect(() => {
    if (open && focusOnOpen.current) {
      focusOnOpen.current = false
      inputRef.current?.focus()
    }
  }, [open])

  const setInputRef = React.useCallback(
    (node: React.ComponentRef<typeof TextInput> | null) => {
      inputRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  const apply = (action: ReturnType<typeof nextSearchAction>) => {
    if (action === "open") {
      focusOnOpen.current = true
      setOpen(true)
    } else if (action === "clear") {
      setValue("")
    } else if (action === "close") {
      setOpen(false)
    }
  }

  const move = useMotion("move")
  const quick = useMotion("feedback")
  const press = usePressScale()
  const fieldOpacity = useSharedValue(open ? 1 : 0)
  const clearAnimation = useSurfaceAnimation("feedback", { scale: CLEAR_ZOOM })
  const playFeedback = useFeedback()
  useSurfaceFeedback("dialog", open)

  // The field fades in once the width is on its way, and out at once. Reduce
  // Motion keeps the fade with no wait, and Reanimated would jump it to the end.
  React.useEffect(() => {
    fieldOpacity.value = open
      ? withDelay(
          quick.isReduced ? 0 : quick.enterMs,
          withTiming(1, {
            duration: move.enterMs,
            easing: move.enterEasing,
            reduceMotion: ReduceMotion.Never,
          })
        )
      : withTiming(0, {
          duration: quick.exitMs,
          easing: quick.exitEasing,
          reduceMotion: ReduceMotion.Never,
        })
  }, [
    fieldOpacity,
    move.enterEasing,
    move.enterMs,
    open,
    quick.enterMs,
    quick.exitEasing,
    quick.exitMs,
    quick.isReduced,
  ])

  const rootStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.scale.value }],
  }))
  const fieldStyle = useAnimatedStyle(() => ({
    opacity: fieldOpacity.value,
  }))

  // The width comes from the size's rule or `width`, whatever the unit, so the
  // layout animates it: a percentage has no number to run a timing on.
  const layout =
    move.isOff || move.isReduced
      ? undefined
      : LinearTransition.duration(open ? move.enterMs : move.exitMs).easing(
          open ? move.moveEasing : move.exitEasing
        )
  const openWidth = toDimension(width)
  const hasClear = clearable && open && Boolean(value)
  const { density } = useControlSize(size)

  return (
    <DensityScope density={density}>
      <Animated.View
        data-slot="search"
        data-open={open}
        data-variant={variant}
        data-size={size}
        data-collapsible={collapsible}
        layout={layout}
        // It clips: without this, the button's own reach would stop at its edge.
        hitSlop={open ? undefined : HIT_SLOP}
        {...rootProps}
        className={cn(searchVariants({ variant, size }), className)}
        style={[
          open && openWidth !== undefined ? { width: openWidth } : undefined,
          rootStyle,
          rootProps?.style,
        ]}
      >
        <Pressable
          data-slot="search-trigger"
          data-open={open}
          role="button"
          aria-label={label}
          aria-expanded={collapsible ? open : undefined}
          // Open, the button is just the icon: the field has the focus.
          aria-hidden={open ? true : undefined}
          accessible={!open}
          disabled={open}
          hitSlop={HIT_SLOP}
          onPress={() =>
            apply(nextSearchAction("open", { value, collapsible }))
          }
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          className="cn-search-trigger absolute inset-y-0 start-0 z-10 aspect-square items-center justify-center"
        >
          <PressWash press={press} className="cn-search-trigger-wash" />
          <TextStyle
            className={open ? cn("cn-search-icon-open") : cn("cn-search-icon")}
          >
            <SearchIcon
              data-slot="search-icon"
              aria-hidden
              strokeWidth={1.75}
            />
          </TextStyle>
        </Pressable>
        <Animated.View className="h-full min-w-0 flex-1" style={fieldStyle}>
          <TextInput
            ref={setInputRef}
            data-slot="search-input"
            data-clear={hasClear}
            aria-label={label}
            placeholder={placeholder}
            placeholderTextColorClassName="accent-muted-foreground"
            selectionColorClassName="accent-primary"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            returnKeyType="search"
            // Closed, the field is out of reach: the button opens it.
            editable={open}
            aria-hidden={open ? undefined : true}
            value={value}
            onChangeText={setValue}
            onKeyPress={(event) => {
              onKeyPress?.(event)
              if (event.nativeEvent.key !== "Escape") return
              apply(nextSearchAction("escape", { value, collapsible }))
            }}
            onBlur={(event) => {
              onBlur?.(event)
              if (open) apply(nextSearchAction("blur", { value, collapsible }))
            }}
            className="cn-search-input h-full w-full min-w-0 flex-1 bg-transparent"
            {...props}
          />
        </Animated.View>
        {hasClear ? (
          <AnimatedPressable
            data-slot="search-clear"
            role="button"
            aria-label="Clear search"
            hitSlop={HIT_SLOP}
            entering={clearAnimation.entering}
            style={clearAnimation.origin}
            onPress={() => {
              playFeedback("tap")
              setValue("")
              inputRef.current?.focus()
            }}
            className="cn-search-clear absolute inset-y-0 end-0 aspect-square items-center justify-center"
          >
            <TextStyle className="cn-search-clear-text">
              <XIcon aria-hidden />
            </TextStyle>
          </AnimatedPressable>
        ) : null}
      </Animated.View>
    </DensityScope>
  )
}

export { Search, nextSearchAction, searchVariants }
