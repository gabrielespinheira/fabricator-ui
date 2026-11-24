"use client"

import * as React from "react"

import { AssistantComposerSlot } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-column"
import { ASSISTANT_SUGGESTIONS } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-replies"
import {
  FluidHoverHighlight,
  useFluidHover,
} from "@/registry/bases/__base__/lib/fluid-hover"
import { BotFace } from "@/registry/bases/__base__/ui/bot-face"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A new chat: the composer under a short greeting, a little above the middle,
// with a few prompts to start from. On phones the composer already sits where
// the conversation will have it.

const SUGGESTION_ICONS: Record<
  (typeof ASSISTANT_SUGGESTIONS)[number]["id"],
  React.ReactNode
> = {
  growth: (
    <IconPlaceholder
      lucide="ChartColumnIcon"
      tabler="IconChartBar"
      hugeicons="ChartColumnIcon"
      phosphor="ChartBarIcon"
      remixicon="RiBarChartLine"
    />
  ),
  churn: (
    <IconPlaceholder
      lucide="TrendingDownIcon"
      tabler="IconTrendingDown"
      hugeicons="ChartDownIcon"
      phosphor="TrendDownIcon"
      remixicon="RiArrowRightDownLine"
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
  email: (
    <IconPlaceholder
      lucide="MailIcon"
      tabler="IconMail"
      hugeicons="Mail01Icon"
      phosphor="EnvelopeSimpleIcon"
      remixicon="RiMailLine"
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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-(--density-40) pb-(--density-16) in-data-[size=phone]:pt-(--density-24)">
      {/* Two parts above and three below, so the group reads as centred. */}
      <div className="flex-2" />
      <AssistantComposerSlot className="flex flex-col items-center gap-(--density-16) text-center">
        <BotFace size="sm" />
        <h1 className="text-2xl tracking-tight text-balance weight-semibold">
          What are we working on, {name}?
        </h1>
      </AssistantComposerSlot>
      <AssistantComposerSlot className="pt-(--density-24) in-data-[size=phone]:order-last">
        {composer}
      </AssistantComposerSlot>
      <AssistantComposerSlot className="pt-(--density-16)">
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
                onClick={() => onPick(suggestion.prompt)}
                className="flex min-h-(--density-36) w-full cursor-pointer items-center gap-(--density-12) rounded-lg px-(--density-16) py-(--density-8) text-start text-(length:--density-text-13) outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11 [&_svg]:size-(--density-icon-16) [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
              >
                {SUGGESTION_ICONS[suggestion.id]}
                <span className="min-w-0 flex-1">{suggestion.prompt}</span>
                <span className="hidden shrink-0 text-muted-foreground @2xl:inline">
                  {suggestion.detail}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </AssistantComposerSlot>
      <div className="flex-3" />
    </div>
  )
}
