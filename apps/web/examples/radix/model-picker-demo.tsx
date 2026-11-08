"use client"

import * as React from "react"
import {
  ClaudeIcon,
  GoogleGeminiIcon,
  GrokIcon,
  OpenaiIcon,
} from "@fabricator-ui/icons/brands"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  WaypointsIcon,
  ZapIcon,
} from "lucide-react"

import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  ModelPicker,
  ModelPickerEffort,
  ModelPickerGroup,
  ModelPickerGroupLabel,
  ModelPickerHeader,
  ModelPickerItem,
  ModelPickerItemMeta,
  ModelPickerItemName,
  ModelPickerRoute,
  ModelPickerRoutes,
} from "@/styles/radix-fabricator/ui/model-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/radix-fabricator/ui/popover"

type Model = {
  id: string
  label: string
  /** The name in the trigger, where the provider's logo already says whose it is. */
  short: string
  context: string
  fast?: boolean
}
type Provider = {
  id: string
  label: string
  icon: typeof ClaudeIcon
  models: Model[]
}

// Each provider's current models, as their docs list them (November 2026).
const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    label: "Claude",
    icon: ClaudeIcon,
    models: [
      {
        id: "claude-fable-5-1",
        label: "Claude Fable 5.1",
        short: "Fable 5.1",
        context: "1M",
      },
      {
        id: "claude-opus-5-5",
        label: "Claude Opus 5.5",
        short: "Opus 5.5",
        context: "1M",
      },
      {
        id: "claude-sonnet-5-5",
        label: "Claude Sonnet 5.5",
        short: "Sonnet 5.5",
        context: "1M",
      },
      {
        id: "claude-haiku-5-5",
        label: "Claude Haiku 5.5",
        short: "Haiku 5.5",
        context: "1M",
        fast: true,
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    icon: OpenaiIcon,
    models: [
      {
        id: "gpt-6-astra",
        label: "GPT-6 Astra",
        short: "GPT-6 Astra",
        context: "1.05M",
      },
      {
        id: "gpt-6.1-sol",
        label: "GPT-6.1 Sol",
        short: "GPT-6.1 Sol",
        context: "1.05M",
      },
      {
        id: "gpt-6.1-terra",
        label: "GPT-6.1 Terra",
        short: "GPT-6.1 Terra",
        context: "1.05M",
      },
      {
        id: "gpt-6-luna",
        label: "GPT-6 Luna",
        short: "GPT-6 Luna",
        context: "1.05M",
        fast: true,
      },
    ],
  },
  {
    id: "google",
    label: "Gemini",
    icon: GoogleGeminiIcon,
    models: [
      {
        id: "gemini-4-argon",
        label: "Gemini 4 Argon",
        short: "Gemini 4 Argon",
        context: "1M",
      },
      {
        id: "gemini-3.8-flash",
        label: "Gemini 3.8 Flash",
        short: "Gemini 3.8 Flash",
        context: "1M",
        fast: true,
      },
    ],
  },
  {
    id: "xai",
    label: "Grok",
    icon: GrokIcon,
    models: [
      { id: "grok-4.7", label: "Grok 4.7", short: "Grok 4.7", context: "500K" },
    ],
  },
]

const EFFORTS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "max", label: "Max" },
]

export function ModelPickerDemo() {
  const [modelId, setModelId] = React.useState("claude-opus-5-5")
  const [isAuto, setAuto] = React.useState(false)
  const [effort, setEffort] = React.useState<string | null>(null)
  const [view, setView] = React.useState<"effort" | "models">("effort")
  const [isOpen, setOpen] = React.useState(false)
  const provider = PROVIDERS.find((entry) =>
    entry.models.some((model) => model.id === modelId)
  )
  const model = provider?.models.find((entry) => entry.id === modelId)
  const ProviderIcon = provider?.icon ?? ClaudeIcon

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open)
        if (open) setView(isAuto ? "models" : "effort")
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" aria-label="Model and effort">
          {isAuto ? <WaypointsIcon /> : <ProviderIcon color="brand" />}
          {isAuto ? "Auto" : model?.short}
          {!isAuto && effort && (
            <span className="text-muted-foreground">{effort}</span>
          )}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-80 gap-0 p-1">
        {view === "effort" && !isAuto && model ? (
          <ModelPickerEffort
            levels={EFFORTS}
            value={effort}
            onValueChange={setEffort}
          >
            <Button
              variant="ghost"
              size="sm"
              className="-ms-1.5 text-foreground"
              onClick={() => setView("models")}
            >
              <ProviderIcon color="brand" />
              {model.label}
              <ChevronRightIcon />
            </Button>
          </ModelPickerEffort>
        ) : (
          <ModelPicker>
            <ModelPickerHeader>
              {!isAuto && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Back to effort"
                  onClick={() => setView("effort")}
                >
                  <ChevronLeftIcon />
                </Button>
              )}
              <span className={isAuto ? "ps-1.5" : undefined}>
                Select model
              </span>
            </ModelPickerHeader>
            <ModelPickerRoutes>
              <ModelPickerRoute
                selected={isAuto}
                caption="Picks the model and effort for each message"
                onClick={() => {
                  setAuto(true)
                  setOpen(false)
                }}
              >
                <WaypointsIcon />
                Auto
              </ModelPickerRoute>
            </ModelPickerRoutes>
            {PROVIDERS.map((entry) => (
              <ModelPickerGroup key={entry.id}>
                <ModelPickerGroupLabel>
                  <entry.icon color="brand" />
                  {entry.label}
                </ModelPickerGroupLabel>
                {entry.models.map((option) => (
                  <ModelPickerItem
                    key={option.id}
                    selected={!isAuto && option.id === modelId}
                    onClick={() => {
                      setModelId(option.id)
                      setAuto(false)
                      setView("effort")
                    }}
                  >
                    <ModelPickerItemName>{option.label}</ModelPickerItemName>
                    <ModelPickerItemMeta>
                      <span title="Context window">{option.context}</span>
                      {option.fast && <ZapIcon role="img" aria-label="Fast" />}
                    </ModelPickerItemMeta>
                  </ModelPickerItem>
                ))}
              </ModelPickerGroup>
            ))}
          </ModelPicker>
        )}
      </PopoverContent>
    </Popover>
  )
}
