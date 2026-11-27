"use client"

import * as React from "react"
import { cn } from "cn"

import {
  findOnboardingPerson,
  OnboardingAvatar,
} from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-avatar"
import { OnboardingMark } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-mark"
import { OnboardingPreviewView } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-preview-view"
import {
  ONBOARDING_OWNER,
  ONBOARDING_SOURCE_MARKS,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-data"
import {
  getPreview,
  getReadableColor,
  getSourceName,
  type OnboardingAnswers,
  type OnboardingUse,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { DensityProvider } from "@/registry/bases/__base__/ui/density"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const ARRIVES = "animate-in fade-in-0 duration-move ease-move"

function NavIcon({ id }: { id: OnboardingUse | "home" }) {
  if (id === "projects")
    return (
      <IconPlaceholder
        lucide="SquareCheckIcon"
        tabler="IconSquareCheck"
        hugeicons="CheckmarkSquare02Icon"
        phosphor="CheckSquareIcon"
        remixicon="RiCheckboxLine"
      />
    )
  if (id === "customers")
    return (
      <IconPlaceholder
        lucide="UsersIcon"
        tabler="IconUsers"
        hugeicons="UserGroupIcon"
        phosphor="UsersIcon"
        remixicon="RiGroupLine"
      />
    )
  if (id === "reports")
    return (
      <IconPlaceholder
        lucide="ChartLineIcon"
        tabler="IconChartLine"
        hugeicons="Chart03Icon"
        phosphor="ChartLineIcon"
        remixicon="RiLineChartLine"
      />
    )
  return (
    <IconPlaceholder
      lucide="HouseIcon"
      tabler="IconHome"
      hugeicons="Home01Icon"
      phosphor="HouseIcon"
      remixicon="RiHomeLine"
    />
  )
}

function NavRow({
  isActive = false,
  className,
  children,
}: {
  isActive?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "flex h-(--density-32) items-center gap-(--density-8) rounded-(--radius-control) px-(--density-8) text-muted-foreground [&>svg]:size-(--density-icon-16) [&>svg]:shrink-0",
        isActive && "bg-active text-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

/**
 * The signature: the workspace being set up, built from the real components
 * and redrawn by every answer. It is a picture, so nothing in it can be
 * reached.
 */
export function OnboardingPreview({
  answers,
  isCompact = false,
  className,
}: {
  answers: OnboardingAnswers
  isCompact?: boolean
  className?: string
}) {
  const preview = getPreview(answers)
  const people = [
    ONBOARDING_OWNER,
    ...preview.invited.map(findOnboardingPerson),
  ]
  const [lead, ...rest] = preview.address.split(".")

  return (
    <div
      aria-hidden="true"
      inert
      className={cn(
        "@container/preview relative overflow-hidden rounded-(--radius-surface) transition-colors duration-move ease-move select-none",
        className
      )}
      style={{
        background: `color-mix(in oklab, ${preview.color} 14%, var(--background))`,
      }}
    >
      {/* The App Shell's frame color, which only exists inside a shell. */}
      <DensityProvider
        density={isCompact ? "compact" : "default"}
        className="absolute start-(--density-32) top-(--density-32) bottom-0 flex w-[max(calc(100%-var(--density-32)),52rem)] flex-col overflow-hidden rounded-tl-(--radius-surface) bg-(--app-shell-frame) text-(length:--density-text-13) text-foreground shadow-surface-3 [--app-shell-frame:color-mix(in_oklab,var(--surface-1),black_4%)] dark:[--app-shell-frame:color-mix(in_oklab,var(--surface-1),black_30%)]"
      >
        <span className="flex h-(--density-40) shrink-0 items-center gap-(--density-6) px-(--density-16) text-muted-foreground">
          <IconPlaceholder
            lucide="LockIcon"
            tabler="IconLock"
            hugeicons="SquareLock02Icon"
            phosphor="LockKeyIcon"
            remixicon="RiLockLine"
            className="size-(--density-icon-14)"
          />
          <span>
            <span className="text-foreground">{lead}</span>.{rest.join(".")}
          </span>
        </span>
        <div className="flex min-h-0 flex-1">
          <div className="hidden w-56 shrink-0 flex-col gap-(--density-20) px-(--density-10) pb-(--density-12) @md/preview:flex">
            <span className="flex items-center gap-(--density-8) px-(--density-4)">
              <OnboardingMark name={preview.name} color={preview.color} />
              <span className="truncate font-medium">{preview.name}</span>
            </span>
            <span className="flex flex-col">
              {preview.nav.map((item) => (
                <NavRow
                  key={item.id}
                  isActive={item.isActive}
                  className={ARRIVES}
                >
                  <NavIcon id={item.id} />
                  {item.label}
                </NavRow>
              ))}
            </span>
            {preview.teams.length > 0 && (
              <span className={cn("flex flex-col", ARRIVES)}>
                <span className="px-(--density-8) pb-(--density-4) text-(length:--density-text-12) text-muted-foreground">
                  Teams
                </span>
                {preview.teams.map((team, index) => (
                  <NavRow key={team} className={ARRIVES}>
                    <span
                      className="mx-1 size-2 rounded-full"
                      style={{
                        background: `var(--chart-series-${index + 1})`,
                      }}
                    />
                    {team}
                  </NavRow>
                ))}
              </span>
            )}
            {preview.sources.length > 0 && (
              <span className={cn("flex flex-col", ARRIVES)}>
                <span className="px-(--density-8) pb-(--density-4) text-(length:--density-text-12) text-muted-foreground">
                  In sync
                </span>
                {preview.sources.map((source) => {
                  const Mark = ONBOARDING_SOURCE_MARKS[source]
                  return (
                    <NavRow key={source} className={ARRIVES}>
                      {Mark && <Mark size={16} color="brand" />}
                      {getSourceName(source)}
                    </NavRow>
                  )
                })}
              </span>
            )}
            <span className="mt-auto flex items-center gap-(--density-8) px-(--density-4)">
              <OnboardingAvatar person={ONBOARDING_OWNER} />
              <span className="truncate">{ONBOARDING_OWNER.name}</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-(--density-16) rounded-tl-(--radius-surface) bg-background p-(--density-24) shadow-surface-2">
            {preview.view && answers.use ? (
              <>
                <span className="flex items-center gap-(--density-12)">
                  <span className="text-xl tracking-tight weight-semibold">
                    {preview.title}
                  </span>
                  <span className="ms-auto flex -space-x-1.5">
                    {people.slice(0, 6).map((person) => (
                      <OnboardingAvatar
                        key={person.email}
                        person={person}
                        className={cn("ring-2 ring-background", ARRIVES)}
                      />
                    ))}
                  </span>
                  <span
                    className="flex h-(--density-32) items-center gap-(--density-6) rounded-(--radius-control) px-(--density-12) font-medium transition-colors duration-move ease-move"
                    style={{
                      background: preview.color,
                      color: getReadableColor(preview.color),
                    }}
                  >
                    <IconPlaceholder
                      lucide="PlusIcon"
                      tabler="IconPlus"
                      hugeicons="PlusSignIcon"
                      phosphor="PlusIcon"
                      remixicon="RiAddLine"
                      className="size-(--density-icon-14)"
                    />
                    New
                  </span>
                </span>
                <OnboardingPreviewView
                  key={`${answers.use}-${preview.view}`}
                  use={answers.use}
                  view={preview.view}
                  sources={preview.sources}
                  people={people}
                />
              </>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconPlaceholder
                      lucide="SparklesIcon"
                      tabler="IconSparkles"
                      hugeicons="SparklesIcon"
                      phosphor="SparkleIcon"
                      remixicon="RiSparklingLine"
                    />
                  </EmptyMedia>
                  <EmptyTitle>Your workspace takes shape here</EmptyTitle>
                  <EmptyDescription>Every answer changes it.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>
      </DensityProvider>
    </div>
  )
}
