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

import {
  ChatInput,
  ChatInputActions,
  ChatInputButton,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
  type ChatInputStatus,
} from "@/styles/radix-fabricator/ui/chat-input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/styles/radix-fabricator/ui/dropdown-menu"

const models = ["Auto", "Fast", "Deep"] as const

export function ChatInputDemo() {
  const [status, setStatus] = React.useState<ChatInputStatus>("ready")
  const [model, setModel] = React.useState<(typeof models)[number]>("Auto")
  const [isSearching, setSearching] = React.useState(false)
  const timers = React.useRef<number[]>([])

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ChatInputButton aria-label="Add to message">
                  <PlusIcon />
                </ChatInputButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-48">
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
              </DropdownMenuContent>
            </DropdownMenu>
            <ChatInputButton
              aria-pressed={isSearching}
              onClick={() => setSearching(!isSearching)}
            >
              <GlobeIcon />
              <span>Search</span>
            </ChatInputButton>
          </ChatInputTools>
          <ChatInputActions>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ChatInputButton aria-label={`Model: ${model}`}>
                  <span>{model}</span>
                  <ChevronDownIcon />
                </ChatInputButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-40">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Model</DropdownMenuLabel>
                  {models.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option}
                      checked={model === option}
                      onCheckedChange={() => setModel(option)}
                    >
                      {option}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
