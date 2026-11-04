// The App Shell preview on /create is a real app in an iframe, so its collapse,
// peek, window and phone layouts behave as they do in a project. The page tells
// it the options; the look and the theme reach it through the site settings.

import { createLoader, createSerializer } from "nuqs/server"
import { z } from "zod"

import {
  playgroundParsers,
  type PlaygroundOptions,
} from "@/app/(view)/app-shell/_lib/options"

export const SHELL_PREVIEW_PATH = "/create/preview"

const serializeOptions = createSerializer(playgroundParsers)
const loadOptions = createLoader(playgroundParsers)

/** The options as a query: only what differs from the defaults. */
export function getShellPreviewQuery(options: PlaygroundOptions) {
  return serializeOptions(options)
}

/** Reads a query; anything unknown keeps its default. */
export function loadShellPreviewOptions(query: string) {
  return loadOptions(new URLSearchParams(query))
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
