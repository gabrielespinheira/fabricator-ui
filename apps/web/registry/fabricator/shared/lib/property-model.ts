import {
  compareCellValues,
  formatDataTableValue,
  getDefaultOperator,
  getFilterKind,
  getSearchText,
  matchesFilter,
  type DataTableColumnType,
  type DataTableFilter,
} from "./data-table-model"
import {
  getPropertyType,
  readNumberSetting,
  readSwitchSetting,
  readTextSetting,
  resolveProperty,
  type PropertyDefinition,
  type PropertyOption,
  type PropertyOptionGroup,
  type PropertyType,
  type PropertyTypeMap,
} from "./property-types"

type PropertyFilter = DataTableFilter & { propertyId: string }
type PropertyFilterGroup = {
  match: "all" | "any"
  filters: readonly (PropertyFilter | PropertyFilterGroup)[]
}
type PropertySort = { propertyId: string; direction: "asc" | "desc" }

function getPropertyTableType(
  type: string,
  types?: PropertyTypeMap
): DataTableColumnType {
  return getPropertyType(type, types).filterAs ?? "text"
}

function getPropertyFilterKind(
  property: PropertyDefinition,
  types?: PropertyTypeMap
) {
  return getFilterKind(
    getPropertyTableType(resolveProperty(property).type, types)
  )
}

const LOCALE = "en-US"

/** How a number is written, in full. A short form is only for reading. */
function getNumberOptions(property: PropertyDefinition) {
  const format = readTextSetting(property, "numberFormat")
  const decimals = readNumberSetting(property, "decimals")
  const options: Intl.NumberFormatOptions = {
    useGrouping: format !== "plain",
    minimumFractionDigits: decimals ?? 0,
    ...(decimals === undefined
      ? undefined
      : { maximumFractionDigits: decimals }),
    ...(format === "currency"
      ? { style: "currency", currency: readTextSetting(property, "currency") }
      : undefined),
  }
  return options
}

/** What a number field needs to edit a property's value. */
function getNumberControl(property: PropertyDefinition) {
  return {
    min: readNumberSetting(property, "minimum"),
    max: readNumberSetting(property, "maximum"),
    // Zero can't step, so it means the same as none.
    step: readNumberSetting(property, "step") || undefined,
    format: getNumberOptions(property),
    suffix:
      readTextSetting(property, "numberFormat") === "percent"
        ? "%"
        : readTextSetting(property, "numberFormat") === "currency"
          ? ""
          : readTextSetting(property, "unit"),
  }
}

const numberFormats = new Map<string, Intl.NumberFormat>()

function getNumberFormat(property: PropertyDefinition) {
  const options: Intl.NumberFormatOptions = {
    ...getNumberOptions(property),
    notation:
      readTextSetting(property, "numberFormat") === "compact"
        ? "compact"
        : "standard",
  }
  const key = JSON.stringify(options)
  const cached = numberFormats.get(key)
  if (cached) return cached
  const created = new Intl.NumberFormat(LOCALE, options)
  numberFormats.set(key, created)
  return created
}

/** A number in its property's format, without its unit. */
function formatPropertyNumber(property: PropertyDefinition, value: number) {
  const text = getNumberFormat(property).format(value)
  return readTextSetting(property, "numberFormat") === "percent"
    ? `${text}%`
    : text
}

/** How full a number's bar is. It fills at its largest value, or at 100. */
function getNumberRatio(property: PropertyDefinition, value: number) {
  const from = readNumberSetting(property, "minimum") ?? 0
  const to = readNumberSetting(property, "maximum") ?? 100
  return to > from ? Math.min(1, Math.max(0, (value - from) / (to - from))) : 0
}

const durationParts =
  /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?$/i

