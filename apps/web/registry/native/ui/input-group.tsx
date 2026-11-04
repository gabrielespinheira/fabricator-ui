import * as React from "react"
import { IconProvider } from "@fabricator-ui/icons-react-native"
import { useComposedRefs } from "@rn-primitives/hooks"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, TextInput, View } from "react-native"
import { useCSSVariable } from "uniwind"

import { useFieldControl } from "@/registry/native/lib/field-model"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { Button } from "@/registry/native/ui/button"
import { Input } from "@/registry/native/ui/input"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"
import { Textarea } from "@/registry/native/ui/textarea"

type TextInputRef = React.ComponentRef<typeof TextInput>

type ControlState = { isInvalid: boolean; isDisabled: boolean }

type InputGroupContextValue = {
  isFocused: boolean
  isStacked: boolean
  focusControl: () => void
  registerControl: (control: TextInputRef | null) => void
  setIsFocused: (isFocused: boolean) => void
  setControlState: (state: ControlState) => void
}

const InputGroupContext = React.createContext<InputGroupContextValue | null>(
  null
)

/**
 * What a control tells its group, which draws the frame: `focus-within` and
 * `has-[aria-invalid]` on the website. It also joins the Field around the group.
 */
function useInputGroupControl({
  isInvalid: isInvalidProp,
  isDisabled: isDisabledProp,
  onFocus,
  onBlur,
  ref,
}: {
  isInvalid?: boolean
  isDisabled?: boolean
  onFocus?: React.ComponentProps<typeof TextInput>["onFocus"]
  onBlur?: React.ComponentProps<typeof TextInput>["onBlur"]
  ref?: React.Ref<TextInputRef>
}) {
  const group = React.use(InputGroupContext)
  const inputRef = React.useRef<TextInputRef>(null)
  const field = useFieldControl({
    activate: () => inputRef.current?.focus(),
  })
  const isInvalid = isInvalidProp ?? field.isInvalid
  const isDisabled = isDisabledProp ?? field.isDisabled
  const registerControl = group?.registerControl
  const setControlState = group?.setControlState
  const composedRef = useComposedRefs(inputRef, ref, registerControl)
  React.useEffect(() => {
    setControlState?.({ isInvalid, isDisabled })
  }, [isDisabled, isInvalid, setControlState])
  return {
    ref: composedRef,
    isInvalid,
    isDisabled,
    isStacked: group?.isStacked ?? false,
    onFocus: (event: Parameters<NonNullable<typeof onFocus>>[0]) => {
      group?.setIsFocused(true)
      onFocus?.(event)
    },
    onBlur: (event: Parameters<NonNullable<typeof onBlur>>[0]) => {
      group?.setIsFocused(false)
      onBlur?.(event)
    },
  }
}

function getAddonAlign(child: React.ReactNode) {
  if (
    !React.isValidElement<VariantProps<typeof inputGroupAddonVariants>>(
      child
    ) ||
    child.type !== InputGroupAddon
  ) {
    return null
  }
  return child.props.align ?? "inline-start"
}

/** Controls keep their order; addons go where `order-first` and `order-last` put them. */
function getChildOrder(child: React.ReactNode) {
  const align = getAddonAlign(child)
  if (align === null) return 0
  return align.endsWith("start") ? -1 : 1
}

function InputGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const controlRef = React.useRef<TextInputRef | null>(null)
  const [isFocused, setIsFocused] = React.useState(false)
  const [controlState, setControlState] = React.useState<ControlState>({
    isInvalid: false,
    isDisabled: false,
  })
  const childList = React.Children.toArray(children)
  const isStacked = childList.some((child) =>
    getAddonAlign(child)?.startsWith("block")
  )
  const hasTextarea = childList.some(
    (child) => React.isValidElement(child) && child.type === InputGroupTextarea
  )
  const context = React.useMemo<InputGroupContextValue>(
    () => ({
      isFocused,
      isStacked,
      setIsFocused,
      setControlState,
      focusControl: () => controlRef.current?.focus(),
      registerControl: (control) => {
        controlRef.current = control
      },
    }),
    [isFocused, isStacked]
  )
  return (
    <InputGroupContext value={context}>
      <View
        data-slot="input-group"
        data-focused={isFocused}
        data-invalid={controlState.isInvalid}
        data-disabled={controlState.isDisabled}
        data-stacked={isStacked}
        data-tall={hasTextarea}
        role="group"
        className={cn(
          "cn-input-group relative w-full min-w-0 flex-row items-center",
          className
        )}
        {...props}
      >
        {renderTextChildren(
          [...childList].sort((a, b) => getChildOrder(a) - getChildOrder(b))
        )}
      </View>
    </InputGroupContext>
  )
}

