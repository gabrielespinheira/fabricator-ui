import type { BotFaceState } from "./bot-face-motion"

export type BotFaceSessionSnapshot = {
  /** Revisions increase across runs within this conversation. */
  sessionId: string
  runId: string
  revision: number
  lifecycle:
    | "idle"
    | "running"
    | "paused"
    | "cancelled"
    | "failed"
    | "succeeded"
  activity: "idle" | "thinking" | "working" | "listening" | "speaking"
  /** Only unresolved requests requiring a person's action. */
  pendingPermissions: number
  pendingQuestions: number
}

export type BotFaceSession = {
  snapshot: BotFaceSessionSnapshot
  state: BotFaceState
  pending: BotFaceState | null
  deadline: number | null
  acknowledgedRun: string | null
}

const ACTIVITY_HOLD = 250
const COMPLETION_HOLD = 750

export function getBotFaceState(
  snapshot: BotFaceSessionSnapshot
): BotFaceState {
  if (snapshot.lifecycle === "failed") return "error"
  if (
    snapshot.lifecycle === "cancelled" ||
    snapshot.lifecycle === "paused" ||
    snapshot.lifecycle === "idle"
  )
    return "idle"
  if (snapshot.lifecycle === "succeeded") return "happy"
  if (snapshot.pendingPermissions > 0) return "awaiting-permission"
  if (snapshot.pendingQuestions > 0) return "questioning"
  return snapshot.activity
}

export function createBotFaceSession(
  snapshot: BotFaceSessionSnapshot,
  now: number
): BotFaceSession {
  const state = getBotFaceState(snapshot)
  return {
    snapshot,
    state,
    pending: null,
    deadline: state === "happy" ? now + COMPLETION_HOLD : null,
    acknowledgedRun: state === "happy" ? snapshot.runId : null,
  }
}

function isBusy(state: BotFaceState) {
  return (
    state === "thinking" ||
    state === "working" ||
    state === "speaking" ||
    state === "listening"
  )
}

/** Pure presentation policy; stale transport events cannot resurrect a run. */
export function updateBotFaceSession(
  previous: BotFaceSession,
  snapshot: BotFaceSessionSnapshot,
  now: number
): BotFaceSession {
  if (snapshot.sessionId !== previous.snapshot.sessionId)
    return createBotFaceSession(snapshot, now)
  if (snapshot.revision < previous.snapshot.revision) return previous
  // Equal revisions advance presentation time, but cannot replace the snapshot.
  const accepted =
    snapshot.revision === previous.snapshot.revision
      ? previous.snapshot
      : snapshot
  const changedRun = accepted.runId !== previous.snapshot.runId
  let target = getBotFaceState(accepted)
  if (target === "happy" && previous.acknowledgedRun === accepted.runId) {
    target =
      previous.state === "happy" &&
      previous.deadline !== null &&
      now < previous.deadline
        ? "happy"
        : "idle"
  }
  const session = { ...previous, snapshot: accepted }
  if (target === previous.state && !changedRun) {
    return {
      ...session,
      pending: null,
      deadline: target === "happy" ? previous.deadline : null,
    }
  }
  if (
    !changedRun &&
    isBusy(previous.state) &&
    ((target === "idle" && accepted.lifecycle === "running") || isBusy(target))
  ) {
    const deadline = previous.deadline ?? now + ACTIVITY_HOLD
    if (now < deadline) return { ...session, pending: target, deadline }
  }
  return {
    ...session,
    state: target,
    pending: null,
    deadline: target === "happy" ? now + COMPLETION_HOLD : null,
    acknowledgedRun:
      target === "happy" ? accepted.runId : previous.acknowledgedRun,
  }
}
