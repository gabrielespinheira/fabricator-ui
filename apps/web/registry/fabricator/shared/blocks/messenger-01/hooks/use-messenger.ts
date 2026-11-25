"use client"

import * as React from "react"

import {
  INITIAL_STATE,
  SAMPLE_ARRIVAL,
  SAMPLE_NOW,
  SAMPLE_REPLIES,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-data"
import {
  formatFileSize,
  ME,
  messengerReducer,
  type ChatMessage,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"

// A stand-in for your backend: a message takes a moment to land, the other
// side reads it, types and answers. Replace it with your realtime subscription.
const DELIVER_AFTER = 500
const READ_AFTER = 1200
const TYPING_AFTER = 1900
const REPLY_AFTER = 3800
const ARRIVAL_AFTER = 20_000

/** The conversations, and what sending and receiving does to them. */
export function useMessenger({ isReading }: { isReading: boolean }) {
  const [state, dispatch] = React.useReducer(messengerReducer, INITIAL_STATE)
  const timers = React.useRef<number[]>([])
  const objectUrls = React.useRef<string[]>([])
  const replyTurns = React.useRef<Record<string, number>>({})
  const clockStart = React.useRef<number | null>(null)
  const isReadingRef = React.useRef(isReading)

  // The sample's clock starts at its "now" and runs in real time from there.
  const clock = React.useCallback(() => {
    clockStart.current ??= Date.now()
    return SAMPLE_NOW + (Date.now() - clockStart.current)
  }, [])

  const receive = React.useCallback(
    (id: string, reply: { senderId: string; text: string }) =>
      dispatch({
        type: "receive",
        id,
        isAway: !isReadingRef.current,
        message: {
          id: crypto.randomUUID(),
          senderId: reply.senderId,
          sentAt: clock(),
          body: { kind: "text", text: reply.text },
        },
      }),
    [clock]
  )

  React.useEffect(() => {
    isReadingRef.current = isReading
  }, [isReading])

  // What is on screen counts as read.
  const { openId } = state
  const hasUnread = state.conversations.some(
    ({ id, unreadCount, isMarkedUnread }) =>
      id === openId && unreadCount > 0 && !isMarkedUnread
  )
  React.useEffect(() => {
    if (isReading && hasUnread) dispatch({ type: "seen", id: openId })
  }, [isReading, hasUnread, openId])

  React.useEffect(() => {
    const pendingTimers = timers.current
    const urls = objectUrls.current
    const arrival = window.setTimeout(
      () => receive(SAMPLE_ARRIVAL.id, SAMPLE_ARRIVAL),
      ARRIVAL_AFTER
    )
    return () => {
      window.clearTimeout(arrival)
      for (const timer of pendingTimers) window.clearTimeout(timer)
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [receive])

  const later = (delay: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, delay))
  }

  /** Messages that were added as being sent: they land, or fail offline. */
  const transmit = (id: string, messageIds: string[]) => {
    const isOnline = navigator.onLine
    later(DELIVER_AFTER, () => {
      for (const messageId of messageIds)
        dispatch({ type: isOnline ? "deliver" : "fail", id, messageId })
    })
    const target = state.conversations.find((entry) => entry.id === id)
    const replies = SAMPLE_REPLIES[id] ?? []
    if (!isOnline || target?.isBlocked || replies.length === 0) return
    const turn = replyTurns.current[id] ?? 0
    replyTurns.current[id] = turn + 1
    const reply = replies[turn % replies.length]
    later(READ_AFTER, () =>
      dispatch({ type: "read", id, at: clock(), personId: reply.senderId })
    )
    later(TYPING_AFTER, () =>
      dispatch({ type: "typing", id, personId: reply.senderId })
    )
    later(REPLY_AFTER, () => receive(id, reply))
  }

  const send = (id: string, text: string, files: File[]) => {
    const bodies: ChatMessage["body"][] = files.map((file) => {
      if (!file.type.startsWith("image/"))
        return {
          kind: "file",
          name: file.name,
          size: formatFileSize(file.size),
        }
      const src = URL.createObjectURL(file)
      objectUrls.current.push(src)
      return { kind: "image", src, alt: file.name }
    })
    if (text) bodies.push({ kind: "text", text })
    const sent = bodies.map(
      (body): ChatMessage => ({
        id: crypto.randomUUID(),
        senderId: ME,
        sentAt: clock(),
        status: "sending",
        body,
      })
    )
    if (sent.length === 0) return
    for (const message of sent) dispatch({ type: "send", id, message })
    transmit(
      id,
      sent.map((message) => message.id)
    )
  }

  return { state, dispatch, clock, send, transmit }
}
