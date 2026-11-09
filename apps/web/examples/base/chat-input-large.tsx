"use client"

import * as React from "react"
import {
  ClaudeIcon,
  GoogleGeminiIcon,
  GrokIcon,
  OpenaiIcon,
} from "@fabricator-ui/icons/brands"
import {
  AtSignIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DollarSignIcon,
  PaperclipIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShieldOffIcon,
  SlashIcon,
  SparklesIcon,
  TargetIcon,
  WandSparklesIcon,
  WaypointsIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"
import { useMicrophone } from "voice-glow"

import {
  ChatInput,
  ChatInputActions,
  ChatInputAttachment,
  ChatInputAttachments,
  ChatInputButton,
  ChatInputCommands,
  ChatInputContextMeter,
  ChatInputFooter,
  ChatInputMic,
  ChatInputOption,
  ChatInputOptions,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
  formatTokenCount,
  useChatInputAttachments,
  type ChatInputCommand,
  type ChatInputMicActivity,
  type ChatInputStatus,
} from "@/styles/base-fabricator/ui/chat-input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"
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
} from "@/styles/base-fabricator/ui/model-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/base-fabricator/ui/popover"

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

const PERMISSIONS: Record<
  string,
  { label: string; hint: string; icon: LucideIcon }
> = {
  ask: {
    label: "Ask first",
    hint: "Asks before every change",
    icon: ShieldIcon,
  },
  edit: {
    label: "Auto-edit",
    hint: "Edits files, asks for commands",
    icon: ShieldCheckIcon,
  },
  full: {
    label: "Full access",
    hint: "Runs anything without asking",
    icon: ShieldOffIcon,
  },
}

const COMMANDS: ChatInputCommand[] = [
  {
    value: "goal",
    description: "Keep working toward an objective until it's done",
    icon: <TargetIcon />,
  },
  {
    value: "code-review",
    kind: "skill",
    description: "Review the current diff for bugs",
    icon: <WandSparklesIcon />,
  },
  {
    value: "simplify",
    kind: "skill",
    description: "Clean up the code that changed",
    icon: <WandSparklesIcon />,
  },
  {
    value: "write-tests",
    kind: "skill",
    description: "Write tests for what changed",
    icon: <WandSparklesIcon />,
    badge: "project",
  },
  {
    value: "release-notes",
    kind: "skill",
    description: "Draft the notes for the next release",
    icon: <WandSparklesIcon />,
  },
]

const COMMAND_NAMES = new Set(COMMANDS.map((command) => `/${command.value}`))

/** `/` mentions read as mentions only for real commands and skills. */
function isKnownMention(mention: string) {
  return !mention.startsWith("/") || COMMAND_NAMES.has(mention)
}

const PLACEHOLDERS = [
  "Ask for anything…",
  "@ for files",
  "Draft a script…",
  "/ for skills",
  "Plan a launch…",
  "$ for artifacts",
]

// A stand-in for an upload: each file lands a moment later.
function upload() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 1200))
}

function findModel(id: string) {
  for (const provider of PROVIDERS) {
    const model = provider.models.find((entry) => entry.id === id)
    if (model) return { provider, model }
  }
  return null
}

