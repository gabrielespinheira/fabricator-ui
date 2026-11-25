import type { ReactNode } from "react"

import type { DataTableColumnType } from "./data-table-model"

// What a property can be. A type is data: its name, how it sorts and filters,
// the settings people can change, and how its value is read and checked. The
// built-in ones and an app's own go through the same set, so a new type needs
// nothing from this library but a definition.

/** Where a status stands, for its glyph when it names no icon. */
type PropertyOptionGroup = "todo" | "inProgress" | "complete"

type PropertyOption = {
  value: string
  label: string
  /** A palette name, a role, or any CSS colour. */
  color?: string
  /** A built-in glyph (`status-review`, `priority-high`) or an app's icon. */
  icon?: string
  /** A picture, for a person or a record. */
  image?: string
  group?: PropertyOptionGroup
  isArchived?: boolean
}

type PropertySettingValue = string | number | boolean

/** When a record shows the row. */
type PropertyVisibility = "show" | "hide-empty" | "hide"

type PropertyDefinition = {
  id: string
  name: string
  type: string
  /** An app icon or another type's; the type's own otherwise. */
  icon?: string
  description?: string
  options?: readonly PropertyOption[]
  /** The type's own settings, by id. Ones left out keep the type's default. */
  settings?: Readonly<Record<string, PropertySettingValue>>
  /** What a new record starts with. */
  defaultValue?: unknown
  visibility?: PropertyVisibility
  required?: boolean
  isReadOnly?: boolean
  /** The app's own: people can't rename, change or delete it. */
  isSystem?: boolean
}

type PropertySettingField = {
  id: string
  label: string
  /** Leaves the setting out while it has no effect. */
  isShown?: (read: (id: string) => PropertySettingValue | undefined) => boolean
} & (
  | {
      kind: "choice"
      choices: readonly { value: string; label: string }[]
      defaultValue: string
    }
  | { kind: "switch"; defaultValue: boolean }
  | {
      kind: "number"
      min?: number
      max?: number
      placeholder?: string
      defaultValue?: number
    }
  | { kind: "text"; placeholder?: string; defaultValue?: string }
)

type PropertyTypeGroup = "basic" | "people" | "media" | "advanced" | "system"

/** What a renderer of an app's own type is given. */
type PropertyRenderProps = {
  property: PropertyDefinition
  value: unknown
  /** `card` is compact and draws nothing for an empty value. */
  variant: "row" | "card"
}

type PropertyEditorRenderProps = {
  property: PropertyDefinition
  value: unknown
  onValueChange: (value: unknown) => void
}

type PropertyTypeDefinition = {
  type: string
  name: string
  /** A line under the name where a type is picked. */
  description?: string
  group?: PropertyTypeGroup
  /** The icon of its properties, unless one names its own. */
  icon?: ReactNode
  /** How its values sort and filter. Text, by default. */
  filterAs?: DataTableColumnType
  /** Where it sits on a card: beside the key, under the title, or at its end. */
  placement?: "head" | "tags" | "meta"
  /** People pick from options they can edit. */
  hasOptions?: boolean
  /** Left out of the types people can create. */
  isInternal?: boolean
  /** Shown and never edited, such as a formula. */
  isReadOnly?: boolean
  /** What a new property of this type starts with. */
  create?: Partial<PropertyDefinition>
  settings?: readonly PropertySettingField[]
  /** A value as text, for search, sorting and reading out. */
  format?: (value: unknown, property: PropertyDefinition) => string
  /** A value from typed text: null is empty, undefined isn't valid. */
  parse?: (text: string, property: PropertyDefinition) => unknown
  /** Why a value can't be kept. */
  validate?: (value: unknown, property: PropertyDefinition) => string | null
  isEmpty?: (value: unknown, property: PropertyDefinition) => boolean
  renderValue?: (props: PropertyRenderProps) => ReactNode
  renderEditor?: (props: PropertyEditorRenderProps) => ReactNode
}

