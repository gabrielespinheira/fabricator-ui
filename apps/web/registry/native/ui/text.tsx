import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Text as TextPrimitive } from "react-native"
import Animated from "react-native-reanimated"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { wrapTextChildren } from "@/registry/native/lib/text-children"

const TextClassContext = React.createContext<string | undefined>(undefined)

// How long this control's text takes to change colour, when it eases at all.
const TextEaseContext = React.createContext<number | null>(null)

const AnimatedTextPrimitive = Animated.createAnimatedComponent(TextPrimitive)

const textVariants = cva("cn-text")

// Named sizes bring their own line height; `leading-*` chooses one.
const SETS_LINE_HEIGHT = /(^|\s)(leading-|text-(xs|sm|base|lg|xl|\dxl)(\s|$))/

/**
 * Text the website gives 1.5 of line height by inheritance. Inter's own is 1.21,
 * which sets paragraphs tighter than the design. `cn` drops a line height when a
 * font size follows it, so it goes on after the merge.
 */
function withLineHeight(className: string) {
  return SETS_LINE_HEIGHT.test(className)
    ? className
    : `${className} leading-normal`
}

/** Text whose colour follows its control's state on the feedback timing. */
function EasedText({
  className,
  duration,
  style,
  ...props
}: React.ComponentProps<typeof TextPrimitive> & { duration: number }) {
  const { color } = useResolveClassNames(className ?? "")
  return (
    <AnimatedTextPrimitive
      data-slot="text"
      className={className}
      style={[
        typeof color === "string"
          ? {
              color,
              transitionProperty: "color",
              transitionDuration: duration,
              transitionTimingFunction: "ease",
            }
          : undefined,
        style,
      ]}
      {...props}
    />
  )
}

function Text({
  className,
  ...props
}: React.ComponentProps<typeof TextPrimitive>) {
  const inherited = React.use(TextClassContext)
  const duration = React.use(TextEaseContext)
  const merged = withLineHeight(cn(textVariants(), inherited, className))
  if (duration !== null) {
    return <EasedText className={merged} duration={duration} {...props} />
  }
  return <TextPrimitive data-slot="text" className={merged} {...props} />
}

function TextEase({ children }: { children?: React.ReactNode }) {
  const motion = useMotion("feedback")
  return <TextEaseContext value={motion.enterMs}>{children}</TextEaseContext>
}

/**
 * What a web element's text and icons inherit from it: React Native has no
 * cascade, so a control passes its text classes and icon colour down.
 */
function TextStyle({
  className,
  eases = false,
  children,
}: {
  className?: string
  /** Its colour changes with state: the text eases there, as on the website. */
  eases?: boolean
  children?: React.ReactNode
}) {
  const inherited = React.use(TextClassContext)
  const merged = cn(inherited, className)
  const { color } = useResolveClassNames(merged)
  const iconSize = parseNumber(useCSSVariable("--density-icon-16"), 16)
  const inner = (
    <TextClassContext value={merged}>
      <IconProvider
        size={iconSize}
        {...(typeof color === "string" ? { color } : {})}
      >
        {children}
      </IconProvider>
    </TextClassContext>
  )
  return eases ? <TextEase>{inner}</TextEase> : inner
}

/** Children as React Native can draw them: every bare string in a `Text`. */
function renderTextChildren(children: React.ReactNode) {
  return wrapTextChildren(children, (text, key) => (
    <Text key={key}>{text}</Text>
  ))
}

export { renderTextChildren, Text, TextClassContext, TextStyle }
