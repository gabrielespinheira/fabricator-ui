import { describe, expect, it } from "vitest"

import {
  attributeNativeLogs,
  judgeScreenCheck,
  parseNativeLog,
} from "../../../../../mobile/scripts/screen-check-report.mjs"
import {
  appendLogLine,
  formatLogArgs,
  getScreenCheckPaths,
  parseScreenCheckUrl,
} from "../../../../../mobile/src/screen-check/screen-check-model"

const REPORT = encodeURIComponent("http://localhost:4567")

describe("parseScreenCheckUrl", () => {
  it("reads where to report, for which device", () => {
    expect(
      parseScreenCheckUrl(
        `fabricator-ui://screen-check?report=${REPORT}&device=ABC-1`
      )
    ).toEqual({
      reportUrl: "http://localhost:4567",
      device: "ABC-1",
      scope: "all",
      settleMs: 1500,
    })
  })

  it("takes a scope and how long each screen settles", () => {
    expect(
      parseScreenCheckUrl(
        `fabricator-ui://screen-check?report=${REPORT}&device=A&scope=blocks&settle=3000`
      )
    ).toMatchObject({ scope: "blocks", settleMs: 3000 })
  })

  it("only reports to this machine", () => {
    const elsewhere = encodeURIComponent("https://example.com")
    expect(
      parseScreenCheckUrl(
        `fabricator-ui://screen-check?report=${elsewhere}&device=A`
      )
    ).toBeNull()
  })

  it("ignores other links and incomplete ones", () => {
    expect(parseScreenCheckUrl("fabricator-ui://components/button")).toBeNull()
    expect(
      parseScreenCheckUrl(`fabricator-ui://screen-check?report=${REPORT}`)
    ).toBeNull()
    expect(parseScreenCheckUrl(null)).toBeNull()
  })
})

describe("getScreenCheckPaths", () => {
  const names = { components: ["tabs", "button"], blocks: ["login-01"] }

  it("lists every demo, then every block, A to Z", () => {
    expect(getScreenCheckPaths({ ...names, scope: "all" })).toEqual([
      "/components/button",
      "/components/tabs",
      "/blocks/login-01",
    ])
  })

  it("keeps to a scope", () => {
    expect(getScreenCheckPaths({ ...names, scope: "blocks" })).toEqual([
      "/blocks/login-01",
    ])
  })
})

describe("appendLogLine", () => {
  it("adds a continuation to the message it belongs to", () => {
    expect(
      appendLogLine(
        "Failed to load <AVAsset>",
        '🟡     "assetProperty_Tracks",'
      )
    ).toEqual({
      done: null,
      pending: 'Failed to load <AVAsset>\n    "assetProperty_Tracks",',
    })
    expect(appendLogLine("Failed", "🟡 ), NSURL=…/a.mp4}").pending).toBe(
      "Failed\n), NSURL=…/a.mp4}"
    )
  })

  it("starts a new message on a line of its own, finishing the last", () => {
    expect(
      appendLogLine("Failed to load …/a.mp4", "🟡 Failed to load …/b.mp4")
    ).toEqual({
      done: "Failed to load …/a.mp4",
      pending: "Failed to load …/b.mp4",
    })
    expect(appendLogLine(null, "🔴 Boom")).toEqual({
      done: null,
      pending: "Boom",
    })
  })
})

describe("formatLogArgs", () => {
  it("joins what was logged into one line", () => {
    expect(formatLogArgs(["Failed:", new TypeError("x is undefined"), 3])).toBe(
      "Failed: TypeError: x is undefined 3"
    )
    expect(formatLogArgs([{ code: 1 }])).toBe('{"code":1}')
  })
})

const nativeLine = (fields: Record<string, string>) =>
  JSON.stringify({
    timestamp: "2026-11-10 14:00:01.500000+0000",
    subsystem: "com.facebook.react.log",
    category: "native",
    messageType: "Error",
    eventMessage: "UnimplementedView: native component 'X' is not registered.",
    ...fields,
  })

describe("parseNativeLog", () => {
  it("reads one entry of `log stream --style ndjson`", () => {
    expect(parseNativeLog(nativeLine({}))).toEqual({
      time: Date.parse("2026-11-10T14:00:01.500Z"),
      subsystem: "com.facebook.react.log",
      category: "native",
      level: "error",
      message: "UnimplementedView: native component 'X' is not registered.",
    })
  })

  it("skips what isn't an entry", () => {
    expect(parseNativeLog("Filtering the log data using …")).toBeNull()
    expect(parseNativeLog('{"count":1,"finished":1}')).toBeNull()
  })
})

