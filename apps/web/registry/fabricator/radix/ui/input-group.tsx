"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import {
  canClearSearch,
  getSearchKeyAction,
} from "@/registry/bases/radix/lib/input-search-model"
import { Button } from "@/registry/bases/radix/ui/button"
import { Input } from "@/registry/bases/radix/ui/input"
import { Textarea } from "@/registry/bases/radix/ui/textarea"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function InputGroup({
  className,
  role = "group",
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role={role}
      className={cn(
        "group/input-group cn-input-group relative flex w-full min-w-0 items-center outline-none has-[>textarea]:h-auto",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "cn-input-group-addon flex cursor-text items-center justify-center select-none",
  {
    variants: {
      align: {
        "inline-start": "cn-input-group-addon-align-inline-start order-first",
        "inline-end": "cn-input-group-addon-align-inline-end order-last",
        "block-start":
          "cn-input-group-addon-align-block-start order-first w-full justify-start",
        "block-end":
          "cn-input-group-addon-align-block-end order-last w-full justify-start",
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
  role = "group",
  onPointerUp,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role={role}
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onPointerUp={(event) => {
        onPointerUp?.(event)
        if (event.defaultPrevented || props.onClick || event.button !== 0)
          return
        if (event.target instanceof Element && event.target.closest("button"))
          return
        event.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "cn-input-group-button flex items-center shadow-none",
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

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "cn-input-group-text flex items-center [&_svg]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn("cn-input-group-input flex-1", className)}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn("cn-input-group-textarea flex-1 resize-none", className)}
      {...props}
    />
  )
}

function useControllable<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const isControlled = controlled !== undefined
  const value = isControlled ? controlled : uncontrolled
  const setValue = React.useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next)
      onChange?.(next)
    },
    [isControlled, onChange]
  )
  return [value, setValue] as const
}

/**
 * A search field framed like every other input: the search icon at the
 * start, and a clear button once there is text. Clearing (the button or
 * Escape) empties the field and keeps the focus in it; Escape on an empty
 * field reaches what is around it, so a dialog still closes.
 */
function InputSearch({
  className,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onChange,
  onKeyDown,
  disabled = false,
  readOnly = false,
  clearLabel = "Clear search",
  groupProps,
  children,
  ref,
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "children"
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
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [value, setValue] = useControllable(
    valueProp,
    defaultValue,
    onValueChange
  )
  const state = { value, isDisabled: disabled, isReadOnly: readOnly }

  const setInputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  return (
    <InputGroup
      data-slot="input-search"
      {...groupProps}
      className={cn("cn-input-search", className, groupProps?.className)}
    >
      <InputGroupInput
        ref={setInputRef}
        type="search"
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        onChange={(event) => {
          onChange?.(event)
          setValue(event.target.value)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (getSearchKeyAction(event.key, state) === "none") return
          // The text goes first; the Escape stops here so a dialog around the
          // field stays open until the next press.
          event.preventDefault()
          event.stopPropagation()
          setValue("")
        }}
        {...props}
      />
      <InputGroupAddon>
        <IconPlaceholder
          lucide="SearchIcon"
          tabler="IconSearch"
          hugeicons="SearchIcon"
          phosphor="MagnifyingGlassIcon"
          remixicon="RiSearchLine"
          data-slot="input-search-icon"
          aria-hidden
        />
      </InputGroupAddon>
      {canClearSearch(state) ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            data-slot="input-search-clear"
            size="icon-xs"
            aria-label={clearLabel}
            onClick={() => {
              setValue("")
              inputRef.current?.focus()
            }}
            className={cn("cn-input-search-clear")}
          >
            <IconPlaceholder
              lucide="XIcon"
              tabler="IconX"
              hugeicons="Cancel01Icon"
              phosphor="XIcon"
              remixicon="RiCloseLine"
              aria-hidden
            />
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
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
  InputSearch,
}