/** Minutes, typed as "90", "1h 30m", "1.5h" or "1:30". */
function parseDuration(text: string): number | undefined {
  const input = text.trim()
  if (/^\d+$/.test(input)) return Number(input)
  const clock = /^(\d+):([0-5]\d)$/.exec(input)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2])
  const parts = input ? durationParts.exec(input) : null
  if (!parts || (parts[1] === undefined && parts[2] === undefined))
    return undefined
  return Math.round(Number(parts[1] ?? 0) * 60) + Number(parts[2] ?? 0)
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatPropertyValue(
  source: PropertyDefinition,
  value: unknown,
  types?: PropertyTypeMap
): string {
  const property = resolveProperty(source)
  const custom = getPropertyType(property.type, types).format
  if (custom) return custom(value, property)
  const type = getPropertyTableType(property.type, types)
  if (property.type === "progress") {
    const progress = getPropertyProgress(value)
    return progress ? `${progress.done}/${progress.total}` : ""
  }
  if (value === null || value === undefined || value === "") return ""
  if (property.type === "files")
    return readPropertyFiles(value)
      .map(({ name }) => name)
      .join(", ")
  if (property.type === "number" && typeof value === "number") {
    const unit = readTextSetting(property, "unit")
    const text = formatPropertyNumber(property, value)
    return unit ? `${text} ${unit}` : text
  }
  if (property.type === "duration" && typeof value === "number")
    return formatDuration(value)
  if (type === "date") return formatPropertyDateValue(property, value, null)
  if (type === "boolean" && typeof value === "boolean")
    return value ? "Yes" : "No"
  if (property.options || type === "tags")
    return getSearchText(value, property.options)
  return formatDataTableValue(type, value)
}

// The words a name is likely to use, most specific first.
const typeHints: readonly (readonly [RegExp, PropertyType])[] = [
  [/\b(e-?mail)\b/i, "email"],
  [/\b(phone|mobile|tel)\b/i, "phone"],
  [/\b(url|link|website|site)\b/i, "url"],
  [/\b(date|deadline|due|start|end|day)\b/i, "date"],
  [
    /\b(assignee|owner|person|people|author|reviewer|lead|member)s?\b/i,
    "person",
  ],
  [/\b(status|stage|state|phase)\b/i, "status"],
  [/\b(labels|tags|topics|platforms|skills|categories)\b/i, "multi-select"],
  [/\b(priority|type|team|severity|category|size|label|tag)\b/i, "select"],
  [
    /\b(estimate|points|price|cost|amount|budget|count|number|hours|score)\b/i,
    "number",
  ],
  [
    /\b(file|attachment|image|photo|picture|cover|media|document)s?\b/i,
    "files",
  ],
  [/\b(duration|effort|time spent|length)\b/i, "duration"],
  [/\b(colou?r)\b/i, "color"],
  [/\b(location|address|place|city|venue)\b/i, "location"],
  [/\b(rating|stars)\b/i, "rating"],
  [/^(is|has|can|should)\b|\b(done|approved|blocked)\b/i, "checkbox"],
]

function suggestPropertyType(name: string): PropertyType {
  return typeHints.find(([words]) => words.test(name))?.[1] ?? "text"
}

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/

/** A date-only value is that day wherever it is read; a time is an instant. */
function parsePropertyDay(value: unknown): Date | null {
  const match = typeof value === "string" ? dayPattern.exec(value.trim()) : null
  if (match)
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const time =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : typeof value === "string"
          ? Date.parse(value)
          : Number.NaN
  return Number.isFinite(time) ? new Date(time) : null
}

