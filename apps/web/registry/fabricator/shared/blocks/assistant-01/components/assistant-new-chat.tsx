"use client"

import * as React from "react"

import { ASSISTANT_SUGGESTIONS } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-replies"
import {
  FluidHoverHighlight,
  useFluidHover,
} from "@/registry/bases/__base__/lib/fluid-hover"
import { BotFace } from "@/registry/bases/__base__/ui/bot-face"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A new chat: the composer centred under a short greeting, with a few
// prompts to start from.

const SUGGESTION_ICONS: Record<
  (typeof ASSISTANT_SUGGESTIONS)[number]["id"],
  React.ReactNode
> = {
  churn: (
    <IconPlaceholder
      lucide="ChartColumnIcon"
      tabler="IconChartBar"
      hugeicons="ChartColumnIcon"
      phosphor="ChartBarIcon"
      remixicon="RiBarChartLine"
    />
  ),
  email: (
    <IconPlaceholder
      lucide="MailIcon"
      tabler="IconMail"
      hugeicons="Mail01Icon"
      phosphor="EnvelopeSimpleIcon"
      remixicon="RiMailLine"
    />
  ),
  benchmarks: (
    <IconPlaceholder
      lucide="GlobeIcon"
      tabler="IconWorld"
      hugeicons="GlobeIcon"
      phosphor="GlobeIcon"
      remixicon="RiGlobalLine"
    />
  ),
}

export function AssistantNewChat({
  name,
  composer,
  onPick,
}: {
  name: string
  composer: React.ReactNode
  onPick: (prompt: string) => void
}) {
  const {
    attach,
    props: fluidProps,
    hover,
  } = useFluidHover<HTMLUListElement>({
    items: "[data-slot=assistant-suggestion]",
  })

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-(--density-16) py-(--density-40)">
      <div className="flex w-full max-w-2xl flex-col gap-(--density-24)">
        <div className="flex flex-col items-center gap-(--density-16) text-center">
          <BotFace size="sm" />
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            What are we working on, {name}?
          </h1>
        </div>
        {composer}
        <ul
          ref={attach}
          {...fluidProps}
          aria-label="Suggestions"
          className="relative isolate flex flex-col"
        >
          <FluidHoverHighlight hover={hover} />
          {ASSISTANT_SUGGESTIONS.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                data-slot="assistant-suggestion"
                onClick={() => onPick(suggestion.label)}
                className="flex min-h-(--density-36) w-full items-center gap-(--density-12) rounded-lg px-(--density-16) py-(--density-8) text-start text-(length:--density-text-13) outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-(--density-icon-16) [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
              >
                {SUGGESTION_ICONS[suggestion.id]}
                <span className="min-w-0 flex-1 truncate">
                  {suggestion.label}
                </span>
                <span className="hidden shrink-0 text-muted-foreground sm:inline">
                  {suggestion.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
