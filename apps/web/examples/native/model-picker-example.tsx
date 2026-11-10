import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  NetworkIcon,
  WaypointsIcon,
  ZapIcon,
} from "@fabricator-ui/icons-react-native"
import {
  ClaudeIcon,
  GoogleGeminiIcon,
  GrokIcon,
  OpenaiIcon,
} from "@fabricator-ui/icons-react-native/brands"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
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
  ModelPickerSetting,
} from "@/registry/native/ui/model-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/native/ui/popover"
import { Switch } from "@/registry/native/ui/switch"
import { Text } from "@/registry/native/ui/text"

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

// Each provider's current models, as the website's demo lists them.
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

const FIVE = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "ultra", label: "Ultra" },
]

/** The website's demo: effort first, the model list behind the model's button. */
function ModelSwitcher() {
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
      <PopoverTrigger
        render={
          <Button variant="ghost" accessibilityLabel="Model and effort" />
        }
      >
        {isAuto ? <WaypointsIcon /> : <ProviderIcon color="brand" />}
        <Text>{isAuto ? "Auto" : model?.short}</Text>
        {!isAuto && effort ? (
          <Text className="text-muted-foreground">{effort}</Text>
        ) : null}
        <ChevronDownIcon />
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
              className="-ms-1.5"
              onPress={() => setView("models")}
            >
              <ProviderIcon color="brand" />
              <Text className="text-foreground">{model.label}</Text>
              <ChevronRightIcon />
            </Button>
          </ModelPickerEffort>
        ) : (
          <ModelPicker>
            <ModelPickerHeader>
              {!isAuto ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  accessibilityLabel="Back to effort"
                  onPress={() => setView("effort")}
                >
                  <ChevronLeftIcon />
                </Button>
              ) : null}
              <Text className={isAuto ? "ps-1.5" : undefined}>
                Select model
              </Text>
            </ModelPickerHeader>
            <ModelPickerRoutes>
              <ModelPickerRoute
                selected={isAuto}
                caption="Picks the model and effort for each message"
                onPress={() => {
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
                    onPress={() => {
                      setModelId(option.id)
                      setAuto(false)
                      setView("effort")
                    }}
                  >
                    <ModelPickerItemName>{option.label}</ModelPickerItemName>
                    <ModelPickerItemMeta>
                      <Text accessibilityLabel={`${option.context} context`}>
                        {option.context}
                      </Text>
                      {option.fast ? (
                        <ZapIcon accessible accessibilityLabel="Fast" />
                      ) : null}
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

/** Every part on the page, with a toggled route, a disabled row and a setting. */
function ModelPickerParts() {
  const [modelId, setModelId] = React.useState("claude-sonnet-5-5")
  const [isOrchestrated, setOrchestrated] = React.useState(true)
  const [isFast, setFast] = React.useState(false)
  const claude = PROVIDERS[0]
  if (!claude) return null
  return (
    <View className="w-full max-w-80 rounded-xl bg-popover p-1 shadow-surface-3">
      <ModelPicker>
        <ModelPickerHeader>
          <Text className="ps-1.5">Select model</Text>
        </ModelPickerHeader>
        <ModelPickerRoutes>
          <ModelPickerRoute caption="Picks the model for each message">
            <WaypointsIcon />
            Auto
          </ModelPickerRoute>
          <ModelPickerRoute
            aria-pressed={isOrchestrated}
            caption="Splits work across agents"
            onPress={() => setOrchestrated((on) => !on)}
          >
            <NetworkIcon />
            Orchestrate
          </ModelPickerRoute>
        </ModelPickerRoutes>
        <ModelPickerGroup>
          <ModelPickerGroupLabel>
            <claude.icon color="brand" />
            {claude.label}
          </ModelPickerGroupLabel>
          {claude.models.map((option) => (
            <ModelPickerItem
              key={option.id}
              selected={option.id === modelId}
              onPress={() => setModelId(option.id)}
            >
              <ModelPickerItemName>{option.label}</ModelPickerItemName>
              <ModelPickerItemMeta>
                {option.id === "claude-sonnet-5-5" ? (
                  <Text>Default</Text>
                ) : null}
                <Text>{option.context}</Text>
              </ModelPickerItemMeta>
            </ModelPickerItem>
          ))}
          <ModelPickerItem disabled>
            <ModelPickerItemName>Claude Opus 4 (retired)</ModelPickerItemName>
            <ModelPickerItemMeta>
              <Text>200K</Text>
            </ModelPickerItemMeta>
          </ModelPickerItem>
        </ModelPickerGroup>
      </ModelPicker>
      <ModelPickerSetting label="Fast mode">
        <Switch
          size="sm"
          checked={isFast}
          onCheckedChange={setFast}
          accessibilityLabel="Fast mode"
        />
      </ModelPickerSetting>
    </View>
  )
}

function EffortDemo({
  levels,
  initial = null,
}: {
  levels: readonly { value: string; label: string }[]
  initial?: string | null
}) {
  const [effort, setEffort] = React.useState<string | null>(initial)
  return (
    <View className="w-full max-w-80 rounded-xl bg-popover p-1 shadow-surface-3">
      <ModelPickerEffort
        levels={levels}
        value={effort}
        onValueChange={setEffort}
      >
        <Text className="text-sm">Reasoning</Text>
      </ModelPickerEffort>
    </View>
  )
}

function ModelPickerExample() {
  return (
    <ExampleWrapper>
      <Example title="Model and effort">
        <ModelSwitcher />
      </Example>
      <Example title="Effort">
        <EffortDemo levels={FIVE} />
      </Example>
      <Example title="Effort at the top level">
        <EffortDemo levels={EFFORTS} initial="max" />
      </Example>
      <Example title="Routes, a disabled model and a setting">
        <ModelPickerParts />
      </Example>
    </ExampleWrapper>
  )
}

export { ModelPickerExample }
