"use client"

import * as React from "react"
import {
  BotIcon,
  CornerDownRightIcon,
  ListEndIcon,
  PauseIcon,
  PlayIcon,
  RadarIcon,
  SquareIcon,
  TargetIcon,
  TerminalIcon,
  Trash2Icon,
  WandSparklesIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import {
  ChatInput,
  ChatInputActions,
  ChatInputAttachment,
  ChatInputAttachments,
  ChatInputButton,
  ChatInputCommands,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTray,
  ChatInputTrayContent,
  ChatInputTrayEntry,
  ChatInputTrayItem,
  ChatInputTrayMeta,
  ChatInputTrayTrigger,
  formatChatInputDuration,
  useChatInputAttachments,
  type ChatInputCommand,
  type ChatInputStatus,
} from "@/styles/radix-fabricator/ui/chat-input"

type Queued = { id: string; text: string }
type Task = {
  id: string
  kind: "shell" | "monitor" | "agent"
  description: string
  command: string
  startedAt: number
}
type Goal = {
  objective: string
  isPaused: boolean
  startedAt: number
  reason: string
}

const TASK_ICONS: Record<Task["kind"], LucideIcon> = {
  shell: TerminalIcon,
  monitor: RadarIcon,
  agent: BotIcon,
}

const COMMANDS: ChatInputCommand[] = [
  {
    value: "goal",
    description: "Keep working toward an objective until it's done",
    icon: <TargetIcon />,
  },
  {
    value: "subagent",
    description: "Start a sub-agent on a task of its own",
    icon: <BotIcon />,
    runs: true,
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
]

const COMMAND_NAMES = new Set(COMMANDS.map((command) => `/${command.value}`))

/** How long a stand-in reply runs. */
const REPLY_MS = 6000

export function ChatInputAgent() {
  const files = useChatInputAttachments()
  const [value, setValue] = React.useState("")
  const [status, setStatus] = React.useState<ChatInputStatus>("ready")
  const [queued, setQueued] = React.useState<Queued[]>([
    { id: "screenshot", text: "Then add a dark mode screenshot to the PR" },
  ])
  const [tasks, setTasks] = React.useState<Task[]>(() => [
    {
      id: "dev",
      kind: "shell",
      description: "Dev server",
      command: "bun run dev",
      startedAt: Date.now() - 184_000,
    },
  ])
  const [goal, setGoal] = React.useState<Goal | null>(null)
  const [now, setNow] = React.useState(() => Date.now())
  const replyTimer = React.useRef<number | undefined>(undefined)

  React.useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearInterval(ticker)
      window.clearTimeout(replyTimer.current)
    }
  }, [])

  // A stand-in for the agent: it replies for a few seconds, then takes the
  // next queued message.
  const queuedRef = React.useRef(queued)
  React.useEffect(() => {
    queuedRef.current = queued
  }, [queued])

  const startReply = React.useCallback(function run(text: string) {
    window.clearTimeout(replyTimer.current)
    setStatus("streaming")
    if (text.includes("/code-review"))
      setTasks((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          kind: "monitor",
          description: "Watch CI for the review",
          command: "gh run watch",
          startedAt: Date.now(),
        },
      ])
    replyTimer.current = window.setTimeout(() => {
      const [next, ...rest] = queuedRef.current
      if (!next) return setStatus("ready")
      setQueued(rest)
      run(next.text)
    }, REPLY_MS)
  }, [])

  const isBusy = status === "submitted" || status === "streaming"

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col">
      {goal && (
        <ChatInputTray level={3} aria-label="Goal">
          <ChatInputTrayEntry>
            <ChatInputTrayItem>
              <ChatInputTrayTrigger title={goal.objective}>
                <TargetIcon aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {goal.objective}
                </span>
                <ChatInputTrayMeta>
                  {goal.isPaused
                    ? "Paused"
                    : `Working · ${formatChatInputDuration(now - goal.startedAt)}`}
                </ChatInputTrayMeta>
              </ChatInputTrayTrigger>
              <ChatInputButton
                aria-label={goal.isPaused ? "Resume goal" : "Pause goal"}
                title={
                  goal.isPaused
                    ? "Resume: the agent carries on toward it"
                    : "Pause: the agent stops working toward it until you resume"
                }
                onClick={() => setGoal({ ...goal, isPaused: !goal.isPaused })}
              >
                {goal.isPaused ? <PlayIcon /> : <PauseIcon />}
              </ChatInputButton>
              <ChatInputButton
                aria-label="Clear goal"
                title="Clear: stop the goal and forget it"
                onClick={() => setGoal(null)}
              >
                <XIcon />
              </ChatInputButton>
            </ChatInputTrayItem>
            <ChatInputTrayContent>
              <p className="whitespace-pre-wrap text-foreground">
                {goal.objective}
              </p>
              <p className="text-muted-foreground">{goal.reason}</p>
            </ChatInputTrayContent>
          </ChatInputTrayEntry>
        </ChatInputTray>
      )}
      {tasks.length > 0 && (
        <ChatInputTray level={2} role="list" aria-label="Background tasks">
          {tasks.map((task) => {
            const Icon = TASK_ICONS[task.kind]
            return (
              <ChatInputTrayEntry key={task.id} role="listitem">
                <ChatInputTrayItem>
                  <ChatInputTrayTrigger title={task.command}>
                    <Icon aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {task.description}
                    </span>
                    <ChatInputTrayMeta>
                      {formatChatInputDuration(now - task.startedAt)}
                    </ChatInputTrayMeta>
                  </ChatInputTrayTrigger>
                  <ChatInputButton
                    aria-label={`Stop: ${task.description}`}
                    title="Stop this task"
                    onClick={() =>
                      setTasks((current) =>
                        current.filter((entry) => entry.id !== task.id)
                      )
                    }
                  >
                    <SquareIcon />
                  </ChatInputButton>
                </ChatInputTrayItem>
                <ChatInputTrayContent>
                  <pre className="overflow-x-auto rounded-md bg-hover p-2 font-mono text-muted-foreground">
                    {`$ ${task.command}\n▸ running for ${formatChatInputDuration(now - task.startedAt)}`}
                  </pre>
                </ChatInputTrayContent>
              </ChatInputTrayEntry>
            )
          })}
        </ChatInputTray>
      )}
      {queued.length > 0 && (
        <ChatInputTray level={1} role="list" aria-label="Queued messages">
          {queued.map((message) => (
            <ChatInputTrayItem key={message.id} role="listitem">
              <ListEndIcon aria-hidden />
              <span className="min-w-0 flex-1 truncate">{message.text}</span>
              <ChatInputButton
                aria-label={`Steer: ${message.text}`}
                title="Send this now, stopping the reply"
                onClick={() => {
                  setQueued((current) =>
                    current.filter((entry) => entry.id !== message.id)
                  )
                  startReply(message.text)
                }}
              >
                <CornerDownRightIcon />
                <span>Steer</span>
              </ChatInputButton>
              <ChatInputButton
                aria-label={`Remove: ${message.text}`}
                title="Remove from the queue"
                onClick={() =>
                  setQueued((current) =>
                    current.filter((entry) => entry.id !== message.id)
                  )
                }
              >
                <Trash2Icon />
              </ChatInputButton>
            </ChatInputTrayItem>
          ))}
        </ChatInputTray>
      )}
      <ChatInput
        value={value}
        onValueChange={setValue}
        status={status}
        queue
        // Files dropped on the card or pasted into the field ride along.
        onAttach={files.attach}
        hasContent={files.hasContent}
        onStop={() => {
          window.clearTimeout(replyTimer.current)
          setStatus("ready")
        }}
        onRecall={() => {
          const last = queued.at(-1)
          if (!last) return
          setQueued(queued.slice(0, -1))
          setValue(last.text)
        }}
        onSubmit={(text) => {
          files.clear()
          const objective = text.match(/^\/goal\s+([\s\S]+)/)?.[1]?.trim()
          if (objective)
            setGoal({
              objective,
              isPaused: false,
              startedAt: Date.now(),
              reason:
                "Started from /goal. The agent checks in after each turn.",
            })
          if (isBusy)
            return setQueued((current) => [
              ...current,
              { id: crypto.randomUUID(), text },
            ])
          startReply(text)
        }}
      >
        <ChatInputAttachments>
          {files.attachments.map((entry) => (
            <ChatInputAttachment
              key={entry.id}
              name={entry.name}
              src={entry.src}
              onRemove={() => files.remove(entry.id)}
            />
          ))}
        </ChatInputAttachments>
        <ChatInputTextarea
          placeholder={[
            "Ask, or / for commands",
            "/goal sets an objective",
            "↑ edits the last queued message",
          ]}
          mentions={["/"]}
          isKnownMention={(mention) => COMMAND_NAMES.has(mention)}
        />
        <ChatInputCommands
          commands={COMMANDS}
          onRun={() =>
            setTasks((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                kind: "agent",
                description: "Sub-agent: explore the codebase",
                command: "agent explore",
                startedAt: Date.now(),
              },
            ])
          }
        />
        <ChatInputFooter>
          <ChatInputActions>
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
