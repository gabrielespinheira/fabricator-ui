"use client"

import * as React from "react"
import {
  AtSignIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DollarSignIcon,
  FeatherIcon,
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
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
  formatTokenCount,
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

type Model = { id: string; label: string; context: number; fast?: boolean }
type Provider = { id: string; label: string; icon: LucideIcon; models: Model[] }

const PROVIDERS: Provider[] = [
  {
    id: "lumen",
    label: "Lumen",
    icon: SparklesIcon,
    models: [
      { id: "lumen-3", label: "Lumen 3", context: 1_000_000 },
      {
        id: "lumen-3-mini",
        label: "Lumen 3 Mini",
        context: 200_000,
        fast: true,
      },
    ],
  },
  {
    id: "quill",
    label: "Quill",
    icon: FeatherIcon,
    models: [
      { id: "quill-pro", label: "Quill Pro", context: 400_000 },
      { id: "quill-flash", label: "Quill Flash", context: 128_000, fast: true },
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

type Attached = {
  id: string
  file: File
  url: string | null
  isUploading: boolean
}

function findModel(id: string) {
  for (const provider of PROVIDERS) {
    const model = provider.models.find((entry) => entry.id === id)
    if (model) return { provider, model }
  }
  return null
}

export function ChatInputDemo() {
  const [value, setValue] = React.useState("")
  const [status, setStatus] = React.useState<ChatInputStatus>("ready")
  const [attached, setAttached] = React.useState<Attached[]>([])
  const [modelId, setModelId] = React.useState("lumen-3")
  const [isAuto, setAuto] = React.useState(false)
  const [effort, setEffort] = React.useState<string | null>("high")
  const [permission, setPermission] = React.useState("edit")
  const [isVoiceActive, setVoiceActive] = React.useState(false)
  const [activity, setActivity] =
    React.useState<ChatInputMicActivity>("listening")
  const [view, setView] = React.useState<"effort" | "models">("effort")
  const [isModelOpen, setModelOpen] = React.useState(false)
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

  const attach = (files: File[]) => {
    const added = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      isUploading: true,
    }))
    setAttached((entries) => [...entries, ...added])
    // A stand-in for the upload: each file lands a moment later.
    for (const entry of added)
      timers.current.push(
        window.setTimeout(
          () =>
            setAttached((entries) =>
              entries.map((item) =>
                item.id === entry.id ? { ...item, isUploading: false } : item
              )
            ),
          1200
        )
      )
  }

  const remove = (id: string) =>
    setAttached((entries) => {
      const removed = entries.find((entry) => entry.id === id)
      if (removed?.url) URL.revokeObjectURL(removed.url)
      return entries.filter((entry) => entry.id !== id)
    })

  // A stand-in for the microphone's level while voice chat is on.
  const voiceLevel = React.useCallback(() => {
    const time = performance.now() / 1000
    return 0.35 + Math.sin(time * 5) * 0.25 + Math.sin(time * 13) * 0.15
  }, [])

  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput
        value={value}
        onValueChange={setValue}
        status={status}
        queue
        hasContent={attached.length > 0}
        isUploading={attached.some((entry) => entry.isUploading)}
        onAttach={attach}
        isVoiceActive={isVoiceActive}
        onVoiceActiveChange={(active) => {
          setVoiceActive(active)
          setActivity("listening")
        }}
        voiceLevel={voiceLevel}
        onSubmit={() => {
          for (const entry of attached)
            if (entry.url) URL.revokeObjectURL(entry.url)
          setAttached([])
          setStatus("submitted")
          timers.current.push(
            window.setTimeout(() => setStatus("streaming"), 600),
            window.setTimeout(() => setStatus("ready"), 5000)
          )
        }}
        onStop={() => setStatus("ready")}
      >
        <ChatInputAttachments>
          {attached.map((entry) => (
            <ChatInputAttachment
              key={entry.id}
              name={entry.file.name}
              src={entry.url ?? undefined}
              isUploading={entry.isUploading}
              onRemove={() => remove(entry.id)}
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
              <DropdownMenuContent side="top" align="start" className="w-56">
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
                attach(Array.from(event.target.files ?? []))
                event.target.value = ""
              }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <ChatInputButton
                    aria-label={`Permissions: ${Permission.label}`}
                  />
                }
              >
                <Permission.icon />
                <span>{Permission.label}</span>
                <ChevronDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-64">
                <DropdownMenuGroup>
                  {Object.entries(PERMISSIONS).map(([key, option]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => setPermission(key)}
                      className="items-start py-2"
                    >
                      <option.icon className="mt-0.5" />
                      <span className="grid gap-0.5">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.hint}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <PopoverContent side="top" align="end" className="w-60">
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
                  current && <current.provider.icon />
                )}
                <span>{isAuto ? "Auto" : current?.model.label}</span>
                {!isAuto && effort && (
                  <span className="text-muted-foreground @max-lg/chat-input:hidden">
                    {effort}
                  </span>
                )}
                <ChevronDownIcon />
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                sideOffset={10}
                className="w-80 gap-0 p-1"
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
                      <current.provider.icon />
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
                          <provider.icon />
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
                                {formatTokenCount(model.context)}
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
