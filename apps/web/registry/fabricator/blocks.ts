import { type Registry } from "shadcn/schema"

// Fabricator's screen blocks: whole pages people install and adapt. Sources
// live in registry/fabricator/shared/blocks/<name>/ (per-base parts under
// registry/fabricator/<base>/blocks/<name>/). Component and lib file names
// carry the block's subject so two blocks never install the same path.

type BlockDeclaration = {
  name: string
  title: string
  description: string
  categories: string[]
  /** The route the page installs to, e.g. "app/sign-in/page.tsx". */
  target: string
  registryDependencies: string[]
  dependencies?: string[]
  /** Paths under blocks/<name>/, e.g. "components/sign-in-form.tsx". */
  files: string[]
  /** Items only one base needs, e.g. its toast (see Event Calendar). */
  baseRegistryDependencies?: Record<"base" | "radix" | "aria", string[]>
}

const FILE_TYPES = {
  components: "registry:component",
  lib: "registry:lib",
  hooks: "registry:hook",
} as const

function isFileFolder(folder: string): folder is keyof typeof FILE_TYPES {
  return folder in FILE_TYPES
}

function toFile(name: string, filePath: string) {
  const [folder] = filePath.split("/")
  if (!isFileFolder(folder)) {
    throw new Error(
      `${name}: ${filePath} is not in components/, lib/ or hooks/`
    )
  }
  return { path: `blocks/${name}/${filePath}`, type: FILE_TYPES[folder] }
}

function toBlock({
  target,
  files,
  baseRegistryDependencies,
  ...block
}: BlockDeclaration) {
  return {
    ...block,
    type: "registry:block" as const,
    files: [
      {
        path: `blocks/${block.name}/page.tsx`,
        type: "registry:page" as const,
        target,
      },
      ...files.map((filePath) => toFile(block.name, filePath)),
    ],
    meta: {
      fabricator: true,
      ...(baseRegistryDependencies && { baseRegistryDependencies }),
    },
  }
}

