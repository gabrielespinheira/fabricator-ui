import * as React from "react"
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  Columns3Icon,
  EllipsisIcon,
  EyeOffIcon,
  GripVerticalIcon,
  ListFilterIcon,
  MaximizeIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SquareCheckIcon,
  SquarePenIcon,
  Trash2Icon,
  TriangleAlertIcon,
  Undo2Icon,
  XIcon,
} from "@fabricator-ui/icons-react-native"
import { LegendList } from "@legendapp/list/react-native"
import { cn } from "cn"
import {
  AccessibilityInfo,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { runOnJS } from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import {
  useKanban,
  type KanbanController,
  type KanbanDraft,
  type KanbanOptions,
  type KanbanView,
} from "@/registry/fabricator/shared/hooks/use-kanban"
import {
  getKanbanLimitState,
  renameKanbanColumn,
  type KanbanColumn as KanbanColumnDefinition,
  type KanbanLane,
} from "@/registry/fabricator/shared/lib/kanban-model"
import {
  getOptionFilter,
  getPropertyCover,
  hasPropertyValue,
  isChoiceProperty,
  isMultiProperty,
  readPropertyFiles,
  readPropertyKeys,
  toggleOptionFilter,
  togglePropertyOption,
} from "@/registry/fabricator/shared/lib/property-model"
import {
  getPropertyType,
  type PropertyDefinition,
} from "@/registry/fabricator/shared/lib/property-types"
import {
  ControlSheet,
  type ControlMenuGroup,
  type ControlMenuItem,
} from "@/registry/native/lib/control-sheet"
import {
  KanbanDragArea,
  KanbanNativeDragOverlay,
  useKanbanDrag,
  type KanbanNativeDrag,
} from "@/registry/native/lib/kanban-drag"
import { usePaletteMark } from "@/registry/native/lib/palette-color"
import { Button } from "@/registry/native/ui/button"
import { DensityScope } from "@/registry/native/ui/density"
import { Drawer, DrawerContent, DrawerTitle } from "@/registry/native/ui/drawer"
import { Input } from "@/registry/native/ui/input"
import { InputSearch } from "@/registry/native/ui/input-group"
import {
  PropertyAvatar,
  PropertyIcon,
  PropertyMark,
  PropertyValue,
} from "@/registry/native/ui/properties"
import { Skeleton } from "@/registry/native/ui/skeleton"
import { Switch } from "@/registry/native/ui/switch"
import { Text } from "@/registry/native/ui/text"

// Kanban on a phone and a tablet: the website's controller and the same card.
// A menu is a sheet, a hold picks a card up, and a phone shows one column with
// the next at its edge.

type KanbanCardRenderers<Item> = {
  onOpenCard?: (item: Item) => void
  /** A picture above the card. */
  getCover?: (item: Item) => string | undefined
  /** Replaces what the card holds. */
  renderCard?: (item: Item) => React.ReactNode
  /** The card shown in the record view. */
  openId?: string | null
}

type KanbanPartProps<Item> = { board: KanbanController<Item> }

type KanbanBoardProps<Item> = React.ComponentProps<typeof View> &
  KanbanCardRenderers<Item> &
  KanbanPartProps<Item> & {
    /** Opens the app's own way to add a card, instead of the composer. */
    onAddCard?: (columnId: string, laneId: string | null) => void
    getColumnActions?: (
      column: KanbanColumnDefinition
    ) => readonly ControlMenuItem[]
    getCardActions?: (item: Item) => readonly ControlMenuItem[]
    addLabel?: string
    /** An add button in the header too. */
    hasHeaderAdd?: boolean
    paging?: "scroll" | "button"
  }

type KanbanProps<Item> = KanbanOptions<Item> &
  Omit<
    KanbanBoardProps<Item>,
    "board" | "children" | keyof React.ComponentProps<typeof View>
  > & {
    className?: string
    label?: string
    /** `fill` takes the height it is given; columns scroll inside it. */
    fit?: "content" | "fill"
    children?: (board: KanbanController<Item>) => React.ReactNode
    renderToolbar?: (board: KanbanController<Item>) => React.ReactNode
  }

const KanbanFitContext = React.createContext<"content" | "fill">("content")

function Kanban<Item>({
  label = "Kanban board",
  fit = "content",
  className,
  children,
  renderToolbar,
  onAddCard,
  getColumnActions,
  getCardActions,
  addLabel,
  hasHeaderAdd,
  paging,
  onOpenCard,
  getCover,
  renderCard,
  openId,
  ...options
}: KanbanProps<Item>) {
  const board = useKanban(options)
  React.useEffect(() => {
    if (board.announcement)
      AccessibilityInfo.announceForAccessibility(board.announcement)
  }, [board.announcement])
  return (
    <KanbanFitContext value={fit}>
      <View
        accessibilityLabel={label}
        data-slot="kanban"
        data-fit={fit}
        className={cn("cn-kanban flex-col", className)}
      >
        {children ? (
          children(board)
        ) : (
          <>
            {renderToolbar ? (
              renderToolbar(board)
            ) : (
              <KanbanToolbar board={board} />
            )}
            <KanbanBoard
              board={board}
              onAddCard={onAddCard}
              getColumnActions={getColumnActions}
              getCardActions={getCardActions}
              addLabel={addLabel}
              hasHeaderAdd={hasHeaderAdd}
              paging={paging}
              onOpenCard={onOpenCard}
              getCover={getCover}
              renderCard={renderCard}
              openId={openId}
            />
          </>
        )}
        <View
          pointerEvents="box-none"
          data-slot="kanban-floats"
          className="cn-kanban-floats absolute inset-x-0 bottom-0 items-center"
        >
          <KanbanNotices board={board} />
          <KanbanSelectionBar board={board} />
        </View>
      </View>
    </KanbanFitContext>
  )
}

/** How much room the toolbar has: the labels go first, then the filter's parts. */
type KanbanRoom = "wide" | "compact" | "narrow"

const KanbanRoomContext = React.createContext<KanbanRoom>("narrow")

const COMPACT_BELOW = 960
const NARROW_BELOW = 560

function getKanbanRoom(width: number): KanbanRoom {
  if (width < NARROW_BELOW) return "narrow"
  return width < COMPACT_BELOW ? "compact" : "wide"
}

/**
 * One compact line over the board: what it is and what it is filtered by at the
 * start, how it is arranged at the end, then the app's own actions.
 */
function KanbanToolbar<Item>({
  board,
  title,
  className,
  children,
  onLayout,
  ...props
}: React.ComponentProps<typeof View> &
  KanbanPartProps<Item> & {
    /** What the board is, at the start. Text is drawn as the title. */
    title?: React.ReactNode
    /** The app's actions, last in the line. */
    children?: React.ReactNode
  }) {
  const [room, setRoom] = React.useState<KanbanRoom>("narrow")
  const [isSearching, setIsSearching] = React.useState(false)
  const isSearchOpen = isSearching || !!board.view.search
  const isLineSearch = room === "narrow" && isSearchOpen
  return (
    <KanbanRoomContext value={room}>
      <DensityScope density="compact">
        <View
          data-slot="kanban-toolbar"
          className={cn("cn-kanban-toolbar flex-row items-center", className)}
          onLayout={(event) => {
            setRoom(getKanbanRoom(event.nativeEvent.layout.width))
            onLayout?.(event)
          }}
          {...props}
        >
          {!isLineSearch && (
            <View
              data-slot="kanban-toolbar-start"
              className="cn-kanban-toolbar-start min-w-0 flex-1 flex-row items-center"
            >
              {typeof title === "string" ? (
                <Text
                  data-slot="kanban-toolbar-title"
                  numberOfLines={1}
                  accessibilityRole="header"
                  className="cn-kanban-toolbar-title shrink"
                >
                  {title}
                </Text>
              ) : (
                title
              )}
              <KanbanFilter board={board} />
            </View>
          )}
          <View
            data-slot="kanban-toolbar-end"
            className={cn(
              "cn-kanban-toolbar-end flex-row items-center",
              isLineSearch && "flex-1"
            )}
          >
            <KanbanSearch
              board={board}
              collapsible={room !== "wide"}
              open={isSearchOpen}
              onOpenChange={setIsSearching}
              isFilling={isLineSearch}
            />
            {!isLineSearch && (
              <>
                <View className="cn-kanban-toolbar-controls flex-row items-center">
                  <KanbanGroup board={board} />
                  <KanbanSort board={board} />
                  <KanbanViewOptions board={board} />
                </View>
                {children && (
                  <View className="cn-kanban-toolbar-actions flex-row items-center">
                    {children}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </DensityScope>
    </KanbanRoomContext>
  )
}

function KanbanSearch<Item>({
  board,
  placeholder = "Search cards",
  collapsible = false,
  open,
  onOpenChange,
  isFilling = false,
}: KanbanPartProps<Item> & {
  placeholder?: string
  /** A button that opens into the field, where there is no room for it. */
  collapsible?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Takes the whole line while it is open. */
  isFilling?: boolean
}) {
  const value = board.view.search ?? ""
  if (collapsible && !open)
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        accessibilityLabel={placeholder}
        aria-expanded={false}
        onPress={() => onOpenChange?.(true)}
      >
        <SearchIcon />
      </Button>
    )
  return (
    <InputSearch
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      className={cn("cn-kanban-search", isFilling && "flex-1")}
      groupProps={{ style: isFilling ? undefined : { width: 200 } }}
      // Opened from its button, the field takes the focus.
      autoFocus={collapsible}
      value={value}
      onValueChange={(search) => board.setView({ ...board.view, search })}
      onBlur={() => {
        if (collapsible && !value) onOpenChange?.(false)
      }}
    />
  )
}

function toggleFilter<Item>(
  board: KanbanController<Item>,
  property: PropertyDefinition,
  key: string
) {
  board.setView({
    ...board.view,
    filters: toggleOptionFilter(board.view.filters, property, key),
  })
}

function getOptionIcon(
  property: PropertyDefinition,
  option: NonNullable<PropertyDefinition["options"]>[number]
) {
  return property.type === "person" ? (
    <PropertyAvatar person={option} />
  ) : (
    <PropertyMark mark={option} />
  )
}

/** A button that opens its menu data in a sheet. */
function KanbanSheetButton({
  label,
  groups,
  variant = "ghost",
  size = "icon",
  className,
  children,
}: {
  label: string
  groups: readonly ControlMenuGroup[]
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        accessibilityLabel={label}
        aria-haspopup="menu"
        onPress={() => setOpen(true)}
      >
        {children}
      </Button>
      <ControlSheet
        open={open}
        onOpenChange={setOpen}
        label={label}
        groups={groups}
      />
    </>
  )
}

/** The filter without one property's part, or without any. */
function clearFilter<Item>(
  board: KanbanController<Item>,
  property?: PropertyDefinition
) {
  const filters = property
    ? (board.view.filters?.filters.filter(
        (entry) => !("propertyId" in entry) || entry.propertyId !== property.id
      ) ?? [])
    : []
  board.setView({
    ...board.view,
    filters: filters.length
      ? { match: board.view.filters?.match ?? "all", filters }
      : undefined,
  })
}

/**
 * The whole filter in one control. It says what it is on, each part opens where
 * it is changed, and one tap clears it. With less room it is a count.
 */
function KanbanFilter<Item>({ board }: KanbanPartProps<Item>) {
  const room = React.use(KanbanRoomContext)
  const [open, setOpen] = React.useState(false)
  const [propertyId, setPropertyId] = React.useState<string | null>(null)
  const properties = board.properties.filter((property) =>
    isChoiceProperty(property, board.types)
  )
  if (!properties.length) return null
  const active = properties.filter(
    ({ id }) => getOptionFilter(board.view.filters, id).length > 0
  )
  function show(id: string | null) {
    setPropertyId(id)
    setOpen(true)
  }
  return (
    <View
      data-slot="kanban-filter"
      data-active={active.length > 0}
      className="cn-kanban-filter shrink flex-row items-center"
    >
      <Button
        variant="ghost"
        size="sm"
        accessibilityLabel={
          active.length
            ? `Filter: ${active.map(({ name }) => name).join(", ")}`
            : "Filter cards"
        }
        aria-haspopup="dialog"
        className="cn-kanban-filter-trigger"
        onPress={() => show(null)}
      >
        <ListFilterIcon />
        {active.length === 0
          ? room !== "narrow" && <Text>Filter</Text>
          : room !== "wide" && (
              <View className="cn-kanban-filter-count items-center justify-center">
                <Text className="cn-kanban-filter-count-text">
                  {active.length}
                </Text>
              </View>
            )}
      </Button>
      {room === "wide" && active.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="cn-kanban-filter-parts shrink"
        >
          {active.map((property) => (
            <Pressable
              key={property.id}
              data-slot="kanban-filter-part"
              accessibilityRole="button"
              accessibilityLabel={`Change ${property.name.toLowerCase()} filter`}
              className="cn-kanban-filter-part flex-row items-center"
              onPress={() => show(property.id)}
            >
              <Text className="cn-kanban-filter-name">{property.name}</Text>
              <KanbanFilterValue board={board} property={property} />
            </Pressable>
          ))}
        </ScrollView>
      )}
      {active.length > 0 && (
        <Button
          variant="ghost"
          size="icon-xs"
          accessibilityLabel="Clear filters"
          className="cn-kanban-filter-clear"
          onPress={() => clearFilter(board)}
        >
          <XIcon />
        </Button>
      )}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <KanbanFilterPanel
            board={board}
            properties={properties}
            property={properties.find(({ id }) => id === propertyId)}
            onPropertyChange={(property) => setPropertyId(property?.id ?? null)}
          />
        </DrawerContent>
      </Drawer>
    </View>
  )
}

/** What one property is filtered to. */
function KanbanFilterValue<Item>({
  board,
  property,
}: KanbanPartProps<Item> & { property: PropertyDefinition }) {
  const picked = getOptionFilter(board.view.filters, property.id)
  const options = (property.options ?? []).filter(({ value }) =>
    picked.includes(value)
  )
  if (!options.length) return null
  return (
    <View className="cn-kanban-filter-value shrink flex-row items-center">
      <View className="cn-kanban-filter-marks flex-row items-center">
        {options.slice(0, 3).map((option) => (
          <React.Fragment key={option.value}>
            {getOptionIcon(property, option)}
          </React.Fragment>
        ))}
      </View>
      <Text numberOfLines={1} className="cn-kanban-view-text shrink">
        {options.length === 1 ? options[0].label : `${options.length} selected`}
      </Text>
    </View>
  )
}

/** Every property that can be filtered, then one property's options in its place. */
function KanbanFilterPanel<Item>({
  board,
  properties,
  property,
  onPropertyChange,
}: KanbanPartProps<Item> & {
  properties: readonly PropertyDefinition[]
  property: PropertyDefinition | undefined
  onPropertyChange: (property: PropertyDefinition | null) => void
}) {
  const [muted] = useCSSVariable(["--muted-foreground"])
  const picked = property
    ? getOptionFilter(board.view.filters, property.id)
    : []
  const isActive = property ? picked.length > 0 : !!board.view.filters
  return (
    <View
      data-slot="kanban-filter-panel"
      className="cn-kanban-filter-panel flex-col"
    >
      <View className="cn-kanban-filter-header flex-row items-center">
        {property && (
          <Button
            variant="ghost"
            size="icon-sm"
            accessibilityLabel="All filters"
            onPress={() => onPropertyChange(null)}
          >
            <ChevronLeftIcon />
          </Button>
        )}
        <DrawerTitle className="cn-kanban-filter-title flex-1">
          {property?.name ?? "Filter"}
        </DrawerTitle>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="cn-kanban-filter-reset"
            onPress={() => clearFilter(board, property)}
          >
            {property ? "Clear" : "Clear all"}
          </Button>
        )}
      </View>
      <ScrollView className="cn-kanban-filter-list max-h-96">
        {property
          ? (property.options ?? [])
              .filter(
                ({ value, isArchived }) => !isArchived || picked.includes(value)
              )
              .map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  accessibilityState={{
                    selected: picked.includes(option.value),
                  }}
                  className="cn-kanban-filter-row justify-start"
                  onPress={() => toggleFilter(board, property, option.value)}
                >
                  {getOptionIcon(property, option)}
                  <Text
                    numberOfLines={1}
                    className="cn-kanban-view-text flex-1"
                  >
                    {option.label}
                  </Text>
                  {picked.includes(option.value) && <CheckIcon />}
                </Button>
              ))
          : properties.map((entry) => (
              <Button
                key={entry.id}
                variant="ghost"
                className="cn-kanban-filter-row justify-start"
                onPress={() => onPropertyChange(entry)}
              >
                <PropertyIcon property={entry} />
                <Text numberOfLines={1} className="cn-kanban-view-text flex-1">
                  {entry.name}
                </Text>
                <KanbanFilterValue board={board} property={entry} />
                <ChevronRightIcon
                  size={14}
                  color={typeof muted === "string" ? muted : undefined}
                />
              </Button>
            ))}
      </ScrollView>
    </View>
  )
}

