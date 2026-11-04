import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { Text as TextPrimitive } from "react-native"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { wrapTextChildren } from "@/registry/native/lib/text-children"

const TextClassContext = React.createContext<string | undefined>(undefined)

function Text({
  className,
  ...props
}: React.ComponentProps<typeof TextPrimitive>) {
  const inherited = React.use(TextClassContext)
  return (
    <TextPrimitive
      data-slot="text"
      className={cn("cn-text", inherited, className)}
      {...props}
    />
  )
}

/**
 * What a web element's text and icons inherit from it: React Native has no
 * cascade, so a control passes its text classes and icon colour down.
 */
function TextStyle({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const inherited = React.use(TextClassContext)
  const merged = cn(inherited, className)
  const { color } = useResolveClassNames(merged)
  const iconSize = parseNumber(useCSSVariable("--density-icon-16"), 16)
  return (
    <TextClassContext value={merged}>
      <IconProvider
        size={iconSize}
        {...(typeof color === "string" ? { color } : {})}
      >
        {children}
      </IconProvider>
    </TextClassContext>
  )
}

/** Children as React Native can draw them: every bare string in a `Text`. */
function renderTextChildren(children: React.ReactNode) {
  return wrapTextChildren(children, (text, key) => (
    <Text key={key}>{text}</Text>
  ))
}

export { renderTextChildren, Text, TextClassContext, TextStyle }