export function ChatInputLarge() {
  const [value, setValue] = React.useState("")
  const [status, setStatus] = React.useState<ChatInputStatus>("ready")
  const files = useChatInputAttachments({ upload })
  const [modelId, setModelId] = React.useState("claude-opus-5-5")
  const [isAuto, setAuto] = React.useState(false)
  const [effort, setEffort] = React.useState<string | null>("high")
  const [permission, setPermission] = React.useState("edit")
  const [isPermissionOpen, setPermissionOpen] = React.useState(false)
  const [isVoiceActive, setVoiceActive] = React.useState(false)
  const [activity, setActivity] =
    React.useState<ChatInputMicActivity>("listening")
  const [view, setView] = React.useState<"effort" | "models">("effort")
  const [isModelOpen, setModelOpen] = React.useState(false)
  const mic = useMicrophone()
  const pickerRef = React.useRef<HTMLInputElement>(null)
  const timers = React.useRef<number[]>([])
  const current = findModel(modelId)
  const Permission = PERMISSIONS[permission] ?? PERMISSIONS.ask

  React.useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
    }
  }, [])

  // The glow listens to your microphone; without one (denied, or no
  // device), this stand-in level drives it.
  const voiceLevel = React.useCallback(() => {
    const time = performance.now() / 1000
    return 0.35 + Math.sin(time * 5) * 0.25 + Math.sin(time * 13) * 0.15
  }, [])

  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput
        layout="large"
        value={value}
        onValueChange={setValue}
        status={status}
        queue
        hasContent={files.hasContent}
        isUploading={files.isUploading}
        onAttach={files.attach}
        isVoiceActive={isVoiceActive}
        onVoiceActiveChange={(active) => {
          setVoiceActive(active)
          setActivity("listening")
          // Asked from the press, so the browser lets audio start.
          if (active) void mic.start()
          else mic.stop()
        }}
        voiceStream={activity === "muted" ? null : mic.stream}
        voiceLevel={activity === "muted" ? () => 0 : voiceLevel}
        onSubmit={() => {
          files.clear()
          setStatus("submitted")
          timers.current.push(
            window.setTimeout(() => setStatus("streaming"), 600),
            window.setTimeout(() => setStatus("ready"), 5000)
          )
        }}
        onStop={() => setStatus("ready")}
      >
        <ChatInputAttachments>
          {files.attachments.map((entry) => (
            <ChatInputAttachment
              key={entry.id}
              name={entry.name}
              src={entry.src}
              isUploading={entry.isUploading}
              onRemove={() => files.remove(entry.id)}
            />
          ))}
        </ChatInputAttachments>
        <ChatInputTextarea
          placeholder={PLACEHOLDERS}
          mentions={["@", "/", "$"]}
          isKnownMention={isKnownMention}
        />
        <ChatInputCommands commands={COMMANDS} />
        <ChatInputFooter>
          <ChatInputTools>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<ChatInputButton aria-label="Add to message" />}
              >
                <PlusIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-56 bg-surface-5 shadow-surface-5"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => pickerRef.current?.click()}>
                    <PaperclipIcon />
                    Attach files
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setValue(`${value}@`)}>
                    <AtSignIcon />
                    Mention a file
                    <DropdownMenuShortcut>@</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setValue(`${value}$`)}>
                    <DollarSignIcon />
                    Use an artifact
                    <DropdownMenuShortcut>$</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setValue(`${value}/`)}>
                    <SlashIcon />
                    Run a skill
                    <DropdownMenuShortcut>/</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={pickerRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                files.attach(Array.from(event.target.files ?? []))
                event.target.value = ""
              }}
            />
            <Popover open={isPermissionOpen} onOpenChange={setPermissionOpen}>
              <PopoverTrigger
                render={
                  <ChatInputButton
                    aria-label={`Permissions: ${Permission.label}`}
                  />
                }
              >
                <Permission.icon />
                <span>{Permission.label}</span>
                <ChevronDownIcon />
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={10}
                className="w-64 gap-0 bg-surface-5 p-1 shadow-surface-5"
              >
                <ChatInputOptions
                  aria-label="Permissions"
                  value={permission}
                  onValueChange={setPermission}
                >
                  {Object.entries(PERMISSIONS).map(([key, option]) => (
                    <ChatInputOption
                      key={key}
                      value={key}
                      icon={<option.icon />}
                      label={option.label}
                      description={option.hint}
                      onClick={() => setPermissionOpen(false)}
                    />
                  ))}
                </ChatInputOptions>
              </PopoverContent>
            </Popover>
          </ChatInputTools>
          <ChatInputActions>
            <Popover>
              <PopoverTrigger
                render={
                  <ChatInputContextMeter
                    value={0.42}
                    label={formatTokenCount(84_200)}
                  />
                }
              />
              <PopoverContent
                side="top"
                align="end"
                className="w-60 bg-surface-5 shadow-surface-5"
              >
                <div className="grid gap-1 text-sm">
                  <span className="font-medium">Context</span>
                  <span className="text-muted-foreground">
                    84K of 200K tokens: 42% used. Older turns are summarised
                    once it fills.
                  </span>
                </div>
              </PopoverContent>
            </Popover>
            <Popover
              open={isModelOpen}
              onOpenChange={(open) => {
                setModelOpen(open)
                if (open) setView(isAuto ? "models" : "effort")
              }}
            >
              <PopoverTrigger
                render={<ChatInputButton aria-label="Model and effort" />}
              >
                {isAuto ? (
                  <WaypointsIcon />
                ) : (
                  current && <current.provider.icon color="brand" />
                )}
                <span className="text-foreground">
                  {isAuto ? "Auto" : current?.model.short}
                </span>
                {!isAuto && effort && (
                  <span className="text-(length:--density-text-12) text-muted-foreground @max-lg/chat-input:hidden">
                    {effort}
                  </span>
                )}
                <ChevronDownIcon />
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                sideOffset={10}
                className="w-80 gap-0 bg-surface-5 p-1 shadow-surface-5"
              >
                {view === "effort" && current && !isAuto ? (
                  <ModelPickerEffort
                    levels={EFFORTS}
                    value={effort}
                    onValueChange={setEffort}
                  >
                    <ChatInputButton
                      size="sm"
                      className="-ms-1.5 text-foreground"
                      onClick={() => setView("models")}
                    >
                      <current.provider.icon color="brand" />
                      <span>{current.model.label}</span>
                      <ChevronRightIcon />
                    </ChatInputButton>
                  </ModelPickerEffort>
                ) : (
                  <ModelPicker>
                    <ModelPickerHeader>
                      {!isAuto && (
                        <ChatInputButton
                          size="icon-sm"
                          aria-label="Back to effort"
                          onClick={() => setView("effort")}
                        >
                          <ChevronLeftIcon />
                        </ChatInputButton>
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
                          setModelOpen(false)
                        }}
                      >
                        <WaypointsIcon />
                        Auto
                      </ModelPickerRoute>
                    </ModelPickerRoutes>
                    {PROVIDERS.map((provider) => (
                      <ModelPickerGroup key={provider.id}>
                        <ModelPickerGroupLabel>
                          <provider.icon color="brand" />
                          {provider.label}
                        </ModelPickerGroupLabel>
                        {provider.models.map((model) => (
                          <ModelPickerItem
                            key={model.id}
                            selected={!isAuto && model.id === modelId}
                            onClick={() => {
                              setModelId(model.id)
                              setAuto(false)
                              setView("effort")
                            }}
                          >
                            <ModelPickerItemName>
                              {model.label}
                            </ModelPickerItemName>
                            <ModelPickerItemMeta>
                              <span title="Context window">
                                {model.context}
                              </span>
                              {model.fast && (
                                <ZapIcon role="img" aria-label="Fast" />
                              )}
                            </ModelPickerItemMeta>
                          </ModelPickerItem>
                        ))}
                      </ModelPickerGroup>
                    ))}
                  </ModelPicker>
                )}
              </PopoverContent>
            </Popover>
            <ChatInputMic
              activity={activity}
              onClick={() =>
                setActivity(activity === "muted" ? "listening" : "muted")
              }
            />
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
