"use client"

import * as React from "react"

import {
  createBotFaceSession,
  updateBotFaceSession,
  type BotFaceSessionSnapshot,
} from "@/registry/bases/__base__/lib/bot-face-session"

/** Maps session facts to a stable expression; the caller owns SDK/transport I/O. */
function useBotFaceState(snapshot: BotFaceSessionSnapshot) {
  const [session, setSession] = React.useState(() =>
    createBotFaceSession(snapshot, Date.now())
  )
  const {
    sessionId,
    runId,
    revision,
    lifecycle,
    activity,
    pendingPermissions,
    pendingQuestions,
  } = snapshot
  React.useEffect(() => {
    const next = {
      sessionId,
      runId,
      revision,
      lifecycle,
      activity,
      pendingPermissions,
      pendingQuestions,
    }
    setSession((previous) => updateBotFaceSession(previous, next, Date.now()))
  }, [
    sessionId,
    runId,
    revision,
    lifecycle,
    activity,
    pendingPermissions,
    pendingQuestions,
  ])
  React.useEffect(() => {
    if (session.deadline === null) return
    const timer = setTimeout(
      () => {
        setSession((previous) =>
          updateBotFaceSession(previous, previous.snapshot, Date.now())
        )
      },
      Math.max(0, session.deadline - Date.now())
    )
    return () => clearTimeout(timer)
  }, [session.deadline])
  return session.state
}

export { useBotFaceState, type BotFaceSessionSnapshot }