export const fabricatorBlocks = [
  {
    name: "sign-in-01",
    title: "Sign in",
    description:
      "A sign-in page: company providers, email and password with a show toggle, errors in the form and a link to sign up.",
    categories: ["authentication"],
    target: "app/sign-in/page.tsx",
    registryDependencies: [
      "button",
      "field",
      "input",
      "input-group",
      "alert",
      "spinner",
    ],
    dependencies: ["@fabricator-ui/icons"],
    files: [
      "components/sign-in-form.tsx",
      "components/sign-in-providers.tsx",
      "lib/sign-in-form-model.ts",
    ],
  },
  {
    name: "sign-up-01",
    title: "Sign up",
    description:
      "A sign-up page: company providers, name, work email and a password rule that updates as you type, then a check-your-email screen.",
    categories: ["authentication"],
    target: "app/sign-up/page.tsx",
    registryDependencies: [
      "button",
      "field",
      "input",
      "input-group",
      "alert",
      "spinner",
    ],
    dependencies: ["@fabricator-ui/icons"],
    files: [
      "components/sign-up-form.tsx",
      "components/sign-up-providers.tsx",
      "components/sign-up-check-email.tsx",
      "lib/sign-up-form-model.ts",
    ],
  },
  {
    name: "forgot-password-01",
    title: "Forgot password",
    description:
      "A password reset in three steps: the email, a six-digit code, a new password, then a way back to sign in.",
    categories: ["authentication"],
    target: "app/forgot-password/page.tsx",
    registryDependencies: [
      "button",
      "field",
      "input",
      "input-group",
      "input-otp",
      "alert",
      "spinner",
    ],
    files: [
      "components/forgot-password-flow.tsx",
      "lib/forgot-password-model.ts",
    ],
  },
  {
    name: "finance-01",
    title: "Finance dashboard",
    description:
      "A business banking home: balances and runway, cash over time against the last period, approvals that need you, accounts, spending by category and recent transactions.",
    categories: ["dashboard"],
    target: "app/dashboard/page.tsx",
    registryDependencies: [
      "app-shell",
      "app-nav",
      "workspace-switcher",
      "user-menu",
      "sidebar",
      "dropdown-menu",
      "toggle-group",
      "tooltip",
      "button",
      "spinner",
      "card",
      "badge",
      "avatar",
      "item",
      "empty",
      "progress",
      "table",
      "alert",
      "line-chart",
      "bar-chart",
    ],
    dependencies: ["@fabricator-ui/icons"],
    files: [
      "components/finance-accounts-card.tsx",
      "components/finance-approvals-card.tsx",
      "components/finance-card-link.tsx",
      "components/finance-cash-card.tsx",
      "components/finance-controls.tsx",
      "components/finance-counterparty.tsx",
      "components/finance-delta.tsx",
      "components/finance-kpi-row.tsx",
      "components/finance-sidebar.tsx",
      "components/finance-spending-card.tsx",
      "components/finance-transaction-table-header.tsx",
      "components/finance-transactions-card.tsx",
      "lib/finance-data.ts",
      "lib/finance-model.ts",
    ],
  },
  {
    name: "assistant-01",
    title: "AI assistant",
    description:
      "An AI chat: past chats in the sidebar, a transcript with streamed replies and tool calls, and a composer with a model picker.",
    categories: ["chat"],
    target: "app/chat/page.tsx",
    registryDependencies: [
      "app-shell",
      "app-nav",
      "user-menu",
      "message-scroller",
      "message",
      "bubble",
      "attachment",
      "marker",
      "markdown",
      "chat-input",
      "model-picker",
      "bot-face",
      "syntax-highlight",
      "collapsible",
      "popover",
      "dropdown-menu",
      "dialog",
      "alert-dialog",
      "field",
      "input",
      "button",
      "spinner",
      "fluid-hover",
    ],
    dependencies: ["@fabricator-ui/icons"],
    files: [
      "components/assistant-chat-dialogs.tsx",
      "components/assistant-chat-menu.tsx",
      "components/assistant-composer.tsx",
      "components/assistant-message.tsx",
      "components/assistant-model-picker.tsx",
      "components/assistant-new-chat.tsx",
      "components/assistant-sidebar.tsx",
      "components/assistant-tool-call.tsx",
      "components/assistant-transcript.tsx",
      "hooks/use-assistant-chats.ts",
      "lib/assistant-chat-model.ts",
      "lib/assistant-chats.ts",
      "lib/assistant-models.ts",
      "lib/assistant-replies.ts",
    ],
  },
  {
    name: "messenger-01",
    title: "Messenger",
    description:
      "A messaging app: conversations beside the app's navigation, a transcript grouped by sender and day with photos, files, voice messages and reactions, and a details panel. On phones the list comes first.",
    categories: ["chat"],
    target: "app/messages/page.tsx",
    registryDependencies: [
      "app-shell",
      "app-nav",
      "user-menu",
      "sidebar",
      "fluid-hover",
      "search",
      "item",
      "avatar",
      "badge",
      "button",
      "empty",
      "field",
      "switch",
      "tooltip",
      "dropdown-menu",
      "alert-dialog",
      "message-scroller",
      "message",
      "bubble",
      "marker",
      "attachment",
      "aspect-ratio",
      "audio-player",
      "chat-input",
    ],
    dependencies: ["@fabricator-ui/icons"],
    files: [
      "components/messenger-avatar.tsx",
      "components/messenger-composer.tsx",
      "components/messenger-controls.tsx",
      "components/messenger-conversation-header.tsx",
      "components/messenger-conversation-list.tsx",
      "components/messenger-details.tsx",
      "components/messenger-message-body.tsx",
      "components/messenger-transcript.tsx",
      "lib/messenger-data.ts",
      "lib/messenger-model.ts",
    ],
  },
  {
    name: "mail-01",
    title: "Mail",
    description:
      "An email app: folders and labels, an inbox to search, select and work through, a thread with replies and attachments beside it, and a compose sheet.",
    categories: ["mail"],
    target: "app/mail/page.tsx",
    registryDependencies: [
      "app-shell",
      "app-nav",
      "workspace-switcher",
      "user-menu",
      "sidebar",
      "fluid-hover",
      "search",
      "avatar",
      "badge",
      "button",
      "checkbox",
      "toggle",
      "toggle-group",
      "tooltip",
      "dropdown-menu",
      "empty",
      "attachment",
      "sheet",
      "field",
      "input",
      "textarea",
      "multi-select",
      "file-upload",
    ],
    dependencies: ["@fabricator-ui/icons"],
    baseRegistryDependencies: {
      base: ["toast"],
      radix: ["sonner"],
      aria: ["sonner"],
    },
    files: [
      "components/mail-avatar.tsx",
      "components/mail-compose.tsx",
      "components/mail-controls.tsx",
      "components/mail-list-toolbar.tsx",
      "components/mail-reply-box.tsx",
      "components/mail-sidebar.tsx",
      "components/mail-thread-list.tsx",
      "components/mail-thread-view.tsx",
      "lib/mail-data.ts",
      "lib/mail-model.ts",
    ],
  },
  {
    name: "calendar-app-01",
    title: "Calendar",
    description:
      "A calendar app: a month to jump from, calendars to show or hide, the week in an event calendar and an event's details beside it.",
    categories: ["calendar"],
    target: "app/calendar/page.tsx",
    registryDependencies: [
      "app-shell",
      "event-calendar",
      "sidebar",
      "user-menu",
      "avatar",
      "button",
      "dropdown-menu",
      "empty",
      "item",
      "toggle-group",
    ],
    files: [
      "components/calendar-app-event-chip.tsx",
      "components/calendar-app-event-panel.tsx",
      "components/calendar-app-rsvp.tsx",
      "components/calendar-app-sidebar.tsx",
      "lib/calendar-app-events.ts",
      "lib/calendar-app-model.ts",
    ],
  },
].map(toBlock) satisfies Registry["items"]