function KanbanGroup<Item>({ board }: KanbanPartProps<Item>) {
  const isWide = React.use(KanbanRoomContext) === "wide"
  const choices = board.properties.filter(
    (property) =>
      (isChoiceProperty(property, board.types) && !isMultiProperty(property)) ||
      property.type === "checkbox"
  )
  if (choices.length < 2) return null
  return (
    <KanbanSheetButton
      label={board.group ? `Group cards by ${board.group.name}` : "Group cards"}
      size={isWide ? "sm" : "icon-sm"}
      className="cn-kanban-control"
      groups={[
        {
          id: "group",
          label: "Columns",
          items: choices.map((property) => ({
            type: "check" as const,
            id: property.id,
            label: property.name,
            icon: <PropertyIcon property={property} />,
            isChecked: property.id === board.groupBy,
            onSelect: () =>
              board.setView({
                ...board.view,
                groupBy: property.id,
                hiddenColumns: [],
                collapsedColumns: [],
              }),
          })),
        },
      ]}
    >
      <Columns3Icon />
      {isWide && <Text>{board.group?.name ?? "Group"}</Text>}
    </KanbanSheetButton>
  )
}

function KanbanSort<Item>({ board }: KanbanPartProps<Item>) {
  const isWide = React.use(KanbanRoomContext) === "wide"
  const sort = board.view.sort?.[0]
  const sorted = board.properties.find(({ id }) => id === sort?.propertyId)
  if (!board.properties.length) return null
  const setSort = (
    propertyId: string | null,
    direction: "asc" | "desc" = "asc"
  ) =>
    board.setView({
      ...board.view,
      sort: propertyId ? [{ propertyId, direction }] : [],
    })
  return (
    <KanbanSheetButton
      label={sorted ? `Sort cards by ${sorted.name}` : "Sort cards"}
      size={isWide ? "sm" : "icon-sm"}
      className="cn-kanban-control"
      groups={[
        {
          id: "manual",
          items: [
            {
              type: "check",
              id: "manual",
              label: "Manual order",
              icon: <GripVerticalIcon />,
              isChecked: !sort,
              onSelect: () => setSort(null),
            },
          ],
        },
        {
          id: "property",
          label: "Sort by",
          items: board.properties.map((property) => ({
            type: "check" as const,
            id: property.id,
            label: property.name,
            icon: <PropertyIcon property={property} />,
            isChecked: property.id === sort?.propertyId,
            onSelect: () => setSort(property.id, sort?.direction),
          })),
        },
        {
          id: "direction",
          items: sort
            ? (["asc", "desc"] as const).map((direction) => ({
                type: "check" as const,
                id: direction,
                label: direction === "asc" ? "Ascending" : "Descending",
                icon: direction === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon />,
                isChecked: sort.direction === direction,
                onSelect: () => setSort(sort.propertyId, direction),
              }))
            : [],
        },
      ]}
    >
      <ArrowUpDownIcon />
      {isWide && <Text>{sorted?.name ?? "Sort"}</Text>}
    </KanbanSheetButton>
  )
}

