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
  ChevronLeftIcon,
  ChevronRightIcon,
  DollarSignIcon,
  PaperclipIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShieldOffIcon,
  SlashIcon,
  TargetIcon,
  WandSparklesIcon,
  WaypointsIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"
import { useMicrophone } from "voice-glow"

import { Button } from "@/styles/aria-fabricator/ui/button"
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
} from "@/styles/aria-fabricator/ui/chat-input"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/styles/aria-fabricator/ui/dropdown-menu"
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
} from "@/styles/aria-fabricator/ui/model-picker"
import { Popover, PopoverTrigger } from "@/styles/aria-fabricator/ui/popover"

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

// What fills the context window, for the details view.
const CONTEXT = { used: 84_200, window: 200_000 }
const CONTEXT_PARTS = [
  { label: "Messages", tokens: 61_400 },
  { label: "Tools", tokens: 14_600 },
  { label: "System", tokens: 8_200 },
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

type SettingsView = "settings" | "models" | "permissions" | "context"

export function ChatInputDemo() {
  const mic = useMicrophone()
  const [value, setValue] = React.useState("")
  const [status, setStatus] = React.useState<ChatInputStatus>("ready")
  const [isVoiceActive, setVoiceActive] = React.useState(false)
  const [activity, setActivity] =
    React.useState<ChatInputMicActivity>("listening")
  const [modelId, setModelId] = React.useState("claude-opus-5-5")
  const [isAuto, setAuto] = React.useState(false)
  const [effort, setEffort] = React.useState<string | null>("high")
  const [permission, setPermission] = React.useState("edit")
  const [view, setView] = React.useState<SettingsView>("settings")
  const [isSettingsOpen, setSettingsOpen] = React.useState(false)
  const pickerRef = React.useRef<HTMLInputElement>(null)
  const fieldRef = React.useRef<HTMLTextAreaElement>(null)
  const files = useChatInputAttachments({ upload })
  const timers = React.useRef<number[]>([])

  React.useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
    }
  }, [])
  const current = findModel(modelId)
  const Permission = PERMISSIONS[permission] ?? PERMISSIONS.ask
  const ModelIcon = isAuto
    ? WaypointsIcon
    : (current?.provider.icon ?? ClaudeIcon)

  // + starts a mention: the sigil goes at the end of the draft and focus
  // returns to the field, so a / opens the commands and skills right away.
  const insert = (sigil: string) => {
    // On the next frame, once the draft is in: React Aria hands focus back
    // to the + button only while it's still inside the closing menu.
    requestAnimationFrame(() => fieldRef.current?.focus())
    setValue(
      value === "" || /\s$/.test(value)
        ? `${value}${sigil}`
        : `${value} ${sigil}`
    )
  }

  const back = (
    <ChatInputButton
      size="icon-sm"
      aria-label="Back to settings"
      onClick={() => setView("settings")}
    >
      <ChevronLeftIcon />
    </ChatInputButton>
  )

  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput
        value={value}
        onValueChange={setValue}
        status={status}
        queue
        // Files dropped on the pill or pasted into the field attach too.
        onAttach={files.attach}
        hasContent={files.hasContent}
        isUploading={files.isUploading}
        onSubmit={() => {
          files.clear()
          // A stand-in reply: send turns into stop while it streams.
          setStatus("submitted")
          timers.current.push(
            window.setTimeout(() => setStatus("streaming"), 600),
            window.setTimeout(() => setStatus("ready"), 5000)
          )
        }}
        onStop={() => setStatus("ready")}
        isVoiceActive={isVoiceActive}
        onVoiceActiveChange={(active) => {
          setVoiceActive(active)
          // Asked from the press, so the browser lets audio start.
          if (active) void mic.start()
          else mic.stop()
        }}
        voiceStream={activity === "muted" ? null : mic.stream}
        // Without a microphone, a stand-in level drives the glow.
        voiceLevel={
          activity === "muted"
            ? () => 0
            : () => 0.4 + Math.sin(performance.now() / 180) * 0.3
        }
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
          ref={fieldRef}
          placeholder={[
            "Message",
            "/ for skills",
            "Drop or paste files…",
            "@ for files",
          ]}
          mentions={["@", "/", "$"]}
          isKnownMention={isKnownMention}
        />
        <ChatInputCommands commands={COMMANDS} />
        <ChatInputFooter>
          <ChatInputTools>
            {/* React Aria menus and popovers open from a React Aria Button,
                drawn here like the pill's other controls. They open below:
                React Aria popovers placed on top don't show yet. */}
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Add to message"
                className="size-(--density-36) rounded-full"
              >
                <PlusIcon />
              </Button>
              <DropdownMenu
                placement="bottom start"
                className="w-56 bg-surface-5 shadow-surface-5"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem onAction={() => pickerRef.current?.click()}>
                    <PaperclipIcon />
                    Attach files
                  </DropdownMenuItem>
                  <DropdownMenuItem onAction={() => insert("@")}>
                    <AtSignIcon />
                    Mention a file
                    <DropdownMenuShortcut>@</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onAction={() => insert("$")}>
                    <DollarSignIcon />
                    Use an artifact
                    <DropdownMenuShortcut>$</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onAction={() => insert("/")}>
                    <SlashIcon />
                    Run a skill
                    <DropdownMenuShortcut>/</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenu>
            </DropdownMenuTrigger>
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
          </ChatInputTools>
          <ChatInputActions>
            {/* The model beside send opens the session's settings: the
                model and its effort, permissions and the context. */}
            <PopoverTrigger
              isOpen={isSettingsOpen}
              onOpenChange={(open) => {
                setSettingsOpen(open)
                if (open) setView("settings")
              }}
            >
              <Button
                variant="ghost"
                aria-label={`Session settings: ${isAuto ? "Auto" : `${current?.model.label}, ${effort} effort`}, ${Permission.label}`}
                className="h-(--density-36) gap-(--density-6) rounded-full px-(--density-10)"
              >
                <ModelIcon color="brand" />
                <span className="text-foreground @max-sm/chat-input:hidden">
                  {isAuto ? "Auto" : current?.model.short}
                </span>
                {!isAuto && effort && (
                  <span className="text-(length:--density-text-12) text-muted-foreground @max-sm/chat-input:hidden">
                    {effort}
                  </span>
                )}
              </Button>
              <Popover
                placement="bottom end"
                offset={10}
                className="w-80 gap-0 bg-surface-5 p-1 shadow-surface-5"
              >
                {view === "models" ? (
                  // Short enough to open above the pill in a low window.
                  <ModelPicker className="max-h-80">
                    <ModelPickerHeader>
                      {back}
                      Select model
                    </ModelPickerHeader>
                    <ModelPickerRoutes>
                      <ModelPickerRoute
                        selected={isAuto}
                        caption="Picks the model and effort for each message"
                        onClick={() => {
                          setAuto(true)
                          setView("settings")
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
                              setView("settings")
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
                ) : view === "permissions" ? (
                  <>
                    <ModelPickerHeader>
                      {back}
                      Permissions
                    </ModelPickerHeader>
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
                          onClick={() => setView("settings")}
                        />
                      ))}
                    </ChatInputOptions>
                  </>
                ) : view === "context" ? (
                  <>
                    <ModelPickerHeader>
                      {back}
                      Context
                    </ModelPickerHeader>
                    <div className="grid gap-3 px-2 pb-2 text-sm">
                      <p className="text-muted-foreground">
                        {formatTokenCount(CONTEXT.used)} of{" "}
                        {formatTokenCount(CONTEXT.window)} tokens used. Older
                        turns are summarised once it fills.
                      </p>
                      <div className="flex h-2 overflow-hidden rounded-full bg-hover">
                        {CONTEXT_PARTS.map((part, index) => (
                          <span
                            key={part.label}
                            style={{
                              width: `${(part.tokens / CONTEXT.window) * 100}%`,
                              opacity: 1 - index * 0.25,
                            }}
                            className="h-full bg-info"
                          />
                        ))}
                      </div>
                      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
                        {CONTEXT_PARTS.map((part) => (
                          <React.Fragment key={part.label}>
                            <dt className="text-muted-foreground">
                              {part.label}
                            </dt>
                            <dd>{formatTokenCount(part.tokens)}</dd>
                          </React.Fragment>
                        ))}
                      </dl>
                    </div>
                  </>
                ) : (
                  <>
                    {isAuto ? (
                      <ModelPickerHeader>
                        <ChatInputButton
                          size="sm"
                          className="text-foreground"
                          onClick={() => setView("models")}
                        >
                          <WaypointsIcon />
                          <span>Auto</span>
                          <ChevronRightIcon />
                        </ChatInputButton>
                      </ModelPickerHeader>
                    ) : (
                      current && (
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
                      )
                    )}
                    <ModelPickerSetting label="Permissions">
                      <ChatInputButton
                        aria-label={`Permissions: ${Permission.label}`}
                        onClick={() => setView("permissions")}
                      >
                        <Permission.icon />
                        <span>{Permission.label}</span>
                        <ChevronRightIcon />
                      </ChatInputButton>
                    </ModelPickerSetting>
                    <ModelPickerSetting label="Context">
                      <ChatInputContextMeter
                        value={CONTEXT.used / CONTEXT.window}
                        label={formatTokenCount(CONTEXT.used)}
                        onClick={() => setView("context")}
                      />
                    </ModelPickerSetting>
                  </>
                )}
              </Popover>
            </PopoverTrigger>
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