function toPropertyDay(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function countDays(from: Date, to: Date) {
  const day = (date: Date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((day(to) - day(from)) / 86_400_000)
}

type PropertyDateValue = {
  start: string
  end: string | null
  hasTime: boolean
}

const timePattern = /T\d{2}:\d{2}/

/** A day, a time or a range, read the same way whatever it was saved as. */
function toPropertyDate(value: unknown): PropertyDateValue | null {
  const isRange = !!value && typeof value === "object" && "start" in value
  const first: unknown = isRange ? value.start : value
  const last: unknown = isRange && "end" in value ? value.end : null
  const day = parsePropertyDay(first)
  if (!day) return null
  const start = typeof first === "string" ? first.trim() : day.toISOString()
  const end =
    typeof last === "string" && parsePropertyDay(last) ? last.trim() : null
  return {
    start,
    end,
    hasTime: timePattern.test(start) || (!!end && timePattern.test(end)),
  }
}

type DateFormatName = "relative" | "short" | "long" | "numeric" | "iso"

const dateFormatNames: readonly DateFormatName[] = [
  "relative",
  "short",
  "long",
  "numeric",
  "iso",
]

const dateFormats = new Map<string, Intl.DateTimeFormat>()

function getDateFormat(
  locale: string,
  name: Exclude<DateFormatName, "iso">,
  hasYear: boolean
) {
  const key = `${locale}/${name}/${hasYear}`
  const cached = dateFormats.get(key)
  if (cached) return cached
  const created = new Intl.DateTimeFormat(
    locale,
    name === "long"
      ? { month: "long", day: "numeric", year: "numeric" }
      : name === "numeric"
        ? { month: "numeric", day: "numeric", year: "numeric" }
        : {
            month: "short",
            day: "numeric",
            year: hasYear ? "numeric" : undefined,
          }
  )
  dateFormats.set(key, created)
  return created
}

/** `today` is null on the server, so its text and the browser's first agree. */
function formatPropertyDate(
  value: unknown,
  today: Date | null,
  locale = LOCALE,
  format: DateFormatName = "relative"
) {
  const date = parsePropertyDay(value)
  if (!date) return ""
  if (format === "iso") return toPropertyDay(date)
  if (today && format === "relative") {
    const days = countDays(today, date)
    if (days === 0) return "Today"
    if (days === 1) return "Tomorrow"
    if (days === -1) return "Yesterday"
  }
  return getDateFormat(
    locale,
    format,
    !!today && date.getFullYear() !== today.getFullYear()
  ).format(date)
}

function formatPropertyTime(property: PropertyDefinition, value: string) {
  const date = parsePropertyDay(value)
  if (!date) return ""
  const cycle = readTextSetting(property, "hourCycle")
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: cycle === "24" ? "h23" : cycle === "12" ? "h12" : undefined,
  }).format(date)
}

/** A date property's value in its own format. */
function formatPropertyDateValue(
  property: PropertyDefinition,
  value: unknown,
  today: Date | null
) {
  const date = toPropertyDate(value)
  if (!date) return ""
  const chosen = readTextSetting(property, "dateFormat")
  const format = dateFormatNames.find((name) => name === chosen) ?? "relative"
  const write = (part: string) => {
    const day = formatPropertyDate(part, today, LOCALE, format)
    return timePattern.test(part)
      ? `${day}, ${formatPropertyTime(property, part)}`
      : day
  }
  return date.end
    ? `${write(date.start)} – ${write(date.end)}`
    : write(date.start)
}

function isPropertyOverdue(value: unknown, today: Date | null) {
  const date = toPropertyDate(value)
  const day = date && parsePropertyDay(date.end ?? date.start)
  return !!day && !!today && countDays(today, day) < 0
}

type PropertyFile = {
  id: string
  name: string
  url: string
  /** A MIME type; the name's extension says it otherwise. */
  type?: string
  size?: number
  /** A smaller picture of it, for cards and rows. */
  thumbnail?: string
}