type PropertyTypeMap = ReadonlyMap<string, PropertyTypeDefinition>

const propertyTypes = [
  "title",
  "text",
  "number",
  "select",
  "multi-select",
  "status",
  "date",
  "checkbox",
  "person",
  "files",
  "url",
  "email",
  "phone",
  "relation",
  "rating",
  "duration",
  "color",
  "location",
  "formula",
  "progress",
  "key",
  "created-time",
  "created-by",
  "edited-time",
  "edited-by",
] as const

type PropertyType = (typeof propertyTypes)[number]

const currencies = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "BRL",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "INR",
  "MXN",
  "SEK",
] as const

/** The colours a colour property starts with: one row of the picker. */
const propertySwatches = [
  { name: "Red", hex: "#e5484d" },
  { name: "Orange", hex: "#f76b15" },
  { name: "Yellow", hex: "#ffc53d" },
  { name: "Green", hex: "#30a46c" },
  { name: "Teal", hex: "#12a594" },
  { name: "Blue", hex: "#3e63dd" },
  { name: "Purple", hex: "#8e4ec6" },
  { name: "Pink", hex: "#d6409f" },
  { name: "Gray", hex: "#8d8d8d" },
  { name: "Black", hex: "#1c1c1c" },
] as const

/** The colours a property offers: its own options, or the default ones. */
function getPropertySwatches({ options }: PropertyDefinition) {
  return options?.length
    ? options
        .filter(({ isArchived }) => !isArchived)
        .map(({ value, label }) => ({ color: value, label }))
    : propertySwatches.map(({ name, hex }) => ({ color: hex, label: name }))
}

const dateSettings: readonly PropertySettingField[] = [
  {
    id: "dateFormat",
    label: "Date format",
    kind: "choice",
    choices: [
      { value: "relative", label: "Relative" },
      { value: "short", label: "Nov 27" },
      { value: "long", label: "November 27, 2026" },
      { value: "numeric", label: "11/27/2026" },
      { value: "iso", label: "2026-11-27" },
    ],
    defaultValue: "relative",
  },
  {
    id: "hourCycle",
    label: "Time format",
    kind: "choice",
    choices: [
      { value: "auto", label: "Automatic" },
      { value: "12", label: "12 hours" },
      { value: "24", label: "24 hours" },
    ],
    defaultValue: "auto",
    isShown: (read) => read("hasTime") === true,
  },
]

const optionSettings: readonly PropertySettingField[] = [
  {
    id: "canCreateOptions",
    label: "New options while picking",
    kind: "switch",
    defaultValue: true,
  },
]

