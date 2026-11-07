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
  "group/search relative isolate inline-flex max-w-full shrink-0 items-center overflow-hidden rounded-full text-foreground transition-[width,scale,background-color,box-shadow] duration-move ease-move not-data-open:duration-move-exit not-data-open:ease-exit has-[[data-slot=search-input]:focus-visible]:ring-1 has-[[data-slot=search-input]:focus-visible]:ring-foreground/20 has-[[data-slot=search-trigger]:active]:not-data-open:scale-(--motion-press-scale) has-[[data-slot=search-trigger]:focus-visible]:ring-1 has-[[data-slot=search-trigger]:focus-visible]:ring-ring motion-reduce:transition-[background-color,box-shadow] motion-reduce:has-[[data-slot=search-trigger]:active]:not-data-open:scale-100",
  {
    variants: {
      variant: {
        default: "bg-active not-data-open:hover:bg-foreground/[0.13]",
        outline:
          "bg-transparent ring-1 ring-border not-data-open:hover:bg-hover",
      },
      size: {
        default:
          "h-(--density-36) w-(--density-36) text-(length:--density-text-13) data-open:w-(--search-width,320px) [&_[data-slot=search-input]]:ps-(--density-36) [&_[data-slot=search-input]]:pe-(--density-12) has-[[data-slot=search-clear]]:[&_[data-slot=search-input]]:pe-(--density-36) [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        sm: "h-(--density-36) w-(--density-36) text-(length:--density-text-13) density-compact data-open:w-(--search-width,240px) [&_[data-slot=search-input]]:ps-(--density-36) [&_[data-slot=search-input]]:pe-(--density-12) has-[[data-slot=search-clear]]:[&_[data-slot=search-input]]:pe-(--density-36) [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        lg: "h-(--density-36) w-(--density-36) text-(length:--density-text-13) density-spacious data-open:w-(--search-width,360px) [&_[data-slot=search-input]]:ps-(--density-36) [&_[data-slot=search-input]]:pe-(--density-12) has-[[data-slot=search-clear]]:[&_[data-slot=search-input]]:pe-(--density-36) [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
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
        className="absolute inset-y-0 start-0 z-10 flex aspect-square cursor-pointer items-center justify-center rounded-full text-foreground transition-colors duration-feedback ease-feedback outline-none select-none group-data-open/search:pointer-events-none group-data-open/search:text-muted-foreground"
      >
        <IconPlaceholder
          lucide="SearchIcon"
          tabler="IconSearch"
          hugeicons="SearchIcon"
          phosphor="MagnifyingGlassIcon"
          remixicon="RiSearchLine"
          data-slot="search-icon"
          aria-hidden
          className="pointer-events-none shrink-0 stroke-[1.75]"
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
        className="h-full w-full min-w-0 flex-1 cursor-text bg-transparent text-foreground opacity-0 transition-opacity duration-feedback-exit ease-exit outline-none group-data-open/search:opacity-100 group-data-open/search:delay-feedback group-data-open/search:duration-move group-data-open/search:ease-enter placeholder:text-muted-foreground motion-reduce:delay-0 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
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
          className="absolute inset-y-0 end-0 flex aspect-square animate-in cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-feedback ease-feedback fade-in-0 outline-none select-none zoom-in-75 hover:text-foreground focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-ring motion-reduce:zoom-in-100 [&_svg:not([class*='size-'])]:size-(--density-icon-14)"
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