function getFileName(address: string) {
  const path = address.split(/[?#]/)[0]
  const name = path.slice(path.lastIndexOf("/") + 1)
  return decodeURIComponent(name) || address
}

/** The files a value holds: addresses, or records with a name and an address. */
function readPropertyFiles(value: unknown): PropertyFile[] {
  const entries: unknown[] = Array.isArray(value) ? value : [value]
  return entries.flatMap((entry) => {
    if (typeof entry === "string")
      return entry ? [{ id: entry, name: getFileName(entry), url: entry }] : []
    if (!entry || typeof entry !== "object") return []
    const read = (key: string) => {
      const part: unknown = Reflect.get(entry, key)
      return typeof part === "string" && part ? part : undefined
    }
    const url = read("url")
    if (!url) return []
    const size: unknown = Reflect.get(entry, "size")
    return [
      {
        id: read("id") ?? url,
        name: read("name") ?? getFileName(url),
        url,
        ...(read("type") ? { type: read("type") } : undefined),
        ...(typeof size === "number" ? { size } : undefined),
        ...(read("thumbnail") ? { thumbnail: read("thumbnail") } : undefined),
      },
    ]
  })
}

const imageName = /\.(avif|bmp|gif|heic|jpe?g|png|svg|webp)$/i

function isImageFile(file: PropertyFile) {
  if (file.type) return file.type.startsWith("image/")
  return (
    file.url.startsWith("data:image/") ||
    imageName.test(file.name) ||
    imageName.test(file.url.split(/[?#]/)[0])
  )
}

/** Where a file opens. Scripts and inline documents don't. */
function getFileLink({ url }: PropertyFile) {
  return /^(https?:|blob:|data:image\/)/i.test(url) || !/^[\w+.-]+:/.test(url)
    ? url
    : undefined
}

/** The picture a card or a record shows for a property: its first one. */
function getPropertyCover(property: PropertyDefinition, value: unknown) {
  if (property.type !== "files") return null
  return readPropertyFiles(value).find(isImageFile) ?? null
}

/** Where covers come from: the property chosen, or the first that holds files. */
function getCoverProperty(
  properties: readonly PropertyDefinition[],
  id: string | null | undefined
) {
  if (id === null) return undefined
  return properties.find(
    (property) =>
      property.type === "files" && (id === undefined || property.id === id)
  )
}

const acceptTypes: Record<string, string | undefined> = {
  images: "image/*",
  media: "image/*,video/*",
  documents: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv",
}

/** What a files property takes, as a file picker's limits. */
function getFileLimits(property: PropertyDefinition) {
  const size = readNumberSetting(property, "maxSize")
  return {
    accept: acceptTypes[readTextSetting(property, "accept")],
    maxFiles: readNumberSetting(property, "maxFiles"),
    maxSize: size === undefined ? undefined : size * 1024 * 1024,
  }
}

/** Done of total, for sub-tasks and checklists. */
function getPropertyProgress(value: unknown) {
  if (!value || typeof value !== "object") return null
  if (!("done" in value) || !("total" in value)) return null
  const { done, total } = value
  if (typeof done !== "number" || typeof total !== "number" || total <= 0)
    return null
  return { done, total, ratio: Math.min(1, Math.max(0, done / total)) }
}

/** Whether there is anything to show for a property. */
function hasPropertyValue(
  source: PropertyDefinition,
  value: unknown,
  types?: PropertyTypeMap
) {
  const property = resolveProperty(source)
  const isEmpty = getPropertyType(property.type, types).isEmpty
  if (isEmpty) return !isEmpty(value, property)
  if (property.type === "progress") return getPropertyProgress(value) !== null
  if (property.type === "checkbox") return value === true
  if (property.type === "files") return readPropertyFiles(value).length > 0
  if (Array.isArray(value)) return value.length > 0
  return value !== null && value !== undefined && value !== ""
}

/** Whether a record shows the row. */
function isPropertyShown(
  property: PropertyDefinition,
  value: unknown,
  types?: PropertyTypeMap
) {
  if (property.visibility === "hide") return false
  return (
    property.visibility !== "hide-empty" ||
    hasPropertyValue(property, value, types)
  )
}

/** What a new record starts with, by property. */
function getPropertyDefaults(properties: readonly PropertyDefinition[]) {
  return Object.fromEntries(
    properties.flatMap(({ id, defaultValue }) =>
      defaultValue === undefined ? [] : [[id, defaultValue]]
    )
  )
}

function isMultiProperty(property: PropertyDefinition) {
  return (
    property.type === "multi-select" ||
    property.type === "files" ||
    readSwitchSetting(property, "isMultiple")
  )
}

/** Whether a value is picked from the property's options. */
function isChoiceProperty(
  property: PropertyDefinition,
  types?: PropertyTypeMap
) {
  return (
    !!property.options &&
    (["person", "relation"].includes(property.type) ||
      !!getPropertyType(property.type, types).hasOptions)
  )
}

const choiceGroupNames: Record<PropertyOptionGroup, string> = {
  todo: "To do",
  inProgress: "In progress",
  complete: "Complete",
}

/** Options by where a status stands, or all together when none say. */
function getChoiceGroups(options: readonly PropertyOption[]) {
  if (!options.some(({ group }) => group))
    return [{ id: "all", name: null, options: [...options] }]
  const ids: readonly (PropertyOptionGroup | undefined)[] = [
    "todo",
    "inProgress",
    "complete",
    undefined,
  ]
  return ids.flatMap((id) => {
    const own = options.filter(({ group }) => group === id)
    return own.length
      ? [
          {
            id: id ?? "other",
            name: id ? choiceGroupNames[id] : "Other",
            options: own,
          },
        ]
      : []
  })
}

function readPropertyKeys(value: unknown): string[] {
  const entries: unknown[] = Array.isArray(value) ? value : [value]
  return entries.filter(
    (entry): entry is string => typeof entry === "string" && entry !== ""
  )
}

/** The options a value names. One that is gone keeps its raw text. */
function getPropertyValueOptions(
  property: PropertyDefinition,
  value: unknown
): PropertyOption[] {
  return readPropertyKeys(value).map(
    (key) =>
      property.options?.find((option) => option.value === key) ?? {
        value: key,
        label: key,
      }
  )
}

function togglePropertyOption(
  property: PropertyDefinition,
  value: unknown,
  key: string
): string | string[] | null {
  const keys = readPropertyKeys(value)
  const isPicked = keys.includes(key)
  if (!isMultiProperty(property))
    return isPicked && !property.required ? null : key
  if (!isPicked) return [...keys, key]
  return property.required && keys.length === 1
    ? keys
    : keys.filter((entry) => entry !== key)
}

/** The option filter a property has in a view, as picked values. */
function getOptionFilter(
  filters: PropertyFilterGroup | undefined,
  propertyId: string
): readonly string[] {
  const filter = filters?.filters.find(
    (entry) => "propertyId" in entry && entry.propertyId === propertyId
  )
  return filter && "value" in filter && Array.isArray(filter.value)
    ? filter.value
    : []
}

function toggleOptionFilter(
  filters: PropertyFilterGroup | undefined,
  property: PropertyDefinition,
  key: string
): PropertyFilterGroup | undefined {
  const picked = getOptionFilter(filters, property.id)
  const value = picked.includes(key)
    ? picked.filter((entry) => entry !== key)
    : [...picked, key]
  const others =
    filters?.filters.filter(
      (entry) => !("propertyId" in entry) || entry.propertyId !== property.id
    ) ?? []
  const next = value.length
    ? [
        ...others,
        {
          propertyId: property.id,
          operator: getDefaultOperator(getPropertyFilterKind(property)),
          value,
        },
      ]
    : others
  return next.length
    ? { match: filters?.match ?? "all", filters: next }
    : undefined
}

type PropertyGlyph =
  | {
      kind: "status"
      state: "backlog" | "todo" | "active" | "done" | "canceled"
      ratio: number
    }
  | { kind: "priority"; level: 0 | 1 | 2 | 3 | 4 }

const glyphs: Record<string, PropertyGlyph> = {
  "status-backlog": { kind: "status", state: "backlog", ratio: 0 },
  "status-todo": { kind: "status", state: "todo", ratio: 0 },
  "status-started": { kind: "status", state: "active", ratio: 0.25 },
  "status-progress": { kind: "status", state: "active", ratio: 0.5 },
  "status-review": { kind: "status", state: "active", ratio: 0.75 },
  "status-done": { kind: "status", state: "done", ratio: 1 },
  "status-canceled": { kind: "status", state: "canceled", ratio: 0 },
  "priority-none": { kind: "priority", level: 0 },
  "priority-low": { kind: "priority", level: 1 },
  "priority-medium": { kind: "priority", level: 2 },
  "priority-high": { kind: "priority", level: 3 },
  "priority-urgent": { kind: "priority", level: 4 },
}

const groupGlyphs: Record<PropertyOptionGroup, string> = {
  todo: "status-todo",
  inProgress: "status-progress",
  complete: "status-done",
}

/** The built-in drawing an option or a column names, if it names one. */
function getPropertyGlyph({
  icon,
  group,
}: {
  icon?: string
  group?: PropertyOptionGroup
}): PropertyGlyph | null {
  const name = icon ?? (group ? groupGlyphs[group] : undefined)
  return name && Object.hasOwn(glyphs, name) ? glyphs[name] : null
}

function getPropertyLink(type: string, value: unknown) {
  if (typeof value !== "string" || !value) return undefined
  if (type === "location")
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`
  const link =
    type === "email"
      ? `mailto:${value}`
      : type === "phone"
        ? `tel:${value.replace(/\s/g, "")}`
        : value
  return /^(https?:\/\/|mailto:|tel:)[^\s]+$/i.test(link) ? link : undefined
}

/** An address as people know it: its site, unless the property shows it all. */
function formatPropertyLink(property: PropertyDefinition, value: string) {
  if (
    property.type !== "url" ||
    readTextSetting(property, "display") === "full"
  )
    return value
  const host = /^https?:\/\/(?:www\.)?([^/?#]+)/i.exec(value)
  return host ? host[1] : value
}

const typedNumber = /^[-+]?[^\d.\-+\sa-z]?\s*(\d[\d,]*(?:\.\d+)?|\.\d+)\s*%?$/i

function parseNumber(text: string) {
  const match = typedNumber.exec(text)
  if (!match) return undefined
  const number = Number(match[1].replaceAll(",", ""))
  if (!Number.isFinite(number)) return undefined
  return text.startsWith("-") ? -number : number
}

const bareSite = /^[\w-]+(\.[\w-]+)+([/?#]\S*)?$/

function parsePropertyInput(
  property: PropertyDefinition,
  input: string,
  types?: PropertyTypeMap
): unknown {
  const value = input.trim()
  if (!value) return null
  const custom = getPropertyType(property.type, types).parse
  if (custom) return custom(value, property)
  if (property.type === "duration") return parseDuration(value)
  if (property.type === "url" && bareSite.test(value)) return `https://${value}`
  if (property.type === "color" && /^[\da-f]{3}([\da-f]{3})?$/i.test(value))
    return `#${value}`
  const type = getPropertyTableType(property.type, types)
  if (type === "number") return parseNumber(value)
  if (type === "boolean")
    return value === "true" ? true : value === "false" ? false : undefined
  if (type === "date")
    return Number.isFinite(Date.parse(value)) ? value : undefined
  if (type === "tags") {
    const values = [
      ...new Set(
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      ),
    ]
    return property.options &&
      values.some(
        (entry) => !property.options?.some(({ value }) => value === entry)
      )
      ? undefined
      : values
  }
  if (
    property.options &&
    !property.options.some((option) => option.value === value)
  )
    return undefined
  return value
}

const textRules: Record<string, { pattern: RegExp; message: string }> = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Enter an email address.",
  },
  url: { pattern: /^https?:\/\/\S+$/i, message: "Enter a web address." },
  phone: { pattern: /^\+?[\d\s().-]{4,}$/, message: "Enter a phone number." },
  color: {
    pattern: /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i,
    message: "Enter a hex color.",
  },
}

/** Why a value can't be kept, or null when it can. */
function validatePropertyValue(
  property: PropertyDefinition,
  value: unknown,
  types?: PropertyTypeMap
): string | null {
  const { name, type } = property
  if (!hasPropertyValue(property, value, types))
    return property.required ? `${name} is required.` : null
  if (typeof value === "number") {
    const minimum = readNumberSetting(property, "minimum")
    const maximum = readNumberSetting(property, "maximum")
    if (minimum !== undefined && value < minimum)
      return `${name} is ${minimum} at least.`
    if (maximum !== undefined && value > maximum)
      return `${name} is ${maximum} at most.`
  }
  if (typeof value === "string") {
    const longest = readNumberSetting(property, "maxLength")
    if (longest !== undefined && value.length > longest)
      return `${name} takes ${longest} characters at most.`
    const rule = Object.hasOwn(textRules, type) ? textRules[type] : undefined
    if (rule && !rule.pattern.test(value)) return rule.message
  }
  if (type === "files") {
    const { maxFiles } = getFileLimits(property)
    if (maxFiles !== undefined && readPropertyFiles(value).length > maxFiles)
      return `${name} takes ${maxFiles} ${maxFiles === 1 ? "file" : "files"}.`
  }
  return getPropertyType(type, types).validate?.(value, property) ?? null
}

const convertiblePropertyTypes = [
  "text",
  "number",
  "date",
  "checkbox",
  "select",
  "multi-select",
  "status",
] as const

type PropertyConversionType = (typeof convertiblePropertyTypes)[number]
type PropertyConversionValue = { recordId: string; value: unknown }
type PropertyConversion = {
  property: PropertyDefinition
  values: PropertyConversionValue[]
  invalidRecordIds: string[]
}
type PropertyConversionControls = {
  getValues: (propertyId: string) => readonly PropertyConversionValue[]
  onConvert: (conversion: PropertyConversion) => void | Promise<void>
}

function previewPropertyConversion(
  source: PropertyDefinition,
  type: PropertyConversionType,
  records: readonly PropertyConversionValue[]
): PropertyConversion {
  const kind = getPropertyTableType(type)
  const isChoice = kind === "status" || kind === "tags"
  const options = new Map(
    isChoice
      ? source.options?.map((option) => [option.value, option])
      : undefined
  )
  const property = { ...source, type, options: undefined, settings: undefined }
  const values: PropertyConversionValue[] = []
  const invalidRecordIds: string[] = []

  for (const { recordId, value } of records) {
    const converted = convertPropertyValue(source, property, value)
    if (converted === undefined || (converted === null && property.required)) {
      invalidRecordIds.push(recordId)
      continue
    }
    if (isChoice && !source.options) {
      for (const option of Array.isArray(converted) ? converted : [converted]) {
        if (typeof option === "string")
          options.set(option, { value: option, label: option })
      }
    }
    if (
      isChoice &&
      source.options &&
      converted !== null &&
      (Array.isArray(converted) ? converted : [converted]).some(
        (option) => !options.has(option)
      )
    ) {
      invalidRecordIds.push(recordId)
      continue
    }
    values.push({ recordId, value: converted })
  }
  return {
    property: {
      ...property,
      options: isChoice ? [...options.values()] : undefined,
    },
    values,
    invalidRecordIds,
  }
}

function convertPropertyValue(
  source: PropertyDefinition,
  target: PropertyDefinition,
  value: unknown
): unknown {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && !value.length)
  )
    return null
  if (source.type === target.type) return value
  const kind = getPropertyTableType(target.type)
  if (kind === "text") return formatPropertyValue(source, value) || undefined
  if (kind === "tags" || kind === "status") {
    const entries = Array.isArray(value) ? value : [value]
    const choices: string[] = []
    for (const entry of entries) {
      if (typeof entry !== "string" || !entry.trim()) return undefined
      choices.push(entry.trim())
    }
    return kind === "tags"
      ? [...new Set(choices)]
      : choices.length === 1
        ? choices[0]
        : undefined
  }
  if (kind === "boolean" && typeof value === "boolean") return value
  if (kind === "number" && typeof value === "number")
    return Number.isFinite(value) ? value : undefined
  if (typeof value !== "string") return undefined
  const normalized = value.trim().toLowerCase()
  if (kind === "boolean") {
    if (normalized === "yes") return true
    if (normalized === "no") return false
    return parsePropertyInput(target, normalized)
  }
  if (kind === "date" && !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value.trim()))
    return undefined
  return parsePropertyInput(target, value)
}

