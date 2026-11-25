"use client"

// The drawings a property value uses: status circles and priority bars, the
// icon of each property type, and the app's own icons by name. A definition is
// plain data people create at run time, so it names its icon and the app maps
// the name to a drawing.
import * as React from "react"
import { cn } from "cn"

import { usePropertyTypes } from "@/registry/bases/__base__/hooks/use-property-types"
import { getPaletteVariables } from "@/registry/bases/__base__/lib/palette-model"
import {
  getPropertyGlyph,
  type PropertyDefinition,
  type PropertyGlyph,
  type PropertyOption,
  type PropertyOptionGroup,
} from "@/registry/bases/__base__/lib/property-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

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

const typeIcons: PropertyIconMap = {
  title: (
    <IconPlaceholder
      lucide="TypeIcon"
      tabler="IconLetterT"
      hugeicons="TextIcon"
      phosphor="TextTIcon"
      remixicon="RiText"
    />
  ),
  text: (
    <IconPlaceholder
      lucide="FileTextIcon"
      tabler="IconFileDescription"
      hugeicons="File01Icon"
      phosphor="FileTextIcon"
      remixicon="RiFileTextLine"
    />
  ),
  number: (
    <IconPlaceholder
      lucide="HashIcon"
      tabler="IconHash"
      hugeicons="GridIcon"
      phosphor="HashIcon"
      remixicon="RiHashtag"
    />
  ),
  select: (
    <IconPlaceholder
      lucide="CircleDotIcon"
      tabler="IconCircleDot"
      hugeicons="RecordIcon"
      phosphor="RadioButtonIcon"
      remixicon="RiRadioButtonLine"
    />
  ),
  "multi-select": (
    <IconPlaceholder
      lucide="TagIcon"
      tabler="IconTag"
      hugeicons="Tag01Icon"
      phosphor="TagIcon"
      remixicon="RiPriceTag3Line"
    />
  ),
  status: (
    <IconPlaceholder
      lucide="CircleDashedIcon"
      tabler="IconCircleDashed"
      hugeicons="DashedLineCircleIcon"
      phosphor="CircleDashedIcon"
      remixicon="RiLoaderLine"
    />
  ),
  person: (
    <IconPlaceholder
      lucide="UserIcon"
      tabler="IconUser"
      hugeicons="UserIcon"
      phosphor="UserIcon"
      remixicon="RiUserLine"
    />
  ),
  date: (
    <IconPlaceholder
      lucide="CalendarIcon"
      tabler="IconCalendar"
      hugeicons="CalendarIcon"
      phosphor="CalendarBlankIcon"
      remixicon="RiCalendarLine"
    />
  ),
  checkbox: (
    <IconPlaceholder
      lucide="SquareCheckIcon"
      tabler="IconSquareCheck"
      hugeicons="CheckmarkSquare02Icon"
      phosphor="CheckSquareIcon"
      remixicon="RiCheckboxLine"
    />
  ),
  url: (
    <IconPlaceholder
      lucide="LinkIcon"
      tabler="IconLink"
      hugeicons="LinkIcon"
      phosphor="LinkIcon"
      remixicon="RiLinksLine"
    />
  ),
  email: (
    <IconPlaceholder
      lucide="MailIcon"
      tabler="IconMail"
      hugeicons="Mail01Icon"
      phosphor="EnvelopeIcon"
      remixicon="RiMailLine"
    />
  ),
  phone: (
    <IconPlaceholder
      lucide="PhoneIcon"
      tabler="IconPhone"
      hugeicons="Call02Icon"
      phosphor="PhoneIcon"
      remixicon="RiPhoneLine"
    />
  ),
  files: (
    <IconPlaceholder
      lucide="PaperclipIcon"
      tabler="IconPaperclip"
      hugeicons="Attachment01Icon"
      phosphor="PaperclipIcon"
      remixicon="RiAttachment2"
    />
  ),
  relation: (
    <IconPlaceholder
      lucide="ArrowUpRightIcon"
      tabler="IconArrowUpRight"
      hugeicons="ArrowUpRightIcon"
      phosphor="ArrowUpRightIcon"
      remixicon="RiArrowRightUpLine"
    />
  ),
  rating: (
    <IconPlaceholder
      lucide="StarIcon"
      tabler="IconStar"
      hugeicons="StarIcon"
      phosphor="StarIcon"
      remixicon="RiStarLine"
    />
  ),
  duration: (
    <IconPlaceholder
      lucide="TimerIcon"
      tabler="IconClock"
      hugeicons="Clock03Icon"
      phosphor="TimerIcon"
      remixicon="RiTimerLine"
    />
  ),
  color: (
    <IconPlaceholder
      lucide="PaletteIcon"
      tabler="IconPalette"
      hugeicons="PaintBoardIcon"
      phosphor="PaletteIcon"
      remixicon="RiPaletteLine"
    />
  ),
  location: (
    <IconPlaceholder
      lucide="MapPinIcon"
      tabler="IconMapPin"
      hugeicons="Location01Icon"
      phosphor="MapPinIcon"
      remixicon="RiMapPinLine"
    />
  ),
  formula: (
    <IconPlaceholder
      lucide="CalculatorIcon"
      tabler="IconCalculator"
      hugeicons="CalculatorIcon"
      phosphor="CalculatorIcon"
      remixicon="RiCalculatorLine"
    />
  ),
  progress: (
    <IconPlaceholder
      lucide="ListTodoIcon"
      tabler="IconListCheck"
      hugeicons="CheckListIcon"
      phosphor="ListChecksIcon"
      remixicon="RiListCheck3"
    />
  ),
  key: (
    <IconPlaceholder
      lucide="HashIcon"
      tabler="IconHash"
      hugeicons="GridIcon"
      phosphor="HashIcon"
      remixicon="RiHashtag"
    />
  ),
  "created-time": (
    <IconPlaceholder
      lucide="ClockIcon"
      tabler="IconClock"
      hugeicons="Clock01Icon"
      phosphor="ClockIcon"
      remixicon="RiTimeLine"
    />
  ),
  "created-by": (
    <IconPlaceholder
      lucide="CircleUserIcon"
      tabler="IconUserCircle"
      hugeicons="UserCircleIcon"
      phosphor="UserCircleIcon"
      remixicon="RiUserSmileLine"
    />
  ),
  "edited-time": (
    <IconPlaceholder
      lucide="ClockIcon"
      tabler="IconClock"
      hugeicons="Clock01Icon"
      phosphor="ClockIcon"
      remixicon="RiTimeLine"
    />
  ),
  "edited-by": (
    <IconPlaceholder
      lucide="CircleUserIcon"
      tabler="IconUserCircle"
      hugeicons="UserCircleIcon"
      phosphor="UserCircleIcon"
      remixicon="RiUserSmileLine"
    />
  ),
}

