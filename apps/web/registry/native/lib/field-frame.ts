import * as React from "react"
import type { TextInput } from "react-native"
import { useResolveClassNames } from "uniwind"

import { useMotion } from "@/registry/native/lib/motion"

type FocusEvents = Pick<
  React.ComponentProps<typeof TextInput>,
  "onFocus" | "onBlur"
>

/**
 * A text field's frame, which lifts on focus and eases there on the feedback
 * timing: a `focus:` class could only snap. The two class names resolve to the
 * colours it moves between. An invalid field keeps its class's frame.
 */
function useFieldFrame({
  restClassName,
  focusClassName,
  isInvalid,
  onFocus,
  onBlur,
}: FocusEvents & {
  restClassName: string
  focusClassName: string
  isInvalid: boolean
}) {
  const [isFocused, setIsFocused] = React.useState(false)
  const motion = useMotion("feedback")
  const rest = useResolveClassNames(restClassName)
  const focus = useResolveClassNames(focusClassName)
  const colors = isFocused ? focus : rest
  return {
    isFocused,
    onFocus: ((event) => {
      setIsFocused(true)
      onFocus?.(event)
    }) satisfies FocusEvents["onFocus"],
    onBlur: ((event) => {
      setIsFocused(false)
      onBlur?.(event)
    }) satisfies FocusEvents["onBlur"],
    frameStyle: {
      backgroundColor: colors.backgroundColor,
      ...(isInvalid ? {} : { borderColor: colors.borderColor }),
      transitionProperty: ["backgroundColor", "borderColor"],
      transitionDuration: motion.enterMs,
      transitionTimingFunction: "ease",
    },
  }
}

export { useFieldFrame }