/** A value as filters and sorting compare it. */
function toComparable(property: PropertyDefinition, value: unknown): unknown {
  if (property.type === "files")
    return readPropertyFiles(value).map(({ name }) => name)
  if (getPropertyTableType(property.type) === "date")
    return toPropertyDate(value)?.start ?? null
  return value
}

function matchesPropertyFilters(
  group: PropertyFilterGroup,
  properties: ReadonlyMap<string, PropertyDefinition>,
  read: (propertyId: string) => unknown,
  types?: PropertyTypeMap
): boolean {
  const matches: boolean[] = []
  for (const filter of group.filters) {
    if ("filters" in filter) {
      if (filter.filters.length)
        matches.push(matchesPropertyFilters(filter, properties, read, types))
      continue
    }
    const property = properties.get(filter.propertyId)
    if (property)
      matches.push(
        matchesFilter(
          getPropertyFilterKind(property, types),
          toComparable(resolveProperty(property), read(filter.propertyId)),
          filter
        )
      )
  }
  return (
    matches.length === 0 ||
    (group.match === "all" ? matches.every(Boolean) : matches.some(Boolean))
  )
}

function comparePropertyValues(
  source: PropertyDefinition,
  left: unknown,
  right: unknown,
  types?: PropertyTypeMap
) {
  const property = resolveProperty(source)
  if (property.type === "progress")
    return compareCellValues(
      getPropertyProgress(left)?.ratio,
      getPropertyProgress(right)?.ratio,
      { type: "progress" }
    )
  return compareCellValues(
    toComparable(property, left),
    toComparable(property, right),
    {
      type: getPropertyTableType(property.type, types),
      options: property.options,
    }
  )
}