const builtins: Record<PropertyType, Omit<PropertyTypeDefinition, "type">> = {
  title: { name: "Title", isInternal: true, group: "system" },
  text: {
    name: "Text",
    group: "basic",
    settings: [
      {
        id: "isMultiline",
        label: "Several lines",
        kind: "switch",
        defaultValue: true,
      },
      {
        id: "maxLength",
        label: "Longest",
        kind: "number",
        min: 1,
        placeholder: "Any",
      },
    ],
  },
  number: {
    name: "Number",
    group: "basic",
    filterAs: "number",
    placement: "meta",
    settings: [
      {
        id: "numberFormat",
        label: "Number format",
        kind: "choice",
        choices: [
          { value: "comma", label: "Number" },
          { value: "plain", label: "No separators" },
          { value: "compact", label: "Short" },
          { value: "percent", label: "Percent" },
          { value: "currency", label: "Currency" },
        ],
        defaultValue: "comma",
      },
      {
        id: "currency",
        label: "Currency",
        kind: "choice",
        choices: currencies.map((code) => ({ value: code, label: code })),
        defaultValue: "USD",
        isShown: (read) => read("numberFormat") === "currency",
      },
      {
        id: "decimals",
        label: "Decimals",
        kind: "choice",
        choices: [
          { value: "auto", label: "Automatic" },
          { value: "0", label: "None" },
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
        ],
        defaultValue: "auto",
      },
      {
        id: "unit",
        label: "Unit",
        kind: "text",
        placeholder: "None",
        isShown: (read) =>
          read("numberFormat") !== "currency" &&
          read("numberFormat") !== "percent",
      },
      {
        id: "display",
        label: "Show as",
        kind: "choice",
        choices: [
          { value: "number", label: "Number" },
          { value: "bar", label: "Bar" },
          { value: "ring", label: "Ring" },
        ],
        defaultValue: "number",
      },
      { id: "step", label: "Step", kind: "number", min: 0, placeholder: "1" },
      { id: "minimum", label: "Smallest", kind: "number", placeholder: "Any" },
      { id: "maximum", label: "Largest", kind: "number", placeholder: "Any" },
    ],
  },
  select: {
    name: "Select",
    group: "basic",
    filterAs: "status",
    placement: "tags",
    hasOptions: true,
    create: { options: [] },
    settings: optionSettings,
  },
  "multi-select": {
    name: "Multi-select",
    group: "basic",
    filterAs: "tags",
    placement: "tags",
    hasOptions: true,
    create: { options: [] },
    settings: optionSettings,
  },
  status: {
    name: "Status",
    group: "basic",
    filterAs: "status",
    placement: "tags",
    hasOptions: true,
    create: {
      options: [
        { value: "todo", label: "To do", group: "todo", color: "gray" },
        {
          value: "in-progress",
          label: "In progress",
          group: "inProgress",
          color: "blue",
        },
        { value: "done", label: "Done", group: "complete", color: "green" },
      ],
    },
  },
  date: {
    name: "Date",
    group: "basic",
    filterAs: "date",
    placement: "meta",
    settings: [
      {
        id: "hasRange",
        label: "End date",
        kind: "switch",
        defaultValue: false,
      },
      { id: "hasTime", label: "Time", kind: "switch", defaultValue: false },
      ...dateSettings,
      {
        id: "isDue",
        label: "Warn when overdue",
        kind: "switch",
        defaultValue: true,
      },
    ],
  },
  checkbox: {
    name: "Checkbox",
    group: "basic",
    filterAs: "boolean",
    settings: [
      {
        id: "display",
        label: "Show as",
        kind: "choice",
        choices: [
          { value: "checkbox", label: "Checkbox" },
          { value: "switch", label: "Switch" },
        ],
        defaultValue: "checkbox",
      },
    ],
  },
  person: {
    name: "Person",
    group: "people",
    filterAs: "person",
    placement: "head",
    create: { options: [] },
    settings: [
      {
        id: "isMultiple",
        label: "Several people",
        kind: "switch",
        defaultValue: false,
      },
    ],
  },
  files: {
    name: "Files & media",
    group: "media",
    filterAs: "tags",
    placement: "meta",
    settings: [
      {
        id: "accept",
        label: "Accepts",
        kind: "choice",
        choices: [
          { value: "any", label: "Any file" },
          { value: "images", label: "Images" },
          { value: "media", label: "Images and video" },
          { value: "documents", label: "Documents" },
        ],
        defaultValue: "any",
      },
      {
        id: "display",
        label: "Show as",
        kind: "choice",
        choices: [
          { value: "thumbnails", label: "Thumbnails" },
          { value: "list", label: "List" },
        ],
        defaultValue: "thumbnails",
      },
      {
        id: "maxFiles",
        label: "Most files",
        kind: "number",
        min: 1,
        placeholder: "Any",
      },
      {
        id: "maxSize",
        label: "Largest file, in MB",
        kind: "number",
        min: 1,
        placeholder: "Any",
      },
    ],
  },
  url: {
    name: "URL",
    group: "basic",
    filterAs: "link",
    settings: [
      {
        id: "display",
        label: "Show",
        kind: "choice",
        choices: [
          { value: "host", label: "Site" },
          { value: "full", label: "Full address" },
        ],
        defaultValue: "host",
      },
    ],
  },
  email: { name: "Email", group: "people", filterAs: "email" },
  phone: { name: "Phone", group: "people" },
  relation: {
    name: "Relation",
    group: "advanced",
    filterAs: "tags",
    placement: "tags",
    create: { options: [] },
    settings: [
      {
        id: "isMultiple",
        label: "Several records",
        kind: "switch",
        defaultValue: true,
      },
    ],
  },
  rating: {
    name: "Rating",
    group: "advanced",
    filterAs: "number",
    placement: "meta",
    settings: [
      {
        id: "steps",
        label: "Out of",
        kind: "choice",
        choices: [
          { value: "3", label: "3" },
          { value: "5", label: "5" },
          { value: "10", label: "10" },
        ],
        defaultValue: "5",
      },
    ],
  },
  duration: {
    name: "Duration",
    group: "advanced",
    filterAs: "number",
    placement: "meta",
  },
  color: { name: "Color", group: "media", placement: "meta" },
  location: { name: "Location", group: "advanced" },
  formula: {
    name: "Formula",
    group: "advanced",
    placement: "meta",
    isInternal: true,
    isReadOnly: true,
  },
  progress: {
    name: "Progress",
    group: "advanced",
    filterAs: "progress",
    placement: "meta",
    isInternal: true,
    isReadOnly: true,
    settings: [
      {
        id: "display",
        label: "Show as",
        kind: "choice",
        choices: [
          { value: "ring", label: "Ring" },
          { value: "bar", label: "Bar" },
        ],
        defaultValue: "ring",
      },
    ],
  },
  key: {
    name: "ID",
    group: "system",
    placement: "head",
    isInternal: true,
    isReadOnly: true,
  },
  "created-time": {
    name: "Created time",
    group: "system",
    filterAs: "date",
    placement: "meta",
    isInternal: true,
    isReadOnly: true,
    settings: dateSettings,
  },
  "created-by": {
    name: "Created by",
    group: "system",
    filterAs: "person",
    isInternal: true,
    isReadOnly: true,
  },
  "edited-time": {
    name: "Edited time",
    group: "system",
    filterAs: "date",
    placement: "meta",
    isInternal: true,
    isReadOnly: true,
    settings: dateSettings,
  },
  "edited-by": {
    name: "Edited by",
    group: "system",
    filterAs: "person",
    isInternal: true,
    isReadOnly: true,
  },
}

