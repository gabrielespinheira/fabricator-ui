// The App Shell preview on /create is a real app in an iframe, so its collapse,
// peek, window and phone layouts behave as they do in a project. The page tells
// it the options; the look and the theme reach it through the site settings.

import {
  createLoader,
  createSerializer,
  parseAsBoolean,
  parseAsStringLiteral,
} from "nuqs/server"
import { z } from "zod"

import {
  playgroundParsers,
  type PlaygroundOptions,
  type PreviewSize,
} from "@/app/(view)/app-shell/_lib/options"

export const SHELL_PREVIEW_PATH = "/create/preview"

/**
 * The options, the runtime the preview draws a window for, and whether its tab
 * bar stands for a React Native app's, which has styles the web's doesn't.
 */
export const shellPreviewParsers = {
  ...playgroundParsers,
  desktop: parseAsStringLiteral(["electron", "tauri"] as const),
  nativeTabBar: parseAsBoolean.withDefault(false),
}

const serializeOptions = createSerializer(shellPreviewParsers)
const loadOptions = createLoader(shellPreviewParsers)

/** The options as a query: only what differs from the defaults. */
export function getShellPreviewQuery(
  options: PlaygroundOptions,
  desktop: "electron" | "tauri" | null = null,
  nativeTabBar = false
) {
  return serializeOptions({ ...options, desktop, nativeTabBar })
}

/** Reads a query; anything unknown keeps its default. */
export function loadShellPreviewOptions(query: string) {
  return loadOptions(new URLSearchParams(query))
}

type Size = { width: number; height: number }

// A window keeps this much of the stage around it, for its shadow.
const WINDOW_MARGIN = 12
// Narrower than this, a desktop app's window draws as it never does in practice.
const WINDOW_MIN_WIDTH = 1100

// A 390 by 844 phone, with its bezel.
const PHONE_FRAME = { width: 410, height: 864 }

/**
 * The size to draw a preview at, and how far to scale it into the stage, so the
 * shell lays out as it does at that size rather than at the column's width.
 */
export function getPreviewLayout(
  size: PreviewSize,
  stage: Size
): { frame: Size; scale: number } {
  if (size === "browser") return { frame: stage, scale: 1 }
  if (size === "phone") {
    const frame = PHONE_FRAME
    if (stage.width === 0) return { frame, scale: 1 }
    return {
      frame,
      scale: Math.min(
        1,
        stage.width / frame.width,
        stage.height / frame.height
      ),
    }
  }
  const room = {
    width: Math.max(stage.width - 2 * WINDOW_MARGIN, 0),
    height: Math.max(stage.height - 2 * WINDOW_MARGIN, 0),
  }
  const scale =
    room.width === 0 ? 1 : Math.min(1, room.width / WINDOW_MIN_WIDTH)
  return {
    frame: { width: room.width / scale, height: room.height / scale },
    scale,
  }
}

export const SHELL_PREVIEW_READY = { type: "fabricator:shell-preview-ready" }

const readyMessage = z.object({ type: z.literal(SHELL_PREVIEW_READY.type) })

const optionsMessage = z.object({
  type: z.literal("fabricator:shell-options"),
  query: z.string(),
})

export function createShellOptionsMessage(
  query: string
): z.infer<typeof optionsMessage> {
  return { type: "fabricator:shell-options", query }
}

/** The query in a message from the page, or null for any other message. */
export function readShellOptionsMessage(data: unknown) {
  const message = optionsMessage.safeParse(data)
  return message.success ? message.data.query : null
}

export function isShellPreviewReady(data: unknown) {
  return readyMessage.safeParse(data).success
}
