"use client"

import * as React from "react"

import {
  getChatTitle,
  reduceAssistantMessages,
  splitIntoChunks,
  type AssistantAction,
  type AssistantAttachment,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import { type AssistantChat } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chats"
import { pickReplyScript } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-replies"

// The chats and the reply that's running, with its timers. In your app,
// send the message to your API and dispatch what streams back instead of
// playing a script.

const THINKING_MS = 700
const TOOL_MS = 1600
const CHUNK_MS = 40

export function useAssistantChats(initialChats: AssistantChat[]) {
  const [chats, setChats] = React.useState(initialChats)
  const [activeId, setActiveId] = React.useState<string | null>(
    initialChats[0]?.id ?? null
  )
  const [runningId, setRunningId] = React.useState<string | null>(null)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])
  const nextId = React.useRef(0)

  const createId = (prefix: string) => {
    nextId.current += 1
    return `${prefix}-${Date.now()}-${nextId.current}`
  }

  const dispatch = React.useCallback(
    (chatId: string, action: AssistantAction) => {
      setChats((current) =>
        current.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                updatedAt: new Date().toISOString(),
                messages: reduceAssistantMessages(chat.messages, action),
              }
            : chat
        )
      )
    },
    []
  )

  const clearTimers = () => {
    for (const timer of timers.current.splice(0)) clearTimeout(timer)
  }

  React.useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) clearTimeout(timer)
    }
  }, [])

  const stop = () => {
    if (!runningId) return
    clearTimers()
    dispatch(runningId, { type: "stop" })
    setRunningId(null)
  }

  const send = (text: string, attachments: AssistantAttachment[]) => {
    // One reply runs at a time: a new message stops the one running.
    stop()
    let chatId = activeId
    if (!chatId) {
      chatId = createId("chat")
      const chat: AssistantChat = {
        id: chatId,
        title: getChatTitle(text),
        updatedAt: new Date().toISOString(),
        messages: [],
      }
      setChats((current) => [chat, ...current])
      setActiveId(chatId)
    }
    const runId = chatId
    dispatch(runId, {
      type: "send",
      userId: createId("user"),
      assistantId: createId("reply"),
      text,
      attachments,
    })
    setRunningId(runId)

    const script = pickReplyScript(text)
    const toolId = createId("tool")
    const chunks = splitIntoChunks(script.text)
    const at = (delay: number, run: () => void) => {
      timers.current.push(setTimeout(run, delay))
    }

    at(THINKING_MS, () =>
      dispatch(runId, {
        type: "tool-start",
        tool: { ...script.tool, id: toolId },
      })
    )
    at(THINKING_MS + TOOL_MS, () =>
      dispatch(runId, { type: "tool-end", id: toolId, ...script.result })
    )
    const streamAt = THINKING_MS + TOOL_MS + THINKING_MS
    chunks.forEach((chunk, index) =>
      at(streamAt + index * CHUNK_MS, () =>
        dispatch(runId, { type: "text", chunk })
      )
    )
    at(streamAt + chunks.length * CHUNK_MS, () => {
      dispatch(runId, { type: "finish" })
      setRunningId(null)
      timers.current.splice(0)
    })
  }

  const rename = (chatId: string, title: string) => {
    setChats((current) =>
      current.map((chat) => (chat.id === chatId ? { ...chat, title } : chat))
    )
  }

  const remove = (chatId: string) => {
    if (chatId === runningId) stop()
    setChats((current) => current.filter((chat) => chat.id !== chatId))
    if (chatId === activeId) setActiveId(null)
  }

  return {
    chats,
    activeChat: chats.find((chat) => chat.id === activeId) ?? null,
    select: setActiveId,
    startNewChat: () => setActiveId(null),
    send,
    stop,
    rename,
    remove,
  }
}