/** The built-in types and an app's own, which can also replace one. */
function createPropertyTypes(
  own: readonly PropertyTypeDefinition[] = []
): PropertyTypeMap {
  const types = new Map<string, PropertyTypeDefinition>(
    propertyTypes.map((type) => [type, { type, ...builtins[type] }])
  )
  for (const definition of own) {
    const replaced = types.get(definition.type)
    types.set(
      definition.type,
      replaced ? { ...replaced, ...definition } : definition
    )
  }
  return types
}

const builtinPropertyTypes = createPropertyTypes()

/** Keeps an app's type checked where it is written. */
function definePropertyType(
  definition: PropertyTypeDefinition
): PropertyTypeDefinition {
  return definition
}

function getPropertyType(
  type: string,
  types: PropertyTypeMap = builtinPropertyTypes
): PropertyTypeDefinition {
  return types.get(type) ?? { type, name: type }
}

function getPropertyTypeName(type: string, types?: PropertyTypeMap) {
  return getPropertyType(type, types).name
}

/** The types people can create, the built-in ones first. */
function getCreatableTypes(types: PropertyTypeMap = builtinPropertyTypes) {
  return [...types.values()].filter(({ isInternal }) => !isInternal)
}

/** A formula reads as the type of its result. */
function resolveProperty(property: PropertyDefinition): PropertyDefinition {
  if (property.type !== "formula") return property
  const result = property.settings?.result
  return {
    ...property,
    type: typeof result === "string" && result !== "formula" ? result : "text",
    isReadOnly: true,
  }
}

