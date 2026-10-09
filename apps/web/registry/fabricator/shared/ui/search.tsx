"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A search button that opens into a search field, as one object: the round
// button springs its width open, the icon stays put at the start, and the
// field fades in and takes focus. Escape clears the text, then closes; leaving
// an empty field closes it too.

const searchVariants = cva(
  "cn-search group/search relative isolate inline-flex shrink-0 items-center overflow-hidden",
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

type SearchEvent = "escape" | "blur" | "open"

/**
 * What a key press or focus change does to the search, given its text.
 * Escape clears text first and closes on the next press; leaving an empty
 * field closes it. A search that isn't collapsible never closes.
 */
function nextSearchAction(
  event: SearchEvent,
  { value, collapsible }: { value: string; collapsible: boolean }
): "open" | "clear" | "close" | "none" {
  if (event === "open") return "open"
  if (event === "escape") {
    if (value) return "clear"
    return collapsible ? "close" : "none"
  }
  return collapsible && !value ? "close" : "none"
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

type SearchProps = Omit<
  React.ComponentProps<"input">,
  "size" | "value" | "defaultValue" | "onChange" | "type"
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
    /** Open width, as a CSS length. Default 320px (never wider than the parent). */
    width?: string
    /** Accessible name for the button and the field. Default "Search". */
    label?: string
    /** Props for the root element. */
    rootProps?: React.ComponentProps<"div">
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
  id: idProp,
  ref,
  onKeyDown,
  onBlur,
  ...props
}: SearchProps) {
  const generatedId = React.useId()
  const inputId = idProp ?? `search-${generatedId}`
  const inputRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const focusOnOpen = React.useRef(false)

  const [openState, setOpen] = useControllable(
    openProp,
    defaultOpen,
    onOpenChange
  )
  const [value, setValue] = useControllable(
    valueProp,
    defaultValue,
    onValueChange
  )
  const open = !collapsible || openState

  // Focus moves into the field once it is rendered open.
  React.useEffect(() => {
    if (open && focusOnOpen.current) {
      focusOnOpen.current = false
      inputRef.current?.focus()
    }
  }, [open])

  const setInputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
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

  return (
    <div
      data-slot="search"
      data-open={open ? "" : undefined}
      data-variant={variant}
      data-size={size}
      data-collapsible={collapsible ? "" : undefined}
      {...rootProps}
      className={cn(searchVariants({ variant, size }), className)}
      style={
        {
          ...(width ? { "--search-width": width } : null),
          ...rootProps?.style,
        } as React.CSSProperties
      }
      onBlur={(event) => {
        rootProps?.onBlur?.(event)
        // Leaving the whole search (not moving to its clear button) with an
        // empty field closes it.
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        if (open) apply(nextSearchAction("blur", { value, collapsible }))
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        data-slot="search-trigger"
        aria-label={label}
        aria-expanded={collapsible ? open : undefined}
        aria-controls={inputId}
        // Open, the button is just the icon: the field has the focus.
        tabIndex={open ? -1 : 0}
        aria-hidden={open ? true : undefined}
        onClick={() => {
          if (open) inputRef.current?.focus()
          else apply(nextSearchAction("open", { value, collapsible }))
        }}
        className="cn-search-trigger absolute inset-y-0 start-0 z-10 flex aspect-square items-center justify-center outline-none select-none group-data-open/search:pointer-events-none"
      >
        <IconPlaceholder
          lucide="SearchIcon"
          tabler="IconSearch"
          hugeicons="SearchIcon"
          phosphor="MagnifyingGlassIcon"
          remixicon="RiSearchLine"
          data-slot="search-icon"
          aria-hidden
          className="cn-search-icon pointer-events-none shrink-0"
        />
      </button>
      <input
        ref={setInputRef}
        id={inputId}
        type="search"
        data-slot="search-input"
        aria-label={label}
        placeholder={placeholder}
        autoComplete="off"
        // Closed, the field is out of reach: the button opens it.
        tabIndex={open ? undefined : -1}
        aria-hidden={open ? undefined : true}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented || event.key !== "Escape") return
          const action = nextSearchAction("escape", { value, collapsible })
          if (action === "none") return
          event.preventDefault()
          apply(action)
          if (action === "close") {
            // Closed by keyboard: focus goes back to the button.
            requestAnimationFrame(() => triggerRef.current?.focus())
          }
        }}
        onBlur={onBlur}
        className="cn-search-input h-full w-full min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
        {...props}
      />
      {clearable && open && value ? (
        <button
          type="button"
          data-slot="search-clear"
          aria-label="Clear search"
          onClick={() => {
            setValue("")
            inputRef.current?.focus()
          }}
          className="cn-search-clear absolute inset-y-0 end-0 flex aspect-square items-center justify-center outline-none select-none"
        >
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
            aria-hidden
            className="pointer-events-none"
          />
        </button>
      ) : null}
    </div>
  )
}

export { Search, nextSearchAction, searchVariants }
