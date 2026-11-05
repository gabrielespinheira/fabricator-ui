import * as React from "react"
import { MinusIcon } from "@fabricator-ui/icons-react-native"
import { useComposedRefs, useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { TextInput, View } from "react-native"
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"

import { useFieldControl } from "@/registry/native/lib/field-model"
import {
  getNextOtpValue,
  getOtpCaretHoldMs,
  getOtpKeyboardType,
  getOtpSlots,
  isOtpComplete,
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
  type OtpPattern,
} from "@/registry/native/lib/input-otp-model"
import { useMotion } from "@/registry/native/lib/motion"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

const InputOTPContext = React.createContext<{
  slots: ReturnType<typeof getOtpSlots>
  isInvalid: boolean
} | null>(null)

/**
 * The website's `input-otp` draws slots over a hidden input. So does this, with
 * a `TextInput` that takes the system's one-time code suggestion.
 */
function InputOTP({
  className,
  containerClassName,
  value,
  defaultValue = "",
  onChange,
  onComplete,
  maxLength,
  pattern,
  pasteTransformer,
  disabled,
  editable,
  "aria-invalid": isInvalid,
  autoFocus,
  onFocus,
  onBlur,
  ref,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof TextInput>,
  "value" | "defaultValue" | "onChange" | "maxLength" | "children"
> & {
  containerClassName?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  maxLength: number
  pattern?: OtpPattern
  pasteTransformer?: (text: string) => string
  disabled?: boolean
  "aria-invalid"?: boolean
  children?: React.ReactNode
}) {
  const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null)
  const composedRef = useComposedRefs(inputRef, ref)
  const [current = "", setCurrent] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange,
  })
  const [isFocused, setIsFocused] = React.useState(Boolean(autoFocus))
  const field = useFieldControl({
    activate: () => inputRef.current?.focus(),
  })
  const isDisabled = disabled ?? field.isDisabled
  const isEditable = editable ?? !isDisabled
  const isFieldInvalid = isInvalid ?? field.isInvalid

  const previous = React.useRef(current)
  React.useEffect(() => {
    if (isOtpComplete(previous.current, current, maxLength)) {
      onComplete?.(current)
    }
    previous.current = current
  }, [current, maxLength, onComplete])

  const context = React.useMemo(
    () => ({
      slots: getOtpSlots(current, maxLength, isFocused),
      isInvalid: isFieldInvalid,
    }),
    [current, isFieldInvalid, isFocused, maxLength]
  )

  return (
    <InputOTPContext value={context}>
      <View
        data-slot="input-otp"
        data-disabled={isDisabled}
        className={cn(
          "cn-input-otp relative flex-row items-center self-start",
          containerClassName
        )}
      >
        {renderTextChildren(children)}
        <TextInput
          ref={composedRef}
          value={current}
          onChangeText={(text) => {
            setCurrent(
              getNextOtpValue(text, current, {
                maxLength,
                pattern,
                transform: pasteTransformer,
              })
            )
          }}
          maxLength={maxLength}
          keyboardType={getOtpKeyboardType(pattern)}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoCorrect={false}
          spellCheck={false}
          caretHidden
          underlineColorAndroid="transparent"
          autoFocus={autoFocus}
          editable={isEditable}
          accessibilityLabel="One-time code"
          aria-disabled={!isEditable}
          aria-invalid={isFieldInvalid}
          className={cn("cn-input-otp-input absolute inset-0", className)}
          onFocus={(event) => {
            setIsFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setIsFocused(false)
            onBlur?.(event)
          }}
          {...props}
        />
      </View>
    </InputOTPContext>
  )
}

function InputOTPGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="input-otp-group"
      className={cn("cn-input-otp-group flex-row items-center", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function InputOTPCaret() {
  const motion = useMotion("feedback")
  const opacity = useSharedValue(1)
  const shouldBlink = !motion.isOff && !motion.isReduced
  const { enterMs, feedbackEasing } = motion
  React.useEffect(() => {
    if (!shouldBlink) return
    const fade = { duration: enterMs, easing: feedbackEasing }
    const holdMs = getOtpCaretHoldMs(enterMs)
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, fade),
        withDelay(holdMs, withTiming(1, fade)),
        withDelay(holdMs, withTiming(1, { duration: 0 }))
      ),
      -1
    )
    return () => {
      cancelAnimation(opacity)
      opacity.value = 1
    }
  }, [enterMs, feedbackEasing, opacity, shouldBlink])
  const blinkStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <View className="cn-input-otp-caret absolute inset-0 items-center justify-center">
      <Animated.View className="cn-input-otp-caret-line" style={blinkStyle} />
    </View>
  )
}

function InputOTPSlot({
  index,
  className,
  "aria-invalid": isInvalid,
  ...props
}: React.ComponentProps<typeof View> & {
  index: number
  "aria-invalid"?: boolean
}) {
  const context = React.use(InputOTPContext)
  const slot = context?.slots[index]
  const isActive = slot?.isActive ?? false
  const isSlotInvalid = isInvalid ?? context?.isInvalid ?? false

  // The active slot's surface fades in on the feedback timing, a layer because
  // React Native can't transition a class's colour. Reduce Motion keeps the fade,
  // and Reanimated would jump it to the end.
  const motion = useMotion("feedback")
  const focus = useSharedValue(isActive ? 1 : 0)
  React.useEffect(() => {
    focus.value = withTiming(isActive ? 1 : 0, {
      duration: motion.enterMs,
      easing: motion.feedbackEasing,
      reduceMotion: ReduceMotion.Never,
    })
  }, [focus, isActive, motion])
  const focusStyle = useAnimatedStyle(() => ({ opacity: focus.value }))

  return (
    <View
      data-slot="input-otp-slot"
      data-active={isActive}
      data-invalid={isSlotInvalid}
      // The input over the slots is what a screen reader and a finger reach.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      className={cn(
        "cn-input-otp-slot relative items-center justify-center",
        className
      )}
      {...props}
    >
      <Animated.View
        data-invalid={isSlotInvalid}
        className="cn-input-otp-slot-focus absolute"
        style={focusStyle}
      />
      <Text className="cn-input-otp-slot-text">{slot?.char ?? ""}</Text>
      {slot?.hasFakeCaret ? <InputOTPCaret /> : null}
    </View>
  )
}

function InputOTPSeparator({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-input-otp-separator-text">
      <View
        data-slot="input-otp-separator"
        role="separator"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className={cn(
          "cn-input-otp-separator flex-row items-center",
          className
        )}
        {...props}
      >
        <MinusIcon strokeWidth={1.5} />
      </View>
    </TextStyle>
  )
}

export {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
}