function readSetting(
  property: PropertyDefinition,
  id: string,
  types?: PropertyTypeMap
): PropertySettingValue | undefined {
  const own = property.settings?.[id]
  if (own !== undefined) return own
  return getPropertyType(property.type, types).settings?.find(
    (field) => field.id === id
  )?.defaultValue
}

function readTextSetting(property: PropertyDefinition, id: string) {
  const value = readSetting(property, id)
  return typeof value === "string" ? value : ""
}

function readNumberSetting(property: PropertyDefinition, id: string) {
  const value = readSetting(property, id)
  const number = typeof value === "string" ? Number(value) : value
  return typeof number === "number" && Number.isFinite(number)
    ? number
    : undefined
}

function readSwitchSetting(property: PropertyDefinition, id: string) {
  return readSetting(property, id) === true
}

/** A setting changed; one put back to its default is dropped. */
function writeSetting(
  property: PropertyDefinition,
  field: PropertySettingField,
  value: PropertySettingValue | undefined
): PropertyDefinition {
  const { [field.id]: _, ...rest } = property.settings ?? {}
  const settings =
    value === undefined || value === "" || value === field.defaultValue
      ? rest
      : { ...rest, [field.id]: value }
  return {
    ...property,
    settings: Object.keys(settings).length ? settings : undefined,
  }
}

/** The settings a property has now, leaving out those with no effect. */
function getPropertySettings(
  property: PropertyDefinition,
  types?: PropertyTypeMap
) {
  const read = (id: string) => readSetting(property, id, types)
  return (getPropertyType(property.type, types).settings ?? []).filter(
    (field) => field.isShown?.(read) ?? true
  )
}

/** What a setting reads as in its row. */
function formatSetting(
  field: PropertySettingField,
  value: PropertySettingValue | undefined
) {
  if (field.kind === "choice")
    return (
      field.choices.find((choice) => choice.value === value)?.label ??
      String(value ?? "")
    )
  if (value === undefined || value === "")
    return field.kind === "switch" ? "Off" : (field.placeholder ?? "")
  if (typeof value === "boolean") return value ? "On" : "Off"
  return String(value)
}

const groupNames: Record<PropertyTypeGroup, string> = {
  basic: "Basic",
  people: "People and contact",
  media: "Media",
  advanced: "Advanced",
  system: "System",
}

/** Types by group, in order, with an app's own last. */
function groupPropertyTypes(definitions: readonly PropertyTypeDefinition[]) {
  const order: readonly (PropertyTypeGroup | undefined)[] = [
    "basic",
    "people",
    "media",
    "advanced",
    "system",
    undefined,
  ]
  return order.flatMap((group) => {
    const items = definitions.filter((entry) => entry.group === group)
    return items.length
      ? [
          {
            id: group ?? "custom",
            name: group ? groupNames[group] : "Custom",
            items,
          },
        ]
      : []
  })
}

export {
  builtinPropertyTypes,
  createPropertyTypes,
  definePropertyType,
  formatSetting,
  getCreatableTypes,
  getPropertySettings,
  getPropertySwatches,
  getPropertyType,
  getPropertyTypeName,
  groupPropertyTypes,
  propertyTypes,
  readNumberSetting,
  readSetting,
  readSwitchSetting,
  readTextSetting,
  resolveProperty,
  writeSetting,
  type PropertyDefinition,
  type PropertyEditorRenderProps,
  type PropertyOption,
  type PropertyOptionGroup,
  type PropertyRenderProps,
  type PropertySettingField,
  type PropertySettingValue,
  type PropertyType,
  type PropertyTypeDefinition,
  type PropertyTypeGroup,
  type PropertyTypeMap,
  type PropertyVisibility,
}
