import * as React from "react"
import { SearchIcon, XIcon } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, TextInput, View } from "react-native"
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"

import { useMotion, usePressScale } from "@/registry/native/lib/motion"
import {
  nextSearchAction,
  toDimension,
} from "@/registry/native/lib/search-model"
import { DensityScope, type Density } from "@/registry/native/ui/density"
import { TextStyle } from "@/registry/native/ui/text"

// A search button that opens into a search field, as one object: the round
// button grows its width, the icon stays put at the start, and the field fades
// in and takes focus. Leaving an empty field closes it.

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

// A control's size="sm" pins it to compact and size="lg" to spacious.
const SIZE_DENSITY: Partial<Record<SearchSize, Density>> = {
  sm: "compact",
  lg: "spacious",
}

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
  const feedback = useMotion("feedback")
  const press = usePressScale()
  const fieldOpacity = useSharedValue(open ? 1 : 0)

  // The field fades in once the width is on its way, and out at once.
  React.useEffect(() => {
    fieldOpacity.value = open
      ? withDelay(
          feedback.enterMs,
          withTiming(1, { duration: move.enterMs, easing: move.enterEasing })
        )
      : withTiming(0, {
          duration: feedback.exitMs,
          easing: feedback.exitEasing,
        })
  }, [
    feedback.enterMs,
    feedback.exitEasing,
    feedback.exitMs,
    fieldOpacity,
    move.enterEasing,
    move.enterMs,
    open,
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

  return (
    <DensityScope density={SIZE_DENSITY[size ?? "default"]}>
      <Animated.View
        data-slot="search"
        data-open={open}
        data-variant={variant}
        data-size={size}
        data-collapsible={collapsible}
        layout={layout}
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
          hitSlop={4}
          onPress={() =>
            apply(nextSearchAction("open", { value, collapsible }))
          }
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          className="cn-search-trigger absolute inset-y-0 start-0 z-10 aspect-square items-center justify-center"
        >
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
          <Pressable
            data-slot="search-clear"
            role="button"
            aria-label="Clear search"
            hitSlop={4}
            onPress={() => {
              setValue("")
              inputRef.current?.focus()
            }}
            className="cn-search-clear absolute inset-y-0 end-0 aspect-square items-center justify-center"
          >
            <TextStyle className="cn-search-clear-text">
              <XIcon aria-hidden />
            </TextStyle>
          </Pressable>
        ) : null}
      </Animated.View>
    </DensityScope>
  )
}

export { Search, nextSearchAction, searchVariants }