function KanbanOption({
  label,
  icon,
  checked,
  onCheckedChange,
}: {
  label: string
  icon?: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <View
      data-slot="kanban-view-option"
      className="cn-kanban-view-option flex-row items-center"
    >
      {icon}
      <Text numberOfLines={1} className="cn-kanban-view-text flex-1">
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </View>
  )
}

/** Which pictures cover the cards, when there are any to choose from. */
function KanbanCoverOptions<Item>({ board }: KanbanPartProps<Item>) {
  const { view } = board
  const sources = board.properties.filter(({ type }) => type === "files")
  if (!sources.length) return null
  const { cover } = board
  return (
    <View className="cn-kanban-view-group">
      <Text className="cn-kanban-view-label">Cover</Text>
      <View
        data-slot="kanban-view-option"
        className="cn-kanban-view-option flex-row items-center"
      >
        <Text numberOfLines={1} className="cn-kanban-view-text flex-1">
          Picture
        </Text>
        <KanbanSheetButton
          label={`Cover picture: ${cover?.name ?? "None"}`}
          size="sm"
          className="cn-kanban-view-choice"
          groups={[
            {
              id: "sources",
              items: [
                {
                  type: "check" as const,
                  id: "none",
                  label: "None",
                  isChecked: !cover,
                  onSelect: () => board.setCover(null),
                },
                ...sources.map((property) => ({
                  type: "check" as const,
                  id: property.id,
                  label: property.name,
                  icon: <PropertyIcon property={property} />,
                  isChecked: property.id === cover?.id,
                  onSelect: () => board.setCover(property.id),
                })),
              ],
            },
          ]}
        >
          {cover?.name ?? "None"}
        </KanbanSheetButton>
      </View>
      {cover && (
        <KanbanOption
          label="Fit the whole picture"
          checked={view.coverFit === "fit"}
          onCheckedChange={(isFit) =>
            board.setView({ ...view, coverFit: isFit ? "fit" : "fill" })
          }
        />
      )}
    </View>
  )
}