type Log = { level: string; message: string }

const screen = (path: string, startedAt: number, logs: Log[] = []) => ({
  path,
  startedAt,
  endedAt: startedAt + 1000,
  logs,
})

describe("attributeNativeLogs", () => {
  it("files each entry under the screen on screen when it was logged", () => {
    const screens = [
      screen("/components/a", 1000),
      screen("/components/b", 2000),
    ]
    const entry = { time: 2500, level: "error", message: "boom" }
    expect(attributeNativeLogs(screens, [entry])).toEqual([
      { path: "/components/b", entry },
    ])
  })

  it("files what came before the first screen under the launch", () => {
    const entry = { time: 10, level: "error", message: "early" }
    expect(
      attributeNativeLogs([screen("/components/a", 1000)], [entry])
    ).toEqual([{ path: "launch", entry }])
  })
})

describe("judgeScreenCheck", () => {
  const device = (fields: object) => ({
    name: "iPhone",
    screens: [],
    native: [],
    ...fields,
  })

  it("fails on an error a screen logged", () => {
    const result = judgeScreenCheck({
      devices: [
        device({
          screens: [
            screen("/components/a", 0, [{ level: "error", message: "boom" }]),
          ],
        }),
      ],
    })
    expect(result.failures).toEqual([
      { device: "iPhone", path: "/components/a", message: "boom", count: 1 },
    ])
  })

  it("lists warnings without failing, unless strict", () => {
    const devices = [
      device({
        screens: [
          screen("/components/a", 0, [{ level: "warn", message: "careful" }]),
        ],
      }),
    ]
    expect(judgeScreenCheck({ devices }).failures).toEqual([])
    expect(judgeScreenCheck({ devices }).warnings).toHaveLength(1)
    expect(judgeScreenCheck({ devices, strict: true }).failures).toHaveLength(1)
  })

  it("counts a message a screen repeats once", () => {
    const logs = [
      { level: "error", message: "again" },
      { level: "error", message: "again" },
    ]
    const result = judgeScreenCheck({
      devices: [device({ screens: [screen("/components/a", 0, logs)] })],
    })
    expect(result.failures).toEqual([
      { device: "iPhone", path: "/components/a", message: "again", count: 2 },
    ])
  })

  it("groups messages that differ only by memory addresses, without the native logger's marker", () => {
    const logs = [
      { level: "warn", message: "🟡 Cannot open <AVAsset 0x171187ea0>" },
      { level: "warn", message: "🟡 Cannot open <AVAsset 0x143555320>" },
    ]
    const result = judgeScreenCheck({
      devices: [device({ screens: [screen("/components/a", 0, logs)] })],
    })
    expect(result.warnings).toEqual([
      {
        device: "iPhone",
        path: "/components/a",
        message: "Cannot open <AVAsset 0x…>",
        count: 2,
      },
    ])
  })

  it("fails on React Native's native errors, and leaves the system's alone", () => {
    const result = judgeScreenCheck({
      devices: [
        device({
          screens: [screen("/components/editor", 1000)],
          native: [
            {
              time: 1500,
              subsystem: "com.facebook.react.log",
              category: "native",
              level: "error",
              message: "not registered",
            },
            {
              time: 1500,
              subsystem: "com.apple.coremedia",
              category: "player",
              level: "error",
              message: "err=-12864",
            },
            {
              // The app saw it too: it's in the screen's own logs.
              time: 1500,
              subsystem: "com.facebook.react.log",
              category: "javascript",
              level: "error",
              message: "TypeError",
            },
          ],
        }),
      ],
    })
    expect(result.failures).toEqual([
      {
        device: "iPhone",
        path: "/components/editor",
        message: "not registered",
        count: 1,
      },
    ])
  })

  it("leaves out what a demo shows on purpose", () => {
    const result = judgeScreenCheck({
      devices: [
        device({
          screens: [
            screen("/components/video-player", 0, [
              {
                level: "warn",
                message: "Failed to load tracks for …/missing-video.mp4",
              },
            ]),
          ],
        }),
      ],
      strict: true,
    })
    expect(result.failures).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it("fails when a device stopped reporting", () => {
    const result = judgeScreenCheck({
      devices: [
        device({
          stopped: { path: "/components/b", reason: "no report for 30s" },
        }),
      ],
    })
    expect(result.failures).toEqual([
      {
        device: "iPhone",
        path: "/components/b",
        message: "no report for 30s",
        count: 1,
      },
    ])
  })
})
