"use client"

import * as React from "react"
import Link from "next/link"
import { BellIcon as BellOutlineIcon } from "@fabricator-ui/icons"
import {
  BellIcon,
  CalendarIcon,
  CameraIcon,
  CloudIcon,
  FolderIcon,
  HeartIcon,
  HouseIcon,
  LockIcon,
  MailIcon,
  MessageCircleIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  StarIcon,
  UploadIcon,
  UserIcon,
  type AnimatedIconHandle,
  type AnimatedIconProps,
} from "@fabricator-ui/icons/animated"
import { BellIcon as BellDuotoneIcon } from "@fabricator-ui/icons/duotone"
import { BellIcon as BellFillIcon } from "@fabricator-ui/icons/fill"

import { Tabs, TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"

import { PreviewStage } from "./preview-stage"

type Weight = NonNullable<AnimatedIconProps["variant"]>
type AnimatedIcon = typeof BellIcon

const WEIGHTS: Record<Weight, string> = {
  outline: "Outline",
  fill: "Fill",
  duotone: "Duotone",
}

function isWeight(value: unknown): value is Weight {
  return value === "outline" || value === "fill" || value === "duotone"
}

const GRID: { name: string; icon: AnimatedIcon }[] = [
  { name: "House", icon: HouseIcon },
  { name: "Search", icon: SearchIcon },
  { name: "Mail", icon: MailIcon },
  { name: "Calendar", icon: CalendarIcon },
  { name: "Message", icon: MessageCircleIcon },
  { name: "Heart", icon: HeartIcon },
  { name: "Star", icon: StarIcon },
  { name: "Folder", icon: FolderIcon },
  { name: "Upload", icon: UploadIcon },
  { name: "Cloud", icon: CloudIcon },
  { name: "Camera", icon: CameraIcon },
  { name: "Lock", icon: LockIcon },
  { name: "User", icon: UserIcon },
  { name: "Settings", icon: SettingsIcon },
  { name: "Sparkles", icon: SparklesIcon },
  { name: "Bell", icon: BellIcon },
]

// How often the Animated tile plays by itself while it is on screen.
const AUTOPLAY_MS = 2600

function WeightTile({
  label,
  entry,
  children,
  ...props
}: React.ComponentProps<"div"> & { label: string; entry: string }) {
  return (
    <div
      className="flex aspect-[4/5] flex-col justify-between rounded-2xl bg-surface-3 p-3 text-foreground shadow-surface-3 sm:p-4"
      {...props}
    >
      <div className="flex flex-1 items-center justify-center">{children}</div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {entry}
        </span>
      </div>
    </div>
  )
}

// The Animated tile rings on its own while in view, and again when hovered.
function AnimatedTile() {
  const tileRef = React.useRef<HTMLDivElement>(null)
  const iconRef = React.useRef<AnimatedIconHandle>(null)

  React.useEffect(() => {
    const tile = tileRef.current
    if (!tile) return
    let timer: number | undefined
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer)
      if (!entry?.isIntersecting) return
      iconRef.current?.startAnimation()
      timer = window.setInterval(
        () => iconRef.current?.startAnimation(),
        AUTOPLAY_MS
      )
    })
    observer.observe(tile)
    return () => {
      observer.disconnect()
      window.clearInterval(timer)
    }
  }, [])

  return (
    <WeightTile
      ref={tileRef}
      label="Animated"
      entry="/animated"
      onPointerEnter={() => iconRef.current?.startAnimation()}
    >
      <BellIcon ref={iconRef} size={44} />
    </WeightTile>
  )
}

function GridCell({
  name,
  icon: Icon,
  weight,
}: {
  name: string
  icon: AnimatedIcon
  weight: Weight
}) {
  const iconRef = React.useRef<AnimatedIconHandle>(null)
  return (
    <div
      onPointerEnter={() => iconRef.current?.startAnimation()}
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl text-foreground transition-colors duration-feedback ease-feedback hover:bg-hover"
    >
      <Icon ref={iconRef} variant={weight} size={24} />
      <span className="text-[11px] text-muted-foreground">{name}</span>
    </div>
  )
}

export function IconsPreview() {
  const [weight, setWeight] = React.useState<Weight>("duotone")

  return (
    <PreviewStage
      className="flex-col items-stretch gap-6"
      caption={
        <>
          Hover any icon to play it.{" "}
          <Link
            href="/icons"
            className="rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Browse every icon
          </Link>
        </>
      }
      controls={
        <Tabs
          value={weight}
          onValueChange={(value) => {
            if (isWeight(value)) setWeight(value)
          }}
        >
          <TabsList aria-label="Icon drawing">
            {Object.entries(WEIGHTS).map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
        <WeightTile label="Outline" entry="default">
          <BellOutlineIcon size={44} />
        </WeightTile>
        <WeightTile label="Fill" entry="/fill">
          <BellFillIcon size={44} />
        </WeightTile>
        <WeightTile label="Duotone" entry="/duotone">
          <BellDuotoneIcon size={44} />
        </WeightTile>
        <AnimatedTile />
      </div>
      <div
        aria-hidden="true"
        className="mx-auto grid w-full max-w-lg grid-cols-4 gap-1 rounded-2xl bg-surface-3 p-2 shadow-surface-3 [--icon-secondary-opacity:0.32] sm:grid-cols-8"
      >
        {GRID.map((item) => (
          <GridCell key={item.name} {...item} weight={weight} />
        ))}
      </div>
    </PreviewStage>
  )
}