export {
  comparePropertyValues,
  convertiblePropertyTypes,
  formatDuration,
  formatPropertyDate,
  formatPropertyDateValue,
  formatPropertyLink,
  formatPropertyNumber,
  formatPropertyValue,
  getChoiceGroups,
  getCoverProperty,
  getFileLimits,
  getFileLink,
  getNumberControl,
  getNumberRatio,
  getOptionFilter,
  getPropertyCover,
  getPropertyDefaults,
  getPropertyFilterKind,
  getPropertyGlyph,
  getPropertyLink,
  getPropertyProgress,
  getPropertyTableType,
  getPropertyValueOptions,
  hasPropertyValue,
  isChoiceProperty,
  isImageFile,
  isMultiProperty,
  isPropertyOverdue,
  isPropertyShown,
  matchesPropertyFilters,
  parseDuration,
  parsePropertyDay,
  parsePropertyInput,
  previewPropertyConversion,
  readPropertyFiles,
  readPropertyKeys,
  suggestPropertyType,
  toggleOptionFilter,
  togglePropertyOption,
  toPropertyDate,
  toPropertyDay,
  validatePropertyValue,
  type PropertyConversion,
  type PropertyConversionControls,
  type PropertyDateValue,
  type PropertyFile,
  type PropertyFilter,
  type PropertyFilterGroup,
  type PropertyGlyph,
  type PropertySort,
}
export {
  getPropertyTypeName,
  propertyTypes,
  type PropertyDefinition,
  type PropertyOption,
  type PropertyOptionGroup,
  type PropertyType,
} from "./property-types"
