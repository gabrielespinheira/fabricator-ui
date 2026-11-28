import * as React from "react"
import {
  ArrowUpRightIcon,
  CalculatorIcon,
  CalendarIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleUserIcon,
  ClockIcon,
  FileTextIcon,
  HashIcon,
  IconProvider,
  LinkIcon,
  ListTodoIcon,
  MailIcon,
  MapPinIcon,
  PaletteIcon,
  PaperclipIcon,
  PhoneIcon,
  SquareCheckIcon,
  StarIcon,
  TagIcon,
  TimerIcon,
  TypeIcon,
  UserIcon,
} from "@fabricator-ui/icons-react-native"
import { Image, View } from "react-native"
import Svg, { Circle, Path, Rect } from "react-native-svg"
import { useCSSVariable } from "uniwind"

import { usePropertyTypes } from "@/registry/fabricator/shared/hooks/use-property-types"
import {
  getPropertyGlyph,
  type PropertyGlyph,
} from "@/registry/fabricator/shared/lib/property-model"
import type {
  PropertyDefinition,
  PropertyOption,
  PropertyOptionGroup,
} from "@/registry/fabricator/shared/lib/property-types"
import { usePaletteMark } from "@/registry/native/lib/palette-color"
import { Text } from "@/registry/native/ui/text"

// The drawings a property value uses: status circles and priority bars, the
// icon of each property type, people, and the app's own icons by name.

type PropertyIconMap = Readonly<Record<string, React.ReactNode>>

const emptyIcons: PropertyIconMap = {}
const PropertyIconContext = React.createContext(emptyIcons)

/** Maps the icon names a definition, an option or a column uses to drawings. */
function PropertyIconProvider({
  icons,
  children,
}: {
  icons: PropertyIconMap
  children: React.ReactNode
}) {
  return <PropertyIconContext value={icons}>{children}</PropertyIconContext>
}

const typeIcons: Record<string, typeof TypeIcon> = {
  title: TypeIcon,
  text: FileTextIcon,
  number: HashIcon,
  select: CircleDotIcon,
  "multi-select": TagIcon,
  status: CircleDashedIcon,
  person: UserIcon,
  date: CalendarIcon,
  checkbox: SquareCheckIcon,
  url: LinkIcon,
  email: MailIcon,
  phone: PhoneIcon,
  files: PaperclipIcon,
  relation: ArrowUpRightIcon,
  rating: StarIcon,
  duration: TimerIcon,
  color: PaletteIcon,
  location: MapPinIcon,
  formula: CalculatorIcon,
  progress: ListTodoIcon,
  key: HashIcon,
  "created-time": ClockIcon,
  "created-by": CircleUserIcon,
  "edited-time": ClockIcon,
  "edited-by": CircleUserIcon,
}

function useMutedColor() {
  const [muted] = useCSSVariable(["--muted-foreground"])
  return typeof muted === "string" ? muted : undefined
}

const repeatedIcons = new Set([
  "title",
  "key",
  "created-by",
  "edited-time",
  "edited-by",
])

/** The icons a person can give a property: one per drawing, then the app's. */
function usePropertyIconNames() {
  const icons = React.use(PropertyIconContext)
  return [
    ...Object.keys(typeIcons).filter((name) => !repeatedIcons.has(name)),
    ...Object.keys(icons),
  ]
}

/** A property's own icon, or its type's. */
function PropertyIcon({
  property,
  size,
}: {
  property: Pick<PropertyDefinition, "type" | "icon">
  /** Its own size in grey; without one it follows the row it is in. */
  size?: number
}) {
  const icons = React.use(PropertyIconContext)
  const types = usePropertyTypes()
  const color = useMutedColor()
  const isNamed = !!property.icon && Object.hasOwn(typeIcons, property.icon)
  const own = property.icon
    ? (icons[property.icon] ??
      (isNamed ? undefined : types.get(property.type)?.icon))
    : types.get(property.type)?.icon
  const style = size === undefined ? undefined : { size, color }
  if (own) return <IconProvider {...style}>{own}</IconProvider>
  const name = isNamed && property.icon ? property.icon : property.type
  const Icon = Object.hasOwn(typeIcons, name) ? typeIcons[name] : FileTextIcon
  return <Icon {...style} />
}