const inputGroupAddonVariants = cva(
  "cn-input-group-addon flex-row items-center justify-center",
  {
    variants: {
      align: {
        "inline-start": "cn-input-group-addon-align-inline-start",
        "inline-end": "cn-input-group-addon-align-inline-end",
        "block-start":
          "cn-input-group-addon-align-block-start w-full justify-start",
        "block-end":
          "cn-input-group-addon-align-block-end w-full justify-start",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  children,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> &
  VariantProps<typeof inputGroupAddonVariants> & {
    className?: string
    children?: React.ReactNode
  }) {
  const group = React.use(InputGroupContext)
  const isFocused = group?.isFocused ?? false
  const content = (
    <IconProvider strokeWidth={isFocused ? 2 : 1.5}>
      {renderTextChildren(children)}
    </IconProvider>
  )
  return (
    <Pressable
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      // Not one accessible element: a button inside must stay reachable.
      accessible={false}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onPress={(event) => {
        group?.focusControl()
        onPress?.(event)
      }}
      {...props}
    >
      {isFocused ? (
        <TextStyle className="cn-input-group-addon-text cn-input-group-addon-text-focused">
          {content}
        </TextStyle>
      ) : (
        <TextStyle className="cn-input-group-addon-text">{content}</TextStyle>
      )}
    </Pressable>
  )
}

const inputGroupButtonVariants = cva(
  "cn-input-group-button flex-row items-center",
  {
    variants: {
      size: {
        xs: "cn-input-group-button-size-xs",
        sm: "cn-input-group-button-size-sm",
        "icon-xs": "cn-input-group-button-size-icon-xs",
        "icon-sm": "cn-input-group-button-size-icon-sm",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

// Buttons in a group have 14pt icons and 12pt labels, except the plain icon-sm.
function InputGroupButtonContent({
  size,
  children,
}: {
  size: "xs" | "sm" | "icon-xs" | "icon-sm"
  children?: React.ReactNode
}) {
  const icon = useCSSVariable(
    size === "icon-sm" ? "--density-icon-16" : "--density-icon-14"
  )
  return (
    <TextStyle className="cn-input-group-button-text">
      <IconProvider size={parseNumber(icon, 14)}>
        {renderTextChildren(children)}
      </IconProvider>
    </TextStyle>
  )
}

function InputGroupButton({
  className,
  type: _type = "button",
  variant = "ghost",
  size = "xs",
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    /** Kept so code moves across: React Native has no form to submit. */
    type?: "button" | "submit" | "reset"
  }) {
  const resolvedSize = size ?? "xs"
  return (
    <Button
      data-size={resolvedSize}
      variant={variant}
      hitSlop={10}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    >
      <InputGroupButtonContent size={resolvedSize}>
        {children}
      </InputGroupButtonContent>
    </Button>
  )
}

function InputGroupText({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <TextStyle className="cn-input-group-text-text">
      <View
        className={cn("cn-input-group-text flex-row items-center", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </TextStyle>
  )
}

function InputGroupInput({
  className,
  "aria-invalid": isInvalid,
  editable,
  onFocus,
  onBlur,
  ref,
  ...props
}: React.ComponentProps<typeof Input>) {
  const control = useInputGroupControl({
    isInvalid,
    isDisabled: editable === undefined ? undefined : !editable,
    onFocus,
    onBlur,
    ref,
  })
  return (
    <Input
      ref={control.ref}
      data-slot="input-group-control"
      data-stacked={control.isStacked}
      aria-invalid={control.isInvalid}
      editable={!control.isDisabled}
      onFocus={control.onFocus}
      onBlur={control.onBlur}
      className={cn("cn-input-group-input flex-1", className)}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  "aria-invalid": isInvalid,
  disabled,
  editable,
  onFocus,
  onBlur,
  ref,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  const control = useInputGroupControl({
    isInvalid,
    isDisabled: disabled ?? (editable === undefined ? undefined : !editable),
    onFocus,
    onBlur,
    ref,
  })
  return (
    <Textarea
      ref={control.ref}
      data-slot="input-group-control"
      data-stacked={control.isStacked}
      aria-invalid={control.isInvalid}
      disabled={control.isDisabled}
      onFocus={control.onFocus}
      onBlur={control.onBlur}
      className={cn("cn-input-group-textarea flex-1", className)}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
}
