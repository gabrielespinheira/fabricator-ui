import { describe, expect, it } from "vitest"

import {
  createBotFaceSession,
  getBotFaceState,
  updateBotFaceSession,
  type BotFaceSessionSnapshot,
} from "./bot-face-session"

function snapshot(
  revision: number,
  fields: Partial<BotFaceSessionSnapshot> = {}
): BotFaceSessionSnapshot {
  return {
    sessionId: "conversation",
    runId: "run-1",
    revision,
    lifecycle: "running",
    activity: "working",
    pendingPermissions: 0,
    pendingQuestions: 0,
    ...fields,
  }
}

describe("agent session mapping", () => {
  it("prioritizes manual permissions and questions over concurrent work", () => {
    expect(
      getBotFaceState(
        snapshot(1, { pendingPermissions: 2, pendingQuestions: 1 })
      )
    ).toBe("awaiting-permission")
    expect(getBotFaceState(snapshot(2, { pendingPermissions: 1 }))).toBe(
      "awaiting-permission"
    )
    expect(getBotFaceState(snapshot(3, { pendingQuestions: 1 }))).toBe(
      "questioning"
    )
    expect(getBotFaceState(snapshot(4))).toBe("working")
  })
  it("uses explicit outcomes, never infers success from idle or cancellation", () => {
    expect(getBotFaceState(snapshot(1, { activity: "idle" }))).toBe("idle")
    expect(
      getBotFaceState(
        snapshot(2, { lifecycle: "cancelled", pendingPermissions: 1 })
      )
    ).toBe("idle")
    expect(
      getBotFaceState(
        snapshot(3, { lifecycle: "failed", pendingPermissions: 1 })
      )
    ).toBe("error")
    expect(getBotFaceState(snapshot(4, { lifecycle: "succeeded" }))).toBe(
      "happy"
    )
  })
  it("requires actual audio activity to show speaking", () => {
    expect(getBotFaceState(snapshot(1, { activity: "speaking" }))).toBe(
      "speaking"
    )
    expect(getBotFaceState(snapshot(2, { activity: "thinking" }))).toBe(
      "thinking"
    )
    expect(getBotFaceState(snapshot(3, { activity: "listening" }))).toBe(
      "listening"
    )
  })
})

describe("session presentation", () => {
  it("suppresses short idle gaps and coalesces busy changes without starving on token updates", () => {
    let session = createBotFaceSession(snapshot(1), 0)
    session = updateBotFaceSession(
      session,
      snapshot(2, { activity: "idle" }),
      100
    )
    expect(session.state).toBe("working")
    session = updateBotFaceSession(session, snapshot(3), 200)
    expect(session.state).toBe("working")
    session = updateBotFaceSession(
      session,
      snapshot(4, { activity: "thinking" }),
      210
    )
    session = updateBotFaceSession(
      session,
      snapshot(5, { activity: "thinking" }),
      300
    )
    session = updateBotFaceSession(
      session,
      snapshot(6, { activity: "thinking" }),
      460
    )
    expect(session.state).toBe("thinking")
  })
  it("shows blockers immediately and cancels old pending poses", () => {
    let session = createBotFaceSession(snapshot(1), 0)
    session = updateBotFaceSession(
      session,
      snapshot(2, { activity: "idle" }),
      10
    )
    session = updateBotFaceSession(
      session,
      snapshot(3, { pendingPermissions: 1 }),
      20
    )
    expect(session.state).toBe("awaiting-permission")
    session = updateBotFaceSession(session, snapshot(4), 30)
    expect(session.state).toBe("working")
  })
  it("acknowledges completion once and lets a new run interrupt it", () => {
    const success = snapshot(2, { lifecycle: "succeeded" })
    let session = createBotFaceSession(snapshot(1), 0)
    session = updateBotFaceSession(session, success, 100)
    expect(session.state).toBe("happy")
    session = updateBotFaceSession(session, success, 850)
    expect(session.state).toBe("idle")
    session = updateBotFaceSession(
      session,
      snapshot(3, { lifecycle: "succeeded" }),
      900
    )
    expect(session.state).toBe("idle")
    session = updateBotFaceSession(
      session,
      snapshot(4, { runId: "run-2" }),
      910
    )
    expect(session.state).toBe("working")
    session = updateBotFaceSession(
      session,
      snapshot(2, { lifecycle: "succeeded" }),
      920
    )
    expect(session.state).toBe("working")
  })
  it("ignores stale revisions and resets pending timers on a deliberate session switch", () => {
    let session = createBotFaceSession(snapshot(5), 0)
    session = updateBotFaceSession(
      session,
      snapshot(4, { lifecycle: "failed" }),
      10
    )
    expect(session.state).toBe("working")
    session = updateBotFaceSession(
      session,
      snapshot(1, { sessionId: "other", activity: "listening" }),
      20
    )
    expect(session.state).toBe("listening")
    expect(session.deadline).toBeNull()
  })
})
