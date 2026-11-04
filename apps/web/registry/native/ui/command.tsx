import * as React from "react"
import { CheckIcon, SearchIcon } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { Pressable, ScrollView, TextInput, View } from "react-native"

import {
  createCommandStore,
  getChildrenText,
  type CommandFilter,
} from "@/registry/native/lib/filter-model"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/native/ui/dialog"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// cmdk's parts and props on a filtered list. There's no keyboard to move through
// it, so an item's `data-selected` is the last one pressed.

type CommandStore = ReturnType<typeof createCommandStore>

type CommandState = {
  store: CommandStore
  selectedValue: string | undefined
  setSelectedValue: (value: string) => void
}

const CommandContext = React.createContext<CommandState | null>(null)
const CommandGroupContext = React.createContext<string | undefined>(undefined)

function useCommand() {
  const context = React.use(CommandContext)
  if (!context) {
    throw new Error("Command parts must be used within a <Command />")
  }
  return context
}

function useCommandSnapshot(store: CommandStore) {
  return React.useSyncExternalStore(store.subscribe, store.getSnapshot)
}

function Command({
  className,
  children,
  label,
  shouldFilter = true,
  filter,
  value,
  defaultValue,
  onValueChange,
  loop: _loop,
  disablePointerSelection: _disablePointerSelection,
  vimBindings: _vimBindings,
  ...props
}: React.ComponentProps<typeof View> & {
  /** Accessible name for the menu. */
  label?: string
  shouldFilter?: boolean
  /** Scores an item against the search: 0 hides it. */
  filter?: CommandFilter
  /** The selected item. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Keyboard only on the website. Accepted, and changes nothing here. */
  loop?: boolean
  disablePointerSelection?: boolean
  vimBindings?: boolean
}) {
  const [store] = React.useState(createCommandStore)
  const [selectedValue, setSelectedValue] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  React.useLayoutEffect(() => {
    store.configure({ filter, shouldFilter })
  }, [filter, shouldFilter, store])
  const state = React.useMemo(
    () => ({
      store,
      selectedValue,
      setSelectedValue: (next: string) => setSelectedValue(next),
    }),
    [selectedValue, setSelectedValue, store]
  )
  return (
    <CommandContext value={state}>
      <TextStyle className="cn-command-text">
        <View
          data-slot="command"
          accessibilityLabel={label}
          className={cn(
            "cn-command size-full flex-col overflow-hidden",
            className
          )}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </TextStyle>
    </CommandContext>
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogContent
        className={cn("cn-command-dialog overflow-hidden p-0", className)}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className="absolute size-0 overflow-hidden">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command className="bg-transparent">{children}</Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<
  React.ComponentProps<typeof TextInput>,
  "value" | "defaultValue" | "onChangeText"
> & {
  /** The search. */
  value?: string
  defaultValue?: string
  onValueChange?: (search: string) => void
}) {
  const { store } = useCommand()
  const [search = "", setSearch] = useControllableState({
    prop: value,
    defaultProp: defaultValue ?? "",
    onChange: onValueChange,
  })
  React.useLayoutEffect(() => {
    store.setQuery(search)
  }, [search, store])
  return (
    <View
      data-slot="command-input-wrapper"
      className="cn-command-input-wrapper"
    >
      <View className="cn-command-input-group flex-row items-center">
        <TextStyle className="cn-command-input-icon">
          <SearchIcon aria-hidden />
        </TextStyle>
        <TextInput
          data-slot="command-input"
          role="searchbox"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="search"
          placeholderTextColorClassName="accent-muted-foreground"
          selectionColorClassName="accent-primary"
          value={search}
          onChangeText={setSearch}
          className={cn("cn-command-input min-w-0 flex-1", className)}
          {...props}
        />
      </View>
    </View>
  )
}

function CommandList({
  className,
  children,
  label,
  ...props
}: React.ComponentProps<typeof ScrollView> & {
  /** Accessible name for the list. */
  label?: string
}) {
  return (
    <ScrollView
      data-slot="command-list"
      role="list"
      accessibilityLabel={label}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      className={cn("cn-command-list grow-0", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </ScrollView>
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { store } = useCommand()
  const { count } = useCommandSnapshot(store)
  if (count > 0) return null
  return (
    <Text
      data-slot="command-empty"
      role="status"
      className={cn("cn-command-empty", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  children,
  heading,
  value,
  forceMount = false,
  ...props
}: React.ComponentProps<typeof View> & {
  heading?: React.ReactNode
  value?: string
  forceMount?: boolean
}) {
  const { store } = useCommand()
  const id = React.useId()
  const { query, groupCounts } = useCommandSnapshot(store)
  const isHidden = !forceMount && query !== "" && !groupCounts.get(id)
  // Hidden, its items stay mounted: they're what counts for the next search.
  return (
    <CommandGroupContext value={id}>
      <View
        data-slot="command-group"
        role="group"
        accessibilityLabel={
          value ?? (typeof heading === "string" ? heading : undefined)
        }
        className={cn("cn-command-group", isHidden && "hidden", className)}
        {...props}
      >
        {heading ? (
          <TextStyle className="cn-command-group-heading-text">
            <View className="cn-command-group-heading flex-row items-center">
              {renderTextChildren(heading)}
            </View>
          </TextStyle>
        ) : null}
        {renderTextChildren(children)}
      </View>
    </CommandGroupContext>
  )
}

function CommandSeparator({
  className,
  alwaysRender = false,
  ...props
}: React.ComponentProps<typeof View> & { alwaysRender?: boolean }) {
  const { store } = useCommand()
  const { query } = useCommandSnapshot(store)
  if (query !== "" && !alwaysRender) return null
  return (
    <View
      data-slot="command-separator"
      role="separator"
      className={cn("cn-command-separator", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  value,
  keywords,
  disabled,
  onSelect,
  onPress,
  forceMount = false,
  "data-checked": checked,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  children?: React.ReactNode
  /** What the search matches; its text when left out. */
  value?: string
  keywords?: readonly string[]
  onSelect?: (value: string) => void
  forceMount?: boolean
  "data-checked"?: boolean | "true" | "false"
}) {
  const { store, selectedValue, setSelectedValue } = useCommand()
  const groupId = React.use(CommandGroupContext)
  const id = React.useId()
  const itemValue = (value ?? getChildrenText(children)).trim()
  const keywordKey = keywords?.join("\n")
  const itemKeywords = React.useMemo(
    () => keywordKey?.split("\n"),
    [keywordKey]
  )
  React.useLayoutEffect(
    () =>
      store.register({
        id,
        value: itemValue,
        keywords: itemKeywords,
        groupId,
      }),
    [groupId, id, itemKeywords, itemValue, store]
  )
  // Reads the search, so a new one re-renders every item.
  useCommandSnapshot(store)
  if (!forceMount && !store.isVisible(itemValue, itemKeywords)) return null

  const isChecked = checked === true || checked === "true"
  const hasShortcut = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === CommandShortcut
  )
  return (
    <Pressable
      data-slot="command-item"
      data-selected={selectedValue === itemValue}
      data-checked={isChecked}
      data-disabled={Boolean(disabled)}
      role="option"
      aria-selected={isChecked}
      aria-disabled={disabled ?? undefined}
      disabled={disabled}
      onPress={(event) => {
        setSelectedValue(itemValue)
        onSelect?.(itemValue)
        onPress?.(event)
      }}
      className={cn(
        "cn-command-item relative flex-row items-center disabled:opacity-50",
        className
      )}
      {...props}
    >
      <TextStyle
        className={
          isChecked
            ? cn("cn-command-item-text-checked")
            : cn("cn-command-item-text")
        }
      >
        {renderTextChildren(children)}
        {!hasShortcut && (
          <View
            data-checked={isChecked}
            className="cn-command-item-indicator ml-auto"
          >
            <CheckIcon aria-hidden />
          </View>
        )}
      </TextStyle>
    </Pressable>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="command-shortcut"
      className={cn("cn-command-shortcut", className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
