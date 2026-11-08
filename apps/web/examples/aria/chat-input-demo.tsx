"use client"

import * as React from "react"
import {
  AtSignIcon,
  ChevronDownIcon,
  GlobeIcon,
  ImageIcon,
  PaperclipIcon,
  PlusIcon,
} from "lucide-react"
import type { Selection } from "react-aria-components"

import { Button } from "@/styles/aria-fabricator/ui/button"
import {
  ChatInput,
  ChatInputActions,
  ChatInputButton,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
  type ChatInputStatus,
} from "@/styles/aria-fabricator/ui/chat-input"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/styles/aria-fabricator/ui/dropdown-menu"

const models = ["Auto", "Fast", "Deep"] as const

export function ChatInputDemo() {
  const [status, setStatus] = React.useState<ChatInputStatus>("ready")
  const [model, setModel] = React.useState<Selection>(new Set(["Auto"]))
  const [isSearching, setSearching] = React.useState(false)
  const timers = React.useRef<number[]>([])
  const modelName = [...(model === "all" ? [] : model)][0] ?? "Auto"

  const clearTimers = () => {
    for (const timer of timers.current) window.clearTimeout(timer)
    timers.current = []
  }

  React.useEffect(() => clearTimers, [])

  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput
        status={status}
        onSubmit={() => {
          setStatus("submitted")
          timers.current.push(
            window.setTimeout(() => setStatus("streaming"), 600),
            window.setTimeout(() => setStatus("ready"), 4000)
          )
        }}
        onStop={() => {
          clearTimers()
          setStatus("ready")
        }}
      >
        <ChatInputTextarea placeholder="Ask anything…" />
        <ChatInputFooter>
          <ChatInputTools>
            {/* React Aria menus open from a React Aria Button, drawn here
                like the footer's other round controls. */}
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Add to message"
                className="size-8 rounded-full"
              >
                <PlusIcon />
              </Button>
              <DropdownMenu className="w-48" placement="top start">
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <PaperclipIcon />
                    Attach files
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ImageIcon />
                    Add photos
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <AtSignIcon />
                    Mention a file
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenu>
            </DropdownMenuTrigger>
            <ChatInputButton
              aria-pressed={isSearching}
              onClick={() => setSearching(!isSearching)}
            >
              <GlobeIcon />
              <span>Search</span>
            </ChatInputButton>
          </ChatInputTools>
          <ChatInputActions>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                aria-label={`Model: ${String(modelName)}`}
                className="h-8 gap-1.5 rounded-full px-2.5"
              >
                {String(modelName)}
                <ChevronDownIcon />
              </Button>
              <DropdownMenu className="w-40" placement="top end">
                <DropdownMenuGroup
                  selectionMode="single"
                  disallowEmptySelection
                  selectedKeys={model}
                  onSelectionChange={setModel}
                >
                  <DropdownMenuLabel>Model</DropdownMenuLabel>
                  {models.map((option) => (
                    <DropdownMenuItem key={option} id={option}>
                      {option}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenu>
            </DropdownMenuTrigger>
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