function StatusGlyph({
  glyph,
  color,
  markColor,
}: {
  glyph: Extract<PropertyGlyph, { kind: "status" }>
  color: string
  markColor: string
}) {
  const isSolid = glyph.state === "done" || glyph.state === "canceled"
  return (
    <Svg width={16} height={16} viewBox="0 0 14 14" fill="none">
      <Circle
        cx="7"
        cy="7"
        r="5.75"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={glyph.state === "backlog" ? "1.6 1.41" : undefined}
        fill={isSolid ? color : "none"}
      />
      {glyph.state === "active" && (
        <Circle
          cx="7"
          cy="7"
          r="1.75"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={`${glyph.ratio * 2 * Math.PI * 1.75} 11`}
          rotation={-90}
          origin="7, 7"
        />
      )}
      {glyph.state === "done" && (
        <Path
          d="m4.6 7.2 1.6 1.6 3.2-3.5"
          stroke={markColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {glyph.state === "canceled" && (
        <Path
          d="m5.2 5.2 3.6 3.6m0-3.6-3.6 3.6"
          stroke={markColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </Svg>
  )
}

const bars = [
  { x: 1.5, y: 8.5, height: 4 },
  { x: 5.5, y: 5.5, height: 7 },
  { x: 9.5, y: 2.5, height: 10 },
]

function PriorityGlyph({
  level,
  color,
  markColor,
}: {
  level: 0 | 1 | 2 | 3 | 4
  color: string
  markColor: string
}) {
  if (level === 4)
    return (
      <Svg width={16} height={16} viewBox="0 0 14 14" fill="none">
        <Rect x="1" y="1" width="12" height="12" rx="3" fill={color} />
        <Path
          d="M7 4v3.4M7 9.9v.1"
          stroke={markColor}
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </Svg>
    )
  return (
    <Svg width={16} height={16} viewBox="0 0 14 14">
      {bars.map(({ x, y, height }, index) =>
        level === 0 ? (
          <Rect
            key={x}
            x={x}
            y="6.25"
            width="3"
            height="1.5"
            rx="0.75"
            fill={color}
          />
        ) : (
          <Rect
            key={x}
            x={x}
            y={y}
            width="3"
            height={height}
            rx="1"
            fill={color}
            opacity={index < level ? 1 : 0.28}
          />
        )
      )}
    </Svg>
  )
}

/** An option's or a column's mark: its glyph, the app's icon, or a dot in its colour. */
function PropertyMark({
  mark,
}: {
  mark: { icon?: string; color?: string; group?: PropertyOptionGroup }
}) {
  const icons = React.use(PropertyIconContext)
  const [foreground, card] = useCSSVariable(["--foreground", "--card"])
  const toMark = usePaletteMark()
  const glyph = getPropertyGlyph(mark)
  const icon = mark.icon ? icons[mark.icon] : undefined
  if (!glyph && !icon && !mark.color) return null
  const color = mark.color ? toMark(mark.color) : String(foreground)
  return (
    <View
      data-slot="properties-mark"
      className="cn-properties-mark items-center justify-center"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {glyph?.kind === "status" ? (
        <StatusGlyph glyph={glyph} color={color} markColor={String(card)} />
      ) : glyph?.kind === "priority" ? (
        <PriorityGlyph
          level={glyph.level}
          color={color}
          markColor={String(card)}
        />
      ) : (
        (icon ?? (
          <View
            className="cn-properties-dot"
            style={{ backgroundColor: color }}
          />
        ))
      )}
    </View>
  )
}

const avatarColors = [
  "blue",
  "teal",
  "purple",
  "orange",
  "green",
  "pink",
  "cyan",
  "indigo",
] as const

/** The same person keeps the same colour on every card and every visit. */
function getAvatarColor(name: string) {
  let hash = 0
  for (const letter of name)
    hash = (hash * 31 + (letter.codePointAt(0) ?? 0)) | 0
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/)
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words
  return letters.map((word) => word.charAt(0).toUpperCase()).join("")
}

function PropertyAvatar({ person }: { person: PropertyOption }) {
  const toMark = usePaletteMark()
  const color = toMark(person.color ?? getAvatarColor(person.label))
  return (
    <View
      data-slot="properties-avatar"
      accessibilityLabel={person.label}
      className="cn-properties-avatar items-center justify-center overflow-hidden"
    >
      <View
        className="absolute inset-0"
        style={{ backgroundColor: color, opacity: 0.28 }}
      />
      {person.image ? (
        <Image alt="" source={{ uri: person.image }} className="size-full" />
      ) : (
        <Text className="cn-properties-avatar-text">
          {getInitials(person.label)}
        </Text>
      )}
    </View>
  )
}

export {
  PropertyAvatar,
  PropertyIcon,
  PropertyIconProvider,
  PropertyMark,
  useMutedColor,
  usePropertyIconNames,
  type PropertyIconMap,
}