function KanbanViewOptions<Item>({ board }: KanbanPartProps<Item>) {
  const isWide = React.use(KanbanRoomContext) === "wide"
  const [open, setOpen] = React.useState(false)
  const { view } = board
  const fields = board.properties.filter(
    (property) => board.isOnCard(property) !== undefined
  )
  const hidden = view.hiddenColumns ?? []
  const toggle = (list: readonly string[], id: string, isOn: boolean) =>
    isOn ? [...list, id] : list.filter((entry) => entry !== id)
  return (
    <>
      <Button
        variant="ghost"
        size={isWide ? "sm" : "icon-sm"}
        accessibilityLabel="View options"
        className="cn-kanban-control"
        onPress={() => setOpen(true)}
      >
        <SlidersHorizontalIcon />
        {isWide && <Text>View</Text>}
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <View
            data-slot="kanban-view-options"
            className="cn-kanban-view-groups"
          >
            <DrawerTitle>View options</DrawerTitle>
            <ScrollView className="max-h-96">
              <View className="cn-kanban-view-group">
                <KanbanOption
                  label="Color columns"
                  checked={view.colorColumns ?? false}
                  onCheckedChange={(colorColumns) =>
                    board.setView({ ...view, colorColumns })
                  }
                />
                <KanbanOption
                  label="Hide empty columns"
                  checked={view.hideEmpty ?? false}
                  onCheckedChange={(hideEmpty) =>
                    board.setView({ ...view, hideEmpty })
                  }
                />
              </View>
              <KanbanCoverOptions board={board} />
              {fields.length > 0 && (
                <View className="cn-kanban-view-group">
                  <Text className="cn-kanban-view-label">On cards</Text>
                  {fields.map((property) => (
                    <KanbanOption
                      key={property.id}
                      label={property.name}
                      icon={<PropertyIcon property={property} size={16} />}
                      checked={board.isOnCard(property) ?? false}
                      onCheckedChange={(isOn) =>
                        board.setOnCard(property.id, isOn)
                      }
                    />
                  ))}
                </View>
              )}
              <View className="cn-kanban-view-group">
                <Text className="cn-kanban-view-label">Columns</Text>
                {board.columns.map((column) => (
                  <KanbanOption
                    key={column.id}
                    label={column.name}
                    icon={<PropertyMark mark={column} />}
                    checked={!hidden.includes(column.id)}
                    onCheckedChange={(isOn) =>
                      board.setView({
                        ...view,
                        hiddenColumns: toggle(hidden, column.id, !isOn),
                      })
                    }
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </DrawerContent>
      </Drawer>
    </>
  )
}

function getMoveItems<Item>(
  board: KanbanController<Item>,
  ids: readonly string[]
): ControlMenuItem[] {
  const lanes = board.lanes?.length
    ? [...board.lanes, { id: null, name: "No lane" }]
    : [{ id: null, name: "" }]
  return lanes.flatMap((lane) =>
    board.groups.map(({ column, items }) => {
      const inside = items.filter(
        (item) => !board.getLaneId || board.getLaneId(item) === lane.id
      )
      const here = new Set(inside.map(board.getId))
      const isHere = ids.length > 0 && ids.every((id) => here.has(id))
      return {
        type: "check" as const,
        id: `${column.id}/${lane.id ?? ""}`,
        label: lane.name ? `${column.name} · ${lane.name}` : column.name,
        icon: <PropertyMark mark={column} />,
        isChecked: isHere,
        isDisabled:
          !isHere &&
          board.getMoveBlock(ids, column.id, inside.length, lane.id) !== null,
        onSelect: () => {
          if (!isHere) board.move(ids, column.id, inside.length, lane.id)
        },
      }
    })
  )
}

function getChoiceItems<Item>(
  board: KanbanController<Item>,
  ids: readonly string[]
): ControlMenuItem[] {
  const items = ids.flatMap((id) => board.byId.get(id) ?? [])
  return board.properties
    .filter(
      (property) =>
        isChoiceProperty(property, board.types) &&
        !property.isReadOnly &&
        property.id !== board.groupBy
    )
    .map((property) => {
      const values = items.map((item) =>
        readPropertyKeys(board.getValue(item, property.id))
      )
      return {
        type: "submenu",
        id: property.id,
        label: property.name,
        icon: <PropertyIcon property={property} />,
        groups: [
          {
            id: property.id,
            items: (property.options ?? [])
              .filter(({ isArchived }) => !isArchived)
              .map((option) => ({
                type: "check" as const,
                id: option.value,
                label: option.label,
                icon: getOptionIcon(property, option),
                isChecked:
                  values.length > 0 &&
                  values.every((keys) => keys.includes(option.value)),
                staysOpen: isMultiProperty(property),
                onSelect: () =>
                  board.setValue(
                    ids,
                    property.id,
                    togglePropertyOption(
                      property,
                      items.length
                        ? board.getValue(items[0], property.id)
                        : null,
                      option.value
                    )
                  ),
              })),
          },
        ],
      }
    })
}

function getCardGroups<Item>(
  board: KanbanController<Item>,
  id: string,
  onOpen: (() => void) | undefined,
  extra: readonly ControlMenuItem[]
): ControlMenuGroup[] {
  const ids =
    board.selectedIds.has(id) && board.selectedIds.size > 1
      ? [...board.selectedIds]
      : [id]
  const open: ControlMenuGroup = {
    id: "open",
    items: [
      ...(onOpen
        ? [
            {
              id: "open",
              label: "Open",
              icon: <MaximizeIcon />,
              onSelect: onOpen,
            },
          ]
        : []),
      ...extra,
    ],
  }
  if (!board.isMutable) return [open]
  const place = board.groups.find(({ items }) =>
    items.some((item) => board.getId(item) === id)
  )
  const item = board.byId.get(id)
  const laneId = item !== undefined ? (board.getLaneId?.(item) ?? null) : null
  return [
    open,
    {
      id: "edit",
      items: [
        {
          type: "submenu",
          id: "move",
          label: "Move to",
          icon: <ArrowRightIcon />,
          groups: [{ id: "move", items: getMoveItems(board, ids) }],
        },
        ...getChoiceItems(board, ids),
      ],
    },
    {
      id: "order",
      items: [
        ...(place && !board.view.sort?.length
          ? [
              {
                id: "top",
                label: "Move to top",
                icon: <ArrowUpIcon />,
                onSelect: () => {
                  board.move(ids, place.column.id, 0, laneId)
                },
              },
              {
                id: "bottom",
                label: "Move to bottom",
                icon: <ArrowDownIcon />,
                onSelect: () => {
                  board.move(ids, place.column.id, place.items.length, laneId)
                },
              },
            ]
          : []),
        {
          id: "select",
          label: board.selectedIds.has(id) ? "Deselect" : "Select",
          icon: <SquareCheckIcon />,
          onSelect: () => board.toggleSelection(id),
        },
      ],
    },
    {
      id: "danger",
      items: ids.every(board.canDelete)
        ? [
            {
              id: "delete",
              label: ids.length > 1 ? `Delete ${ids.length} cards` : "Delete",
              icon: <Trash2Icon />,
              variant: "destructive",
              onSelect: () => board.remove(ids),
            },
          ]
        : [],
    },
  ]
}

/** What can be done to the cards picked, while any are. */
function KanbanSelectionBar<Item>({
  board,
  children,
}: KanbanPartProps<Item> & { children?: React.ReactNode }) {
  const ids = [...board.selectedIds].filter((id) => board.byId.has(id))
  if (!ids.length) return null
  const choices = getChoiceItems(board, ids)
  return (
    <View
      accessibilityLabel="Selected cards"
      data-slot="kanban-selection-bar"
      className="cn-kanban-float flex-row items-center"
    >
      <Text numberOfLines={1} className="cn-kanban-selection-count">
        {ids.length} selected
      </Text>
      <KanbanSheetButton
        label="Move selected cards"
        groups={[{ id: "move", items: getMoveItems(board, ids) }]}
      >
        <ArrowRightIcon />
      </KanbanSheetButton>
      {choices.length > 0 && (
        <KanbanSheetButton
          label="Edit selected cards"
          groups={[{ id: "edit", items: choices }]}
        >
          <SquarePenIcon />
        </KanbanSheetButton>
      )}
      {children}
      {ids.every(board.canDelete) && (
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel="Delete selected cards"
          onPress={() => board.remove(ids)}
        >
          <Trash2Icon />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel="Clear selection"
        onPress={board.clearSelection}
      >
        <XIcon />
      </Button>
    </View>
  )
}

/** One line at the foot of the board: what went wrong, or what can be undone. */
function KanbanNotices<Item>({ board }: KanbanPartProps<Item>) {
  const { moveError, notice, failure, dismissMoveError, dismissNotice } = board
  React.useEffect(() => {
    if (!moveError && !notice) return
    const timer = setTimeout(() => {
      if (moveError) dismissMoveError()
      else dismissNotice()
    }, 6000)
    return () => clearTimeout(timer)
  }, [moveError, notice, dismissMoveError, dismissNotice])
  const [destructive, warning] = useCSSVariable(["--destructive", "--warning"])

  if (failure)
    return (
      <View
        data-slot="kanban-error"
        className="cn-kanban-notice flex-row items-center"
      >
        <CircleAlertIcon size={18} color={String(destructive)} />
        <Text
          accessibilityRole="alert"
          className="cn-kanban-notice-text shrink"
        >
          {failure.message}
        </Text>
        <Button variant="outline" size="sm" onPress={board.retryChange}>
          Retry
        </Button>
        <Button variant="ghost" size="sm" onPress={board.dismissFailure}>
          Dismiss
        </Button>
      </View>
    )
  if (moveError)
    return (
      <View
        data-slot="kanban-move-error"
        className="cn-kanban-notice flex-row items-center"
      >
        <TriangleAlertIcon size={18} color={String(warning)} />
        <Text
          accessibilityLiveRegion="polite"
          className="cn-kanban-notice-text shrink"
        >
          {moveError}
        </Text>
        <Button
          variant="ghost"
          size="icon-sm"
          accessibilityLabel="Dismiss"
          onPress={dismissMoveError}
        >
          <XIcon />
        </Button>
      </View>
    )
  if (!notice) return null
  return (
    <View
      data-slot="kanban-notice"
      className="cn-kanban-notice flex-row items-center"
    >
      <Text numberOfLines={2} className="cn-kanban-notice-text shrink">
        {notice.message}
      </Text>
      {notice.canUndo && board.undo && (
        <Button
          variant="ghost"
          size="sm"
          onPress={() => {
            void board.undo?.()
            dismissNotice()
          }}
        >
          <Undo2Icon />
          Undo
        </Button>
      )}
    </View>
  )
}

const onlyLane = [{ id: null, name: "" }]
// A column's edge and the next one's start, so a phone always shows there is more.
const PEEK = 56
const COLUMN_WIDTH = 304
const COLUMN_GAP = 12

function KanbanBoard<Item>({
  board,
  children,
  className,
  onAddCard,
  getColumnActions,
  getCardActions,
  addLabel = "New card",
  hasHeaderAdd = false,
  paging = "scroll",
  onOpenCard,
  getCover,
  renderCard,
  openId,
  ...props
}: KanbanBoardProps<Item>) {
  const fit = React.use(KanbanFitContext)
  const window = useWindowDimensions()
  // The room the board is given, which a panel or a card makes less than the
  // window's.
  const [room, setRoom] = React.useState<number | null>(null)
  const width = room ?? window.width
  const isPhone = width < 640
  const columnWidth = isPhone
    ? Math.min(COLUMN_WIDTH, width - PEEK)
    : COLUMN_WIDTH
  const [composing, setComposing] = React.useState<{
    columnId: string
    laneId: string | null
  } | null>(null)
  const isHidden = (id: string) => board.view.hiddenColumns?.includes(id)
  const hidden = board.groups.filter(({ column }) => isHidden(column.id))
  const visible = board.groups.filter(
    ({ column, items }) =>
      !isHidden(column.id) &&
      (!board.view.hideEmpty ||
        items.length ||
        (board.isPaged && board.pages?.get(column.id)?.total !== 0))
  )
  const lanes: readonly (KanbanLane | { id: null; name: string })[] =
    board.lanes?.length && board.getLaneId
      ? [...board.lanes, { id: null, name: "No lane" }]
      : onlyLane
  const hasLanes = lanes !== onlyLane
  const getIds = (id: string) =>
    board.selectedIds.has(id)
      ? [id, ...[...board.selectedIds].filter((entry) => entry !== id)]
      : [id]
  const drag = useKanbanDrag((id, target) => {
    board.move(getIds(id), target.columnId, target.index, target.laneId)
  })
  const dragged = drag.activeId ? board.byId.get(drag.activeId) : undefined
  return (
    <View
      onLayout={(event) => setRoom(event.nativeEvent.layout.width)}
      {...props}
      data-slot="kanban-board"
      data-fit={fit}
      className={cn("cn-kanban-board relative", className)}
    >
      <ScrollView
        ref={drag.scroller}
        horizontal
        scrollEnabled={!drag.activeId}
        snapToInterval={isPhone ? columnWidth + COLUMN_GAP : undefined}
        decelerationRate={isPhone ? "fast" : "normal"}
        showsHorizontalScrollIndicator={false}
        onScroll={(event) => {
          drag.scrollOffset.current = event.nativeEvent.contentOffset.x
        }}
        scrollEventThrottle={16}
        contentContainerClassName="min-h-full"
      >
        {children ?? (
          <View className="cn-kanban-lanes flex-col">
            {!visible.length && (
              <Text className="cn-kanban-column-message">
                No columns to show.
              </Text>
            )}
            {lanes.map((lane) => {
              const groups = hasLanes
                ? visible.map(({ column, items }) => ({
                    column,
                    items: items.filter(
                      (item) => board.getLaneId?.(item) === lane.id
                    ),
                  }))
                : visible
              const count = groups.reduce(
                (sum, { items }) => sum + items.length,
                0
              )
              if (hasLanes && lane.id === null && count === 0) return null
              const laneKey = lane.id ?? ""
              const isCollapsed =
                hasLanes && !!board.view.collapsedLanes?.includes(laneKey)
              return (
                <View
                  key={laneKey}
                  data-slot="kanban-lane"
                  className="cn-kanban-lane flex-1 flex-col"
                >
                  {hasLanes && (
                    <Pressable
                      accessibilityRole="button"
                      aria-expanded={!isCollapsed}
                      className="cn-kanban-lane-title flex-row items-center self-start"
                      onPress={() => {
                        const collapsed = board.view.collapsedLanes ?? []
                        board.setView({
                          ...board.view,
                          collapsedLanes: isCollapsed
                            ? collapsed.filter((id) => id !== laneKey)
                            : [...collapsed, laneKey],
                        })
                      }}
                    >
                      <View data-slot="kanban-lane-chevron">
                        {isCollapsed ? (
                          <ChevronRightIcon size={14} />
                        ) : (
                          <ChevronDownIcon size={14} />
                        )}
                      </View>
                      <Text className="cn-kanban-lane-text">{lane.name}</Text>
                      <Text className="cn-kanban-column-count">{count}</Text>
                    </Pressable>
                  )}
                  <View
                    className="cn-kanban-track flex-1 flex-row items-stretch"
                    style={[
                      { gap: COLUMN_GAP },
                      isCollapsed ? { display: "none" } : undefined,
                    ]}
                  >
                    {groups.map(({ column, items }) => (
                      <KanbanColumn
                        key={column.id}
                        board={board}
                        column={column}
                        laneId={lane.id}
                        items={items}
                        style={{ width: columnWidth }}
                        drag={drag}
                        isComposing={
                          composing?.columnId === column.id &&
                          composing.laneId === lane.id
                        }
                        onComposingChange={(isComposing) =>
                          setComposing(
                            isComposing
                              ? { columnId: column.id, laneId: lane.id }
                              : null
                          )
                        }
                        onAddCard={onAddCard}
                        getColumnActions={getColumnActions}
                        getCardActions={getCardActions}
                        addLabel={addLabel}
                        hasHeaderAdd={hasHeaderAdd}
                        paging={paging}
                        onOpenCard={onOpenCard}
                        getCover={getCover}
                        renderCard={renderCard}
                        openId={openId}
                      />
                    ))}
                    {!hasLanes && <KanbanEnd board={board} hidden={hidden} />}
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
      <KanbanNativeDragOverlay drag={drag} width={columnWidth - 16}>
        {dragged !== undefined && (
          <View className="cn-kanban-card-lifted">
            <KanbanCardFace
              board={board}
              item={dragged}
              getCover={getCover}
              renderCard={renderCard}
            />
            {drag.activeId && getIds(drag.activeId).length > 1 && (
              <View className="cn-kanban-drag-count absolute items-center justify-center">
                <Text className="cn-kanban-drag-count-text">
                  {getIds(drag.activeId).length}
                </Text>
              </View>
            )}
          </View>
        )}
      </KanbanNativeDragOverlay>
    </View>
  )
}

/** After the columns: a new one, then the hidden ones. */
function KanbanEnd<Item>({
  board,
  hidden,
}: KanbanPartProps<Item> & { hidden: KanbanController<Item>["groups"] }) {
  if (!board.onColumnsChange && !hidden.length) return null
  return (
    <View data-slot="kanban-end" className="cn-kanban-end flex-col">
      {board.onColumnsChange && <KanbanColumnCreate board={board} />}
      {hidden.length > 0 && (
        <KanbanHiddenColumns board={board} hidden={hidden} />
      )}
    </View>
  )
}

/** Columns left out of the view, one tap from coming back. */
function KanbanHiddenColumns<Item>({
  board,
  hidden,
}: KanbanPartProps<Item> & { hidden: KanbanController<Item>["groups"] }) {
  return (
    <View
      data-slot="kanban-hidden-columns"
      accessibilityLabel="Hidden columns"
      className="cn-kanban-hidden"
    >
      <Text className="cn-kanban-hidden-label">Hidden</Text>
      {hidden.map(({ column, items }) => (
        <Button
          key={column.id}
          variant="ghost"
          accessibilityLabel={`Show ${column.name}`}
          className="cn-kanban-hidden-item justify-start"
          onPress={() =>
            board.setView({
              ...board.view,
              hiddenColumns: board.view.hiddenColumns?.filter(
                (id) => id !== column.id
              ),
            })
          }
        >
          <PropertyMark mark={column} />
          <Text numberOfLines={1} className="cn-kanban-view-text flex-1">
            {column.name}
          </Text>
          <Text className="cn-kanban-column-count">
            {board.totals.get(column.id) ?? items.length}
          </Text>
        </Button>
      ))}
    </View>
  )
}

function KanbanColumnCreate<Item>({ board }: KanbanPartProps<Item>) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  function commit() {
    const text = name.trim()
    setIsOpen(false)
    setName("")
    if (!text) return
    board.onColumnsChange?.([
      ...board.columns,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: text,
        color: "gray",
      },
    ])
  }
  return (
    <View data-slot="kanban-column-create" className="cn-kanban-column-create">
      {isOpen ? (
        <Input
          autoFocus
          accessibilityLabel="New column name"
          placeholder="Column name"
          value={name}
          onChangeText={setName}
          onBlur={commit}
        />
      ) : (
        <Button
          variant="ghost"
          className="cn-kanban-column-add justify-start"
          onPress={() => setIsOpen(true)}
        >
          <PlusIcon size={16} />
          Add column
        </Button>
      )}
    </View>
  )
}

type KanbanColumnProps<Item> = React.ComponentProps<typeof View> &
  KanbanCardRenderers<Item> &
  Pick<
    KanbanBoardProps<Item>,
    | "onAddCard"
    | "getColumnActions"
    | "getCardActions"
    | "addLabel"
    | "hasHeaderAdd"
    | "paging"
  > &
  KanbanPartProps<Item> & {
    column: KanbanColumnDefinition
    items: readonly Item[]
    laneId?: string | null
    drag?: KanbanNativeDrag
    isComposing?: boolean
    onComposingChange?: (isComposing: boolean) => void
  }

const countFormat = new Intl.NumberFormat("en-US")

function KanbanColumn<Item>({
  board,
  column,
  items,
  laneId = null,
  drag,
  isComposing = false,
  onComposingChange,
  onAddCard,
  getColumnActions,
  getCardActions,
  addLabel = "New card",
  hasHeaderAdd = false,
  paging = "scroll",
  onOpenCard,
  getCover,
  renderCard,
  openId,
  children,
  className,
  ...props
}: KanbanColumnProps<Item>) {
  const fit = React.use(KanbanFitContext)
  const toMark = usePaletteMark()
  const page = board.pages?.get(column.id)
  const isLoading =
    page?.isLoading ||
    (board.isPaged && !page && board.columns.some(({ id }) => id === column.id))
  const isCollapsed = board.view.collapsedColumns?.includes(column.id) ?? false
  const count = board.lanes?.length
    ? items.length
    : (board.totals.get(column.id) ?? items.length)
  const isFiltered = !!(board.view.search?.trim() || board.view.filters)
  // Until the first page lands, the column can't know how many it holds.
  const isCounting =
    !!isLoading && items.length === 0 && page?.total === undefined
  const limit = getKanbanLimitState(column, count)
  const target =
    drag?.target?.columnId === column.id && drag.target.laneId === laneId
      ? drag.target
      : null
  const isSorted = !!board.view.sort?.length
  const hasMore =
    !isLoading &&
    page !== undefined &&
    page.error === undefined &&
    page.nextCursor !== null
  const canAdd =
    !column.isLocked && (onAddCard ? true : board.canCreate) && !isLoading
  const add = () => {
    if (onAddCard) onAddCard(column.id, laneId)
    else onComposingChange?.(true)
  }
  const setCollapsed = (next: boolean) => {
    const ids = board.view.collapsedColumns ?? []
    board.setView({
      ...board.view,
      collapsedColumns: next
        ? [...ids, column.id]
        : ids.filter((id) => id !== column.id),
    })
  }
  const isTinted =
    board.view.colorColumns && column.color && column.color !== "gray"
  const [renaming, setRenaming] = React.useState<"tap" | "menu" | null>(null)
  const canManage =
    !!board.onColumnsChange && board.columns.some(({ id }) => id === column.id)
  const key = JSON.stringify([column.id, laneId])
  return (
    <View
      {...props}
      ref={(node) => drag?.register(key, node, { columnId: column.id, laneId })}
      collapsable={false}
      data-slot="kanban-column"
      data-drop-target={!!target}
      data-fit={fit}
      className={cn("cn-kanban-column flex-col overflow-hidden", className)}
    >
      {isTinted && column.color && (
        <View
          pointerEvents="none"
          className="absolute inset-0"
          style={{ backgroundColor: toMark(column.color), opacity: 0.13 }}
        />
      )}
      <View
        data-slot="kanban-column-header"
        className="cn-kanban-column-header flex-row items-center"
      >
        <PropertyMark mark={column} />
        {renaming ? (
          <KanbanColumnNameField
            name={column.name}
            isFromMenu={renaming === "menu"}
            onCommit={(text) => {
              const next = renameKanbanColumn(board.columns, column.id, text)
              if (next) board.onColumnsChange?.(next)
            }}
            onClose={() => setRenaming(null)}
          />
        ) : (
          <KanbanColumnTitle
            onRename={canManage ? () => setRenaming("tap") : undefined}
          >
            {column.name}
          </KanbanColumnTitle>
        )}
        {isCounting ? (
          <Skeleton className="cn-kanban-count-skeleton" />
        ) : (
          <Text
            data-slot="kanban-column-count"
            data-limit={limit ?? "under"}
            numberOfLines={1}
            className="cn-kanban-column-count"
          >
            {isFiltered
              ? `${countFormat.format(items.length)} of ${countFormat.format(count)}`
              : `${countFormat.format(count)}${column.limit === undefined ? "" : `/${column.limit}`}`}
          </Text>
        )}
        <View
          className={cn(
            "cn-kanban-column-actions flex-row justify-end",
            !renaming && "flex-1"
          )}
        >
          <KanbanSheetButton
            label={`${column.name} options`}
            size="icon-xs"
            groups={[
              { id: "app", items: getColumnActions?.(column) ?? [] },
              {
                id: "manage",
                items: canManage
                  ? [
                      {
                        id: "rename",
                        label: "Rename",
                        icon: <PencilIcon />,
                        onSelect: () => setRenaming("menu"),
                      },
                    ]
                  : [],
              },
              {
                id: "view",
                items: [
                  {
                    id: "collapse",
                    label: isCollapsed ? "Expand" : "Collapse",
                    icon: <MinusIcon />,
                    onSelect: () => setCollapsed(!isCollapsed),
                  },
                  {
                    id: "hide",
                    label: "Hide from view",
                    icon: <EyeOffIcon />,
                    onSelect: () =>
                      board.setView({
                        ...board.view,
                        hiddenColumns: [
                          ...(board.view.hiddenColumns ?? []),
                          column.id,
                        ],
                      }),
                  },
                ],
              },
            ]}
          >
            <EllipsisIcon />
          </KanbanSheetButton>
          {hasHeaderAdd && canAdd && (
            <Button
              size="icon-xs"
              variant="ghost"
              accessibilityLabel={`${addLabel} in ${column.name}`}
              onPress={add}
            >
              <PlusIcon />
            </Button>
          )}
        </View>
      </View>
      {!isCollapsed && (
        <View
          data-slot="kanban-column-body"
          data-fit={fit}
          className="cn-kanban-column-body"
          accessibilityState={{ busy: !!isLoading }}
        >
          {children ?? (
            <LegendList
              data={items}
              extraData={[board, drag?.activeId, target, openId]}
              recycleItems={false}
              keyExtractor={board.getId}
              estimatedItemSize={112}
              scrollEnabled={!drag?.activeId}
              onEndReachedThreshold={0.6}
              onEndReached={
                hasMore && paging === "scroll"
                  ? () => board.loadMore(column.id)
                  : undefined
              }
              renderItem={({ item, index }) => (
                <KanbanCard
                  board={board}
                  item={item}
                  index={index}
                  siblings={items.length}
                  column={column}
                  laneId={laneId}
                  drag={drag}
                  isDropTarget={!isSorted && target?.index === index}
                  getCardActions={getCardActions}
                  onOpenCard={onOpenCard}
                  getCover={getCover}
                  renderCard={renderCard}
                  openId={openId}
                />
              )}
              ListEmptyComponent={
                isLoading ? (
                  <View
                    data-slot="kanban-column-loading"
                    accessibilityLabel="Loading cards"
                  >
                    <KanbanCardSkeleton />
                    <KanbanCardSkeleton />
                    <KanbanCardSkeleton />
                  </View>
                ) : page?.error === undefined && !target ? (
                  <Text
                    data-slot="kanban-column-empty"
                    className="cn-kanban-column-message"
                  >
                    {isFiltered ? "No matching cards" : "No cards yet"}
                  </Text>
                ) : null
              }
              ListFooterComponent={
                <View>
                  {!isSorted && target?.index === items.length && (
                    <View
                      data-slot="kanban-drop-slot"
                      className="cn-kanban-drop-slot"
                    />
                  )}
                  {isLoading && items.length > 0 && <KanbanCardSkeleton />}
                  {page?.error !== undefined && (
                    <View
                      data-slot="kanban-column-error"
                      className="cn-kanban-column-error items-center"
                    >
                      <Text
                        accessibilityRole="alert"
                        className="cn-kanban-column-message"
                      >
                        {items.length
                          ? "Couldn’t load more cards."
                          : "Couldn’t load cards."}
                      </Text>
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => board.retry(column.id)}
                      >
                        Try again
                      </Button>
                    </View>
                  )}
                  {hasMore && paging === "button" && (
                    <Button
                      variant="ghost"
                      className="cn-kanban-add justify-start"
                      onPress={() => board.loadMore(column.id)}
                    >
                      Load more
                    </Button>
                  )}
                  {isComposing ? (
                    <KanbanComposer
                      label={`${addLabel} in ${column.name}`}
                      onCreate={(title) =>
                        board.create(title, column.id, laneId, "end")
                      }
                      onClose={() => onComposingChange?.(false)}
                    />
                  ) : (
                    canAdd &&
                    !hasMore && (
                      <Button
                        variant="ghost"
                        className="cn-kanban-add justify-start"
                        onPress={add}
                      >
                        <PlusIcon />
                        {addLabel}
                      </Button>
                    )
                  )}
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  )
}

function KanbanColumnTitle({
  children,
  onRename,
}: {
  children: string
  /** Two taps on the name; the column's menu has it too. */
  onRename?: () => void
}) {
  const rename = () => onRename?.()
  const taps = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(!!onRename)
    .onEnd((_, success) => {
      if (success) runOnJS(rename)()
    })
  return (
    <GestureDetector gesture={taps}>
      <View collapsable={false} className="shrink">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="cn-kanban-column-title"
        >
          {children}
        </Text>
      </View>
    </GestureDetector>
  )
}

function KanbanColumnNameField({
  name,
  isFromMenu,
  onCommit,
  onClose,
}: {
  name: string
  isFromMenu: boolean
  onCommit: (text: string) => void
  onClose: () => void
}) {
  const field = React.useRef<React.ComponentRef<typeof TextInput>>(null)
  React.useEffect(() => {
    // The keyboard can't rise while the sheet that asked for it is leaving.
    const timer = setTimeout(() => field.current?.focus(), isFromMenu ? 400 : 0)
    return () => clearTimeout(timer)
  }, [isFromMenu])
  return (
    <TextInput
      ref={field}
      data-slot="kanban-column-name"
      accessibilityLabel={`Name of ${name}`}
      defaultValue={name}
      selectTextOnFocus
      submitBehavior="blurAndSubmit"
      selectionColorClassName="accent-primary"
      className="cn-kanban-header-field"
      onEndEditing={(event) => {
        onCommit(event.nativeEvent.text)
        onClose()
      }}
    />
  )
}

function KanbanCardSkeleton() {
  return (
    <View data-slot="kanban-card-skeleton" className="cn-kanban-card-skeleton">
      <View className="cn-kanban-card-content">
        <View className="cn-kanban-card-head flex-row items-center">
          <Skeleton className="cn-kanban-skeleton-line w-1/4" />
        </View>
        <View className="flex-row items-center">
          <Skeleton className="cn-kanban-skeleton-line flex-1" />
          <Text aria-hidden className="cn-kanban-skeleton-title w-0">
            {" "}
          </Text>
        </View>
        <View className="cn-kanban-card-properties flex-row items-center">
          <Skeleton className="cn-kanban-skeleton-chip w-14" />
          <Skeleton className="cn-kanban-skeleton-chip w-20" />
        </View>
      </View>
    </View>
  )
}

function KanbanComposer({
  label,
  onCreate,
  onClose,
}: {
  label: string
  onCreate: (title: string) => void
  onClose: () => void
}) {
  const [title, setTitle] = React.useState("")
  function commit() {
    const name = title.trim()
    setTitle("")
    if (name) onCreate(name)
    return !!name
  }
  return (
    <View data-slot="kanban-composer" className="cn-kanban-composer">
      <Input
        autoFocus
        accessibilityLabel={label}
        placeholder="Card title"
        value={title}
        submitBehavior="submit"
        onChangeText={setTitle}
        onSubmitEditing={() => {
          if (!commit()) onClose()
        }}
        onBlur={() => {
          commit()
          onClose()
        }}
      />
    </View>
  )
}

type KanbanCardProps<Item> = Omit<
  React.ComponentProps<typeof View>,
  "children"
> &
  KanbanCardRenderers<Item> &
  KanbanPartProps<Item> & {
    item: Item
    index: number
    siblings: number
    column: KanbanColumnDefinition
    laneId: string | null
    isDropTarget?: boolean
    drag?: KanbanNativeDrag
    getCardActions?: (item: Item) => readonly ControlMenuItem[]
  }

/** The values a card shows, by where they sit on it. Empty ones are left out. */
function getCardFields<Item>(board: KanbanController<Item>, item: Item) {
  const getPlacement = ({ type }: PropertyDefinition) =>
    getPropertyType(type, board.types).placement ?? "tags"
  const shown = board.properties.filter((field) => {
    const value = board.getValue(item, field.id)
    // A lone picture already covers the card; counting it says nothing more.
    const isCoverOnly =
      field.id === board.cover?.id && readPropertyFiles(value).length === 1
    return (
      board.isOnCard(field) &&
      !isCoverOnly &&
      hasPropertyValue(field, value, board.types)
    )
  })
  return {
    keys: shown.filter(({ type }) => type === "key"),
    people: shown.filter(
      (field) => getPlacement(field) === "head" && field.type !== "key"
    ),
    tags: shown.filter((field) => getPlacement(field) === "tags"),
    meta: shown.filter((field) => getPlacement(field) === "meta"),
  }
}

/** A card's picture. One that doesn't load leaves the card as it would be without. */
function KanbanCardCover({ src, fit }: { src: string; fit: "fill" | "fit" }) {
  const [failed, setFailed] = React.useState<string | null>(null)
  if (failed === src) return null
  return (
    <Image
      accessible={false}
      data-slot="kanban-card-cover"
      source={{ uri: src }}
      resizeMode={fit === "fit" ? "contain" : "cover"}
      className="cn-kanban-card-cover w-full"
      onError={() => setFailed(src)}
    />
  )
}

function KanbanCardFace<Item>({
  board,
  item,
  renderCard,
  getCover,
  actions,
}: Pick<KanbanCardProps<Item>, "board" | "item" | "renderCard" | "getCover"> & {
  actions?: React.ReactNode
}) {
  const fields = getCardFields(board, item)
  const picture =
    board.cover &&
    getPropertyCover(board.cover, board.getValue(item, board.cover.id))
  const cover = getCover?.(item) ?? picture?.thumbnail ?? picture?.url
  const draw = (field: PropertyDefinition) => (
    <PropertyValue
      key={field.id}
      variant="card"
      property={field}
      value={board.getValue(item, field.id)}
    />
  )
  const hasHead = fields.keys.length > 0 || fields.people.length > 0
  const title = (
    <Text
      data-slot="kanban-card-title"
      numberOfLines={3}
      className="cn-kanban-card-title shrink grow"
    >
      {board.getTitle(item)}
    </Text>
  )
  return (
    <>
      {cover && (
        <KanbanCardCover src={cover} fit={board.view.coverFit ?? "fill"} />
      )}
      <View className="cn-kanban-card-content">
        {renderCard ? (
          renderCard(item)
        ) : (
          <>
            {hasHead ? (
              <>
                <View
                  data-slot="kanban-card-head"
                  className="cn-kanban-card-head flex-row items-center"
                >
                  <View className="cn-kanban-card-key flex-1 flex-row">
                    {fields.keys.map(draw)}
                  </View>
                  {actions}
                  {fields.people.map(draw)}
                </View>
                {title}
              </>
            ) : (
              <View className="flex-row items-start">
                {title}
                {actions}
              </View>
            )}
            {fields.tags.length + fields.meta.length > 0 && (
              <View
                data-slot="kanban-card-properties"
                className="cn-kanban-card-properties flex-row flex-wrap items-center"
              >
                {fields.tags.map(draw)}
                {fields.meta.length > 0 && (
                  <View className="cn-kanban-card-meta grow flex-row flex-wrap items-center justify-end">
                    {fields.meta.map(draw)}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </>
  )
}

function KanbanCard<Item>({
  board,
  item,
  column,
  index,
  siblings,
  laneId,
  onOpenCard,
  getCover,
  renderCard,
  openId,
  getCardActions,
  className,
  isDropTarget = false,
  drag,
  ...props
}: KanbanCardProps<Item>) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const id = board.getId(item)
  const title = board.getTitle(item)
  const open = onOpenCard ? () => onOpenCard(item) : undefined
  const isSelecting = board.selectedIds.size > 0
  const card = (
    <View
      {...props}
      ref={(node) =>
        drag?.register(
          JSON.stringify([id, column.id, laneId]),
          node,
          { columnId: column.id, laneId },
          index
        )
      }
      collapsable={false}
      data-slot="kanban-card"
      data-selected={board.selectedIds.has(id)}
      data-open={id === openId}
      data-pending={board.pendingIds.has(id)}
      data-dragging={drag?.activeId === id}
      className={cn("cn-kanban-card overflow-hidden", className)}
    >
      <Pressable
        accessibilityRole={open ? "button" : undefined}
        accessibilityLabel={title}
        accessibilityHint={`Card ${index + 1} of ${siblings}`}
        accessibilityActions={
          board.isMutable ? [{ name: "longpress", label: "Actions" }] : []
        }
        onAccessibilityAction={() => setIsMenuOpen(true)}
        disabled={!open && !isSelecting}
        className="cn-kanban-card-press"
        onPress={() => {
          if (isSelecting && board.isMutable) board.toggleSelection(id)
          else open?.()
        }}
      >
        <KanbanCardFace
          board={board}
          item={item}
          getCover={getCover}
          renderCard={renderCard}
          actions={
            board.isMutable ? (
              <Button
                size="icon-xs"
                variant="ghost"
                accessibilityLabel={`Actions for ${title}`}
                className="cn-kanban-card-more"
                onPress={() => setIsMenuOpen(true)}
              >
                <EllipsisIcon />
              </Button>
            ) : undefined
          }
        />
      </Pressable>
    </View>
  )
  return (
    <View className="cn-kanban-card-slot">
      {isDropTarget && (
        <View data-slot="kanban-drop-slot" className="cn-kanban-drop-slot" />
      )}
      {drag ? (
        <KanbanDragArea drag={drag} id={id} disabled={!board.isMutable}>
          {card}
        </KanbanDragArea>
      ) : (
        card
      )}
      <ControlSheet
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        label={title}
        groups={
          isMenuOpen
            ? getCardGroups(board, id, open, getCardActions?.(item) ?? [])
            : []
        }
      />
    </View>
  )
}

export {
  Kanban,
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanFilter,
  KanbanGroup,
  KanbanNotices,
  KanbanSearch,
  KanbanSelectionBar,
  KanbanSort,
  KanbanToolbar,
  KanbanViewOptions,
  useKanban,
}
export type {
  ControlMenuGroup as KanbanMenuGroup,
  ControlMenuItem as KanbanMenuItem,
  KanbanBoardProps,
  KanbanCardProps,
  KanbanCardRenderers,
  KanbanColumnProps,
  KanbanController,
  KanbanDraft,
  KanbanOptions,
  KanbanProps,
  KanbanView,
}
export type {
  KanbanChange,
  KanbanColumn as KanbanColumnDefinition,
  KanbanLane,
  KanbanLoader,
  KanbanPage,
  KanbanPlacement,
} from "@/registry/fabricator/shared/lib/kanban-model"
