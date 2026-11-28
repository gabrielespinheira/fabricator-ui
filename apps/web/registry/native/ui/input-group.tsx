import * as React from "react"
import {
  IconProvider,
  SearchIcon,
  XIcon,
} from "@fabricator-ui/icons-react-native"
import { useComposedRefs, useControllableState } from "@rn-primitives/hooks"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, TextInput, View } from "react-native"
import { useCSSVariable } from "uniwind"

import { useFieldControl } from "@/registry/native/lib/field-model"
import { useIconStroke } from "@/registry/native/lib/icon-stroke"
import {
  canClearSearch,
  getSearchKeyAction,
} from "@/registry/native/lib/input-search-model"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { Button, ButtonJoinedContext } from "@/registry/native/ui/button"
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
      <ButtonJoinedContext value={true}>
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
      </ButtonJoinedContext>
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
    <IconProvider strokeWidth={useIconStroke(isFocused)}>
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

const inputGroupButtonWashVariants = cva("cn-input-group-button-wash")

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
      washClassName={inputGroupButtonWashVariants()}
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

/**
 * The group draws the frame and lifts it on focus. A control inside clears its
 * own: Input and Textarea ease their fill and border in an inline style, which a
 * class can't override, and an opaque fill would paint over the group's border.
 */
const CLEAR_FRAME = {
  backgroundColor: "transparent",
  borderColor: "transparent",
} as const

function InputGroupInput({
  className,
  style,
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
      style={[CLEAR_FRAME, style]}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  style,
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
      style={[CLEAR_FRAME, style]}
      {...props}
    />
  )
}

/**
 * A search field framed like every other input: the search icon at the start,
 * and a clear button once there is text. Clearing (the button or Escape on a
 * hardware keyboard) empties the field and keeps the focus in it.
 */
function InputSearch({
  className,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onChangeText,
  onKeyPress,
  editable = true,
  readOnly = false,
  clearLabel = "Clear search",
  groupProps,
  children,
  ref,
  ...props
}: Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "value" | "defaultValue" | "children"
> & {
  /** The search text. Controlled. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Accessible name of the clear button. Default "Clear search". */
  clearLabel?: string
  /** Props for the frame; `className` styles it too. */
  groupProps?: React.ComponentProps<typeof InputGroup>
  /** More addons, after the clear button (a keycap, a filter). */
  children?: React.ReactNode
}) {
  const inputRef = React.useRef<TextInputRef>(null)
  const composedRef = useComposedRefs(inputRef, ref)
  const [value = "", setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const state = { value, isDisabled: !editable, isReadOnly: readOnly }
  return (
    <InputGroup
      data-slot="input-search"
      {...groupProps}
      className={cn("cn-input-search", className, groupProps?.className)}
    >
      <InputGroupInput
        ref={composedRef}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        editable={editable}
        readOnly={readOnly}
        value={value}
        onChangeText={(text) => {
          onChangeText?.(text)
          setValue(text)
        }}
        onKeyPress={(event) => {
          onKeyPress?.(event)
          if (getSearchKeyAction(event.nativeEvent.key, state) === "clear")
            setValue("")
        }}
        {...props}
      />
      <InputGroupAddon>
        <SearchIcon data-slot="input-search-icon" aria-hidden />
      </InputGroupAddon>
      {canClearSearch(state) ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            data-slot="input-search-clear"
            size="icon-xs"
            aria-label={clearLabel}
            onPress={() => {
              setValue("")
              inputRef.current?.focus()
            }}
          >
            <TextStyle className="cn-input-search-clear">
              <XIcon aria-hidden />
            </TextStyle>
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
      {children}
    </InputGroup>
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  InputSearch,
}