/** The icons a person can give a property: one per drawing, then the app's. */
function usePropertyIconNames() {
  const icons = React.use(PropertyIconContext)
  return React.useMemo(
    () => [
      ...Object.keys(typeIcons).filter((name) => !repeatedIcons.has(name)),
      ...Object.keys(icons),
    ],
    [icons]
  )
}

const repeatedIcons = new Set([
  "title",
  "key",
  "created-by",
  "edited-time",
  "edited-by",
])

/** A property's own icon, or its type's. */
function PropertyIcon({
  property,
}: {
  property: Pick<PropertyDefinition, "type" | "icon">
}) {
  const icons = React.use(PropertyIconContext)
  const types = usePropertyTypes()
  const own = property.icon
    ? (icons[property.icon] ??
      (Object.hasOwn(typeIcons, property.icon)
        ? typeIcons[property.icon]
        : undefined))
    : undefined
  return (
    own ??
    types.get(property.type)?.icon ??
    typeIcons[property.type] ??
    typeIcons.text
  )
}

// A circle drawn as it fills: dashed before work starts, empty when planned, a
// growing slice under way, solid with a check when done.
function StatusGlyph({
  glyph,
}: {
  glyph: Extract<PropertyGlyph, { kind: "status" }>
}) {
  const isSolid = glyph.state === "done" || glyph.state === "canceled"
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={glyph.state === "backlog" ? "1.6 1.41" : undefined}
        fill={isSolid ? "currentColor" : undefined}
      />
      {glyph.state === "active" && (
        <circle
          cx="7"
          cy="7"
          r="1.75"
          stroke="currentColor"
          strokeWidth="3.5"
          pathLength="1"
          strokeDasharray={`${glyph.ratio} 1`}
          transform="rotate(-90 7 7)"
        />
      )}
      {glyph.state === "done" && (
        <path
          d="m4.6 7.2 1.6 1.6 3.2-3.5"
          className="cn-properties-glyph-mark"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {glyph.state === "canceled" && (
        <path
          d="m5.2 5.2 3.6 3.6m0-3.6-3.6 3.6"
          className="cn-properties-glyph-mark"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

const bars = [
  { x: 1.5, y: 8.5, height: 4 },
  { x: 5.5, y: 5.5, height: 7 },
  { x: 9.5, y: 2.5, height: 10 },
]

// Three bars that fill with the level, dashes for none, a filled mark for urgent.
function PriorityGlyph({ level }: { level: 0 | 1 | 2 | 3 | 4 }) {
  if (level === 4)
    return (
      <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="12" height="12" rx="3" fill="currentColor" />
        <path
          d="M7 4v3.4M7 9.9v.1"
          className="cn-properties-glyph-mark"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    )
  return (
    <svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      {bars.map(({ x, y, height }, index) =>
        level === 0 ? (
          <rect key={x} x={x} y="6.25" width="3" height="1.5" rx="0.75" />
        ) : (
          <rect
            key={x}
            x={x}
            y={y}
            width="3"
            height={height}
            rx="1"
            opacity={index < level ? 1 : 0.28}
          />
        )
      )}
    </svg>
  )
}

/** An option's or a column's mark: its glyph, the app's icon, or a dot in its colour. */
function PropertyMark({
  mark,
  className,
}: {
  mark: {
    icon?: string
    color?: string
    group?: PropertyOptionGroup
  }
  className?: string
}) {
  const icons = React.use(PropertyIconContext)
  const glyph = getPropertyGlyph(mark)
  const icon = mark.icon ? icons[mark.icon] : undefined
  if (!glyph && !icon && !mark.color) return null
  return (
    <span
      data-slot="properties-mark"
      data-toned={mark.color ? true : undefined}
      aria-hidden="true"
      className={cn(
        "cn-properties-mark inline-flex shrink-0 items-center justify-center",
        className
      )}
      style={mark.color ? getPaletteVariables(mark.color) : undefined}
    >
      {glyph?.kind === "status" ? (
        <StatusGlyph glyph={glyph} />
      ) : glyph?.kind === "priority" ? (
        <PriorityGlyph level={glyph.level} />
      ) : (
        (icon ?? <span className="cn-properties-dot" />)
      )}
    </span>
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

// Plain markup: a board draws hundreds, and each Avatar is a primitive with
// its own image state.
function PropertyAvatar({
  person,
  className,
}: {
  person: PropertyOption
  className?: string
}) {
  return (
    <span
      data-slot="properties-avatar"
      className={cn(
        "cn-properties-avatar inline-flex shrink-0 items-center justify-center overflow-hidden select-none",
        className
      )}
      style={getPaletteVariables(person.color ?? getAvatarColor(person.label))}
    >
      {person.image ? (
        <img
          src={person.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{getInitials(person.label)}</span>
      )}
    </span>
  )
}

export {
  PropertyAvatar,
  PropertyIcon,
  PropertyIconProvider,
  PropertyMark,
  usePropertyIconNames,
  type PropertyIconMap,
}
