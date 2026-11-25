"use client"

import * as React from "react"

import {
  getChatTitle,
  getReplyQuestion,
  reduceAssistantMessages,
  splitIntoChunks,
  type AssistantAction,
  type AssistantAttachment,
  type AssistantChat,
  type AssistantRating,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import { SAMPLE_NOW } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chats"
import {
  ASSISTANT_CONNECTIONS,
  pickReplyScript,
  type AssistantReplyScript,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-replies"

// The chats and the reply that's running, with its timers. In your app,
// send the message to your API and dispatch what streams back instead of
// playing a script.

const THINKING_MS = 700
const BLOCKED_STEP_MS = 900
const CHUNK_MS = 40

type RunningReply = { chatId: string; replyId: string }

/** Runs things one after another, and forgets the rest when stopped. */
function createTimeline() {
  const timers: ReturnType<typeof setTimeout>[] = []
  let at = 0
  return {
    wait(ms: number) {
      at += ms
    },
    run(action: () => void) {
      timers.push(setTimeout(action, at))
    },
    stop() {
      for (const timer of timers) clearTimeout(timer)
    },
  }
}

type Timeline = ReturnType<typeof createTimeline>

export function useAssistantChats(initialChats: AssistantChat[]) {
  const [chats, setChats] = React.useState(initialChats)
  const [activeId, setActiveId] = React.useState<string | null>(
    initialChats[0]?.id ?? null
  )
  const running = React.useRef<RunningReply | null>(null)
  const timeline = React.useRef<Timeline | null>(null)
  const nextId = React.useRef(0)

  React.useEffect(() => () => timeline.current?.stop(), [])

  const createId = (prefix: string) => {
    nextId.current += 1
    return `${prefix}-${nextId.current}`
  }

  // The sample's clock moves a second per message. Use the real time.
  const getNow = () =>
    new Date(SAMPLE_NOW.getTime() + nextId.current * 1000).toISOString()

  const updateChat = (
    chatId: string,
    update: (chat: AssistantChat) => AssistantChat
  ) => {
    setChats((current) =>
      current.map((chat) => (chat.id === chatId ? update(chat) : chat))
    )
  }

  const dispatch = (chatId: string, action: AssistantAction) => {
    updateChat(chatId, (chat) => ({
      ...chat,
      messages: reduceAssistantMessages(chat.messages, action),
    }))
  }

  const stop = () => {
    timeline.current?.stop()
    if (!running.current) return
    const { chatId, replyId } = running.current
    dispatch(chatId, { type: "stop", replyId })
    running.current = null
  }

  /** One reply runs at a time: a new one stops the one running. */
  const begin = (reply: RunningReply) => {
    stop()
    const next = createTimeline()
    timeline.current = next
    running.current = reply
    return next
  }

  const streamText = (play: Timeline, reply: RunningReply, text: string) => {
    for (const chunk of splitIntoChunks(text)) {
      play.run(() =>
        dispatch(reply.chatId, { type: "text", replyId: reply.replyId, chunk })
      )
      play.wait(CHUNK_MS)
    }
  }

  const finish = (play: Timeline, reply: RunningReply) => {
    play.run(() => {
      dispatch(reply.chatId, { type: "finish", replyId: reply.replyId })
      running.current = null
    })
  }

  const playScript = (reply: RunningReply, script: AssistantReplyScript) => {
    const { chatId, replyId } = reply
    const play = begin(reply)
    play.wait(THINKING_MS)
    for (const { step, result } of script.steps) {
      const stepId = createId("step")
      play.run(() =>
        dispatch(chatId, {
          type: "step-start",
          replyId,
          step: { ...step, id: stepId, status: "running" },
        })
      )
      play.wait(result.seconds ? result.seconds * 1000 : BLOCKED_STEP_MS)
      play.run(() =>
        dispatch(chatId, { type: "step-end", replyId, stepId, ...result })
      )
    }
    if (script.steps.length > 0) play.wait(THINKING_MS)
    streamText(play, reply, script.text)
    const { artifact } = script
    if (artifact) {
      play.run(() => dispatch(chatId, { type: "artifact", replyId, artifact }))
    }
    finish(play, reply)
  }

  const send = (text: string, attachments: AssistantAttachment[]) => {
    const chatId = activeId ?? createId("chat")
    const reply = { chatId, replyId: createId("reply") }
    const updatedAt = getNow()
    if (!activeId) {
      const chat: AssistantChat = {
        id: chatId,
        title: getChatTitle(text || (attachments[0]?.name ?? "")),
        updatedAt,
        isPinned: false,
        messages: [],
      }
      setChats((current) => [chat, ...current])
      setActiveId(chatId)
    }
    updateChat(chatId, (chat) => ({ ...chat, updatedAt }))
    stop()
    dispatch(chatId, {
      type: "send",
      userId: createId("user"),
      replyId: reply.replyId,
      text,
      attachments,
    })
    playScript(reply, pickReplyScript(text, attachments))
  }

  /** Answers a reply's question again, in its place. */
  const retry = (replyId: string) => {
    const chat = chats.find((entry) => entry.id === activeId)
    if (!chat) return
    const question = getReplyQuestion(chat.messages, replyId)
    if (!question) return
    stop()
    dispatch(chat.id, { type: "restart", replyId })
    playScript(
      { chatId: chat.id, replyId },
      pickReplyScript(question.text, question.attachments)
    )
  }

  /** Signs in to the service a step needs, then picks the reply up again. */
  const connect = (replyId: string, stepId: string, service: string) => {
    const connection = ASSISTANT_CONNECTIONS[service]
    if (!activeId || !connection) return
    const reply = { chatId: activeId, replyId }
    const play = begin(reply)
    dispatch(activeId, { type: "step-resume", replyId, stepId })
    play.wait(connection.seconds * 1000)
    play.run(() =>
      dispatch(reply.chatId, {
        type: "step-end",
        replyId,
        stepId,
        status: "done",
        detail: connection.detail,
        seconds: connection.seconds,
      })
    )
    play.wait(THINKING_MS)
    streamText(play, reply, connection.text)
    finish(play, reply)
  }

  const rate = (replyId: string, rating: AssistantRating) => {
    if (activeId) dispatch(activeId, { type: "rate", replyId, rating })
  }

  const rename = (chatId: string, title: string) =>
    updateChat(chatId, (chat) => ({ ...chat, title }))

  const togglePin = (chatId: string) =>
    updateChat(chatId, (chat) => ({ ...chat, isPinned: !chat.isPinned }))

  const remove = (chatId: string) => {
    if (chatId === running.current?.chatId) stop()
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
    retry,
    connect,
    rate,
    rename,
    togglePin,
    remove,
  }
}
