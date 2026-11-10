// Chat Input's React Native rules: the return key, the mention tints, the
// voice glow's colours and how far the composer rides the keyboard. The rules
// it shares with the website are in chat-input-model.

import type { ChatInputSubmitKey } from "@/registry/fabricator/shared/lib/chat-input-model"

/**
 * What the on-screen keyboard's return key does: it sends while Enter sends,
 * and adds a line when only Cmd or Ctrl+Enter would, as on the website.
 */
function getChatInputReturnKey(submitOn: ChatInputSubmitKey) {
  return submitOn === "enter"
    ? { returnKeyType: "send" as const, submitBehavior: "submit" as const }
    : { returnKeyType: "default" as const, submitBehavior: "newline" as const }
}

type ChatInputMentionTone = "file" | "skill" | "artifact" | "card" | "other"

const MENTION_TONES: Partial<Record<string, ChatInputMentionTone>> = {
  "@": "file",
  "/": "skill",
  $: "artifact",
  "#": "card",
}

/** The tint a mention takes, by its sigil: the website's `data-sigil` rules. */
function getChatInputMentionTone(sigil: string | undefined) {
  return (sigil && MENTION_TONES[sigil]) || "other"
}

/** A `#rrggbb` colour at `alpha`, as `#rrggbbaa`; undefined for anything else. */
function withChatInputAlpha(color: string | undefined, alpha: number) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return undefined
  const channel = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
  return `${color}${channel.toString(16).padStart(2, "0")}`
}

/** voice-glow's palettes, by name. */
type ChatInputVoiceColor =
  | "colorful"
  | "mono"
  | "ocean"
  | "sunset"
  | "forest"
  | "candy"
  | "ice"
  | "gold"

type ChatInputGlowRole =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "foreground"

// The website's glow comes from voice-glow's own palettes; here each takes
// the colour roles nearest it, so a retinted theme retints the glow too.
const GLOW_ROLES: Record<
  ChatInputVoiceColor,
  readonly [ChatInputGlowRole, ChatInputGlowRole, ChatInputGlowRole]
> = {
  colorful: ["primary", "info", "destructive"],
  mono: ["foreground", "foreground", "foreground"],
  ocean: ["info", "info", "success"],
  sunset: ["warning", "destructive", "primary"],
  forest: ["success", "success", "info"],
  candy: ["destructive", "primary", "info"],
  ice: ["info", "foreground", "info"],
  gold: ["warning", "warning", "success"],
}

/** The glow's three lobes, the centre first, as colour roles. */
function getChatInputGlowRoles(variant: ChatInputVoiceColor) {
  return [...GLOW_ROLES[variant]]
}

/**
 * The keyboard's open offset for a composer `distanceToBottom` above the
 * window's bottom edge: the keyboard's height already covers that distance,
 * and the composer stops `gap` above the keyboard.
 */
function getChatInputKeyboardOffset({
  distanceToBottom,
  gap,
}: {
  distanceToBottom: number
  gap: number
}) {
  return Math.max(0, distanceToBottom) - gap
}

export {
  getChatInputGlowRoles,
  getChatInputKeyboardOffset,
  getChatInputMentionTone,
  getChatInputReturnKey,
  withChatInputAlpha,
  type ChatInputGlowRole,
  type ChatInputMentionTone,
  type ChatInputVoiceColor,
}
