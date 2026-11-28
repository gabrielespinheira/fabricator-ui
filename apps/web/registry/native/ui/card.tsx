import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, View } from "react-native"
import { useResolveClassNames } from "uniwind"

import { useFeedback } from "@/registry/native/lib/feedback"
import { SurfaceColorProvider } from "@/registry/native/lib/surface-color"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type CardSize = "default" | "sm"
type CardVariant = "default" | "muted" | "tray"
type CardState = { size: CardSize; variant: CardVariant }

// React Native has no group-data-* or :has(): parts read the card's size and
// variant from here, and a CardLink hands the card its press.
const CardContext = React.createContext<CardState>({
  size: "default",
  variant: "default",
})
const CardLinkContext = React.createContext<
  ((press: (() => void) | null) => void) | null
>(null)

const cardVariants = cva("cn-card flex-col", {
  variants: {
    variant: {
      default: "cn-card-variant-default",
      muted: "cn-card-variant-muted",
      tray: "cn-card-variant-tray",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

// The card's surface, for fades painted over its content. A muted card is a
// wash over what's around it, so it keeps that surface.
const cardSurfaceVariants = cva("", {
  variants: {
    variant: {
      default: "cn-card-surface-color",
      muted: "",
      tray: "cn-card-surface-color",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Card({
  className,
  size = "default",
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  size?: CardSize
} & VariantProps<typeof cardVariants>) {
  const feedback = useFeedback()
  const pressRef = React.useRef<(() => void) | null>(null)
  const [isLinked, setIsLinked] = React.useState(false)
  const register = React.useCallback((press: (() => void) | null) => {
    pressRef.current = press
    setIsLinked(press !== null)
  }, [])
  const state = React.useMemo(
    () => ({ size, variant: variant ?? "default" }),
    [size, variant]
  )
  const shared = {
    "data-slot": "card",
    "data-size": size,
    "data-variant": variant,
    className: cn(cardVariants({ variant, className })),
    ...props,
  }
  const content = renderTextChildren(children)
  const { color: surfaceColor } = useResolveClassNames(
    cardSurfaceVariants({ variant })
  )
  return (
    <SurfaceColorProvider
      color={typeof surfaceColor === "string" ? surfaceColor : undefined}
    >
      <CardContext value={state}>
        <CardLinkContext value={register}>
          <TextStyle className="cn-card-text">
            {isLinked ? (
              // The CardLink is what a screen reader focuses; the card only
              // widens its target, as the link's cover does on the website.
              <Pressable
                {...shared}
                accessible={false}
                onPress={() => {
                  feedback("tick")
                  pressRef.current?.()
                }}
              >
                {content}
              </Pressable>
            ) : (
              <View {...shared}>{content}</View>
            )}
          </TextStyle>
        </CardLinkContext>
      </CardContext>
    </SurfaceColorProvider>
  )
}

function findPart(children: React.ReactNode, part: React.ElementType) {
  return React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === part
  )
}

// The website's header grid: media, then the title and description, then the
// action, each column present only when its part is.
function CardHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { size, variant } = React.use(CardContext)
  const parts = React.Children.toArray(children)
  const media = parts.filter(
    (child) => React.isValidElement(child) && child.type === CardMedia
  )
  const action = parts.filter(
    (child) => React.isValidElement(child) && child.type === CardAction
  )
  const text = parts.filter(
    (child) =>
      !React.isValidElement(child) ||
      (child.type !== CardMedia && child.type !== CardAction)
  )
  const hasDescription = findPart(children, CardDescription)
  return (
    <View
      data-slot="card-header"
      data-size={size}
      data-variant={variant}
      data-description={hasDescription}
      className={cn("cn-card-header flex-row", className)}
      {...props}
    >
      {media}
      <View className="cn-card-header-text min-w-0 flex-1">
        {renderTextChildren(text)}
      </View>
      {action}
    </View>
  )
}

const cardMediaVariants = cva(
  "cn-card-media shrink-0 items-center justify-center",
  {
    variants: {
      variant: {
        default: "cn-card-media-variant-default",
        icon: "cn-card-media-variant-icon",
        image: "cn-card-media-variant-image",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/** The header's leading picture: an icon tile, a logo or an avatar. */
function CardMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof View> & VariantProps<typeof cardMediaVariants>) {
  const { size } = React.use(CardContext)
  return (
    <View
      data-slot="card-media"
      data-variant={variant}
      data-size={size}
      className={cn(cardMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  const { size } = React.use(CardContext)
  return (
    <Text
      data-slot="card-title"
      data-size={size}
      role="heading"
      className={cn("cn-card-title", className)}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { size } = React.use(CardContext)
  return (
    <Text
      data-slot="card-description"
      data-size={size}
      className={cn("cn-card-description", className)}
      {...props}
    />
  )
}

function CardAction({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="card-action"
      className={cn("cn-card-action", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

/**
 * The title's link to the record. The whole card takes its press, while the
 * buttons and switches inside the card keep their own.
 */
function CardLink({
  className,
  onPress,
  ...props
}: React.ComponentProps<typeof Text> & { onPress: () => void }) {
  const register = React.use(CardLinkContext)
  const pressRef = React.useRef(onPress)
  React.useLayoutEffect(() => {
    pressRef.current = onPress
  })
  React.useLayoutEffect(() => {
    register?.(() => pressRef.current())
    return () => register?.(null)
  }, [register])
  return (
    <Text
      data-slot="card-link"
      role="link"
      className={cn("cn-card-link", className)}
      onPress={onPress}
      {...props}
    />
  )
}

function CardContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { size, variant } = React.use(CardContext)
  return (
    <View
      data-slot="card-content"
      data-size={size}
      data-variant={variant}
      className={cn("cn-card-content", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

/** The headline figure. A caption or a Delta after it wraps under it. */
function CardValue({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { size } = React.use(CardContext)
  return (
    <View
      data-slot="card-value"
      data-size={size}
      className={cn(
        "cn-card-value flex-row flex-wrap items-baseline",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text data-size={size} className="cn-card-value-figure">
            {child}
          </Text>
        ) : (
          child
        )
      )}
    </View>
  )
}

/** Muted text after a value: a unit, a total ("of 200K"), a previous value. */
function CardValueCaption({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { size } = React.use(CardContext)
  return (
    <Text
      data-slot="card-value-caption"
      data-size={size}
      className={cn("cn-card-value-caption", className)}
      {...props}
    />
  )
}

function CardFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { size, variant } = React.use(CardContext)
  return (
    <TextStyle className="cn-card-footer-text">
      <View
        data-slot="card-footer"
        data-size={size}
        data-variant={variant}
        className={cn("cn-card-footer flex-row items-center", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </TextStyle>
  )
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardLink,
  CardMedia,
  CardTitle,
  CardValue,
  CardValueCaption,
  cardVariants,
}
