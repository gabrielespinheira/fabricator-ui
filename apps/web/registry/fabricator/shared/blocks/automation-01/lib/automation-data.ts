// The automation block's sample workflow: support tickets come in, an agent
// reads them, and a router sends each down its own lane. Replace with your
// workflows, loaded and saved through your backend.

import {
  getFlowHandles,
  type AutomationChoices,
  type AutomationStepData,
} from "@/registry/bases/__base__/blocks/automation-01/lib/automation-model"
import {
  type CanvasEdge,
  type CanvasNode,
} from "@/registry/bases/__base__/lib/canvas-model"
import { type PaletteColorName } from "@/registry/bases/__base__/lib/palette-model"

export const AUTOMATION_NAME = "Support triage"

export const AUTOMATION_ACCOUNT = {
  name: "Maya Chen",
  email: "maya@acme.com",
  avatarUrl:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&auto=format&q=80",
}

/** The open workflow's numbers, from your run history. */
export const AUTOMATION_STATS = [
  { label: "Runs this week", value: "1,284" },
  { label: "Success rate", value: "98.6%" },
]

export const AUTOMATION_WORKFLOWS = [
  { id: "support-triage", name: "Support triage", runs: 1284 },
  { id: "lead-routing", name: "Lead routing", runs: 412 },
  { id: "invoice-reminders", name: "Invoice reminders", runs: 96 },
  { id: "weekly-digest", name: "Weekly digest", runs: 12 },
]

/** The ticket a test run uses, and the routes it takes. */
export const AUTOMATION_SAMPLE: { title: string; choices: AutomationChoices } =
  {
    title: "Charged twice for March",
    choices: { "route-topic": "billing", "under-limit": "yes" },
  }

// Each kind of step has its colour, so lanes read at a glance.
const COLORS: Record<AutomationStepData["kind"], PaletteColorName> = {
  trigger: "blue",
  action: "teal",
  agent: "purple",
  resource: "purple",
  router: "orange",
  condition: "orange",
  wait: "yellow",
}

const COLUMN = 300

function step(
  id: string,
  x: number,
  y: number,
  data: AutomationStepData,
  extra: Partial<CanvasNode> = {}
): CanvasNode {
  return {
    id,
    type: data.kind === "resource" ? "resource" : "step",
    position: { x, y },
    color: COLORS[data.kind],
    data,
    ...extra,
  }
}

// The billing lane sits in a group; its steps are placed inside it.
const IN_BILLING = { parentId: "billing" }

export const AUTOMATION_NODES: CanvasNode[] = [
  {
    id: "billing",
    type: "group",
    position: { x: 4 * COLUMN - 24, y: -340 },
    width: 4 * COLUMN + 8,
    height: 372,
    data: { label: "Billing" },
  },
  step("new-ticket", 0, 120, {
    title: "New ticket",
    description: "Runs when a customer writes to support.",
    kind: "trigger",
    icon: "webhook",
    app: "Help desk",
    settings: [
      { label: "Inbox", value: "support@acme.com" },
      { label: "Channels", value: "Email, chat" },
    ],
    sample: { durationMs: 40, output: "Ticket #4821 from Lena Ortiz" },
  }),
  step("find-customer", COLUMN, 120, {
    title: "Find customer",
    description: "Looks up the sender's plan, spend and open tickets.",
    kind: "action",
    icon: "user",
    app: "CRM",
    settings: [
      { label: "Match on", value: "Email" },
      { label: "If missing", value: "Create a contact" },
    ],
    sample: { durationMs: 320, output: "Pro plan · $2,140 lifetime" },
  }),
  step("classify", 2 * COLUMN, 104, {
    title: "Classify ticket",
    description: "Reads the ticket and labels its topic, urgency and mood.",
    kind: "agent",
    icon: "agent",
    app: "AI agent",
    settings: [
      { label: "Labels", value: "Topic, urgency, sentiment" },
      { label: "Confidence", value: "At least 80%" },
    ],
    sample: { durationMs: 2100, output: "Billing · high urgency · upset" },
  }),
  step("model", 430, 340, {
    title: "Language model",
    description: "Fast model for labelling.",
    kind: "resource",
    resource: "model",
    icon: "model",
    app: "Model",
    settings: [{ label: "Temperature", value: "0.2" }],
    sample: { durationMs: 0, output: "1,204 tokens" },
  }),
  step("memory", 632, 380, {
    title: "Ticket memory",
    description: "The customer's last 10 tickets.",
    kind: "resource",
    resource: "memory",
    icon: "memory",
    app: "Memory",
    settings: [{ label: "Window", value: "10 tickets" }],
    sample: { durationMs: 0, output: "3 earlier tickets" },
  }),
  step("help-center", 834, 340, {
    title: "Help center",
    description: "Finds articles that answer the ticket.",
    kind: "resource",
    resource: "tool",
    icon: "search",
    app: "Tool",
    settings: [{ label: "Collection", value: "Public articles" }],
    sample: { durationMs: 0, output: "2 articles" },
  }),
  step("route-topic", 3 * COLUMN, 96, {
    title: "Route by topic",
    description: "Sends each ticket down its lane.",
    kind: "router",
    icon: "router",
    app: "Router",
    routes: [
      { id: "billing", label: "Billing" },
      { id: "bug", label: "Bug report" },
      { id: "question", label: "Question" },
      { id: "other", label: "Anything else" },
    ],
    settings: [{ label: "Route on", value: "Topic label" }],
    sample: { durationMs: 10, output: "Billing" },
  }),
  step(
    "find-invoice",
    24,
    64,
    {
      title: "Find invoice",
      description: "Finds the charge the customer wrote about.",
      kind: "action",
      icon: "receipt",
      app: "Payments",
      settings: [
        { label: "Customer", value: "From Find customer" },
        { label: "Within", value: "Last 90 days" },
      ],
      sample: { durationMs: 540, output: "INV-2291 · $39.00 · paid twice" },
    },
    IN_BILLING
  ),
  step(
    "under-limit",
    COLUMN + 24,
    64,
    {
      title: "Under $50?",
      description: "Small refunds go out without a person.",
      kind: "condition",
      icon: "condition",
      app: "Condition",
      routes: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      settings: [{ label: "When", value: "Amount is under $50" }],
      sample: { durationMs: 5, output: "Yes" },
    },
    IN_BILLING
  ),
  step(
    "refund-payment",
    2 * COLUMN + 24,
    24,
    {
      title: "Refund payment",
      description: "Refunds the duplicate charge to the card.",
      kind: "action",
      icon: "card",
      app: "Payments",
      settings: [
        { label: "Amount", value: "Full charge" },
        { label: "Reason", value: "Duplicate" },
      ],
      sample: { durationMs: 880, output: "Refund re_3Pq · $39.00" },
    },
    IN_BILLING
  ),
  step(
    "reply-refund",
    3 * COLUMN + 24,
    24,
    {
      title: "Reply with refund",
      description: "Tells the customer the money is on its way.",
      kind: "action",
      icon: "mail",
      app: "Email",
      settings: [
        { label: "Template", value: "Refund issued" },
        { label: "From", value: "Billing team" },
      ],
      sample: { durationMs: 410, output: "Sent to lena@ortiz.studio" },
    },
    IN_BILLING
  ),
  step(
    "ask-finance",
    2 * COLUMN + 24,
    196,
    {
      title: "Ask finance",
      description: "Posts the refund for a person to approve.",
      kind: "wait",
      icon: "approval",
      app: "Approvals",
      settings: [
        { label: "Approvers", value: "Finance team" },
        { label: "Time out", value: "After 1 day" },
      ],
      sample: { durationMs: 0, output: "Waiting for approval" },
    },
    IN_BILLING
  ),
  step("create-issue", 4 * COLUMN, 96, {
    title: "Create issue",
    description: "Files the bug with the ticket's steps attached.",
    kind: "action",
    icon: "bug",
    app: "Issue tracker",
    settings: [
      { label: "Team", value: "Platform" },
      { label: "Priority", value: "From urgency" },
    ],
    sample: { durationMs: 610, output: "PLAT-1180" },
  }),
  step("post-bugs", 5 * COLUMN, 96, {
    title: "Post to #bugs",
    description: "Tells the on-call engineer in chat.",
    kind: "action",
    icon: "chat",
    app: "Chat",
    settings: [{ label: "Channel", value: "#bugs" }],
    sample: { durationMs: 230, output: "Posted in #bugs" },
  }),
  step("draft-reply", 4 * COLUMN, 264, {
    title: "Draft reply",
    description: "Writes an answer from the help center articles.",
    kind: "agent",
    icon: "model",
    app: "AI step",
    settings: [
      { label: "Tone", value: "Warm, short" },
      { label: "Sources", value: "Help center" },
    ],
    sample: { durationMs: 3200, output: "142 words, 2 links" },
  }),
  step("wait-approval", 5 * COLUMN, 264, {
    title: "Wait for review",
    description: "Holds the draft until an agent approves it.",
    kind: "wait",
    icon: "wait",
    app: "Approvals",
    settings: [
      { label: "Reviewers", value: "Tier 1" },
      { label: "Time out", value: "After 4 hours" },
    ],
    sample: { durationMs: 0, output: "Approved by Daniel" },
  }),
  step(
    "send-reply",
    6 * COLUMN,
    264,
    {
      title: "Send reply",
      description: "Answers the customer on the ticket.",
      kind: "action",
      icon: "mail",
      app: "Email",
      settings: [{ label: "From", value: "Not set" }],
      sample: { durationMs: 380, output: "Sent" },
    },
    { invalid: "Choose who the reply is sent from." }
  ),
  step("assign-oncall", 4 * COLUMN, 432, {
    title: "Assign to on-call",
    description: "Gives the ticket to whoever is on call.",
    kind: "action",
    icon: "bell",
    app: "Help desk",
    settings: [{ label: "Rota", value: "Support primary" }],
    sample: { durationMs: 150, output: "Assigned to Nora" },
  }),
  step("update-ticket", 2440, 120, {
    title: "Update ticket",
    description: "Saves the labels, links and outcome on the ticket.",
    kind: "action",
    icon: "merge",
    app: "Help desk",
    settings: [
      { label: "Status", value: "Pending" },
      { label: "Tags", value: "From Classify ticket" },
    ],
    sample: { durationMs: 270, output: "Ticket #4821 updated" },
  }),
  step("log-run", 2440 + COLUMN, 120, {
    title: "Log to warehouse",
    description: "Adds the run to the support dashboard.",
    kind: "action",
    icon: "database",
    app: "Warehouse",
    settings: [{ label: "Table", value: "support_runs" }],
    sample: { durationMs: 190, output: "1 row" },
  }),
  {
    id: "review-note",
    type: "note",
    position: { x: 5 * COLUMN, y: 448 },
    width: 240,
    height: 96,
    data: {
      text: "Drafts wait for review until they pass 9 in 10 checks, then send on their own.",
    },
  },
]

function flow(
  source: string,
  target: string,
  extra: Partial<CanvasEdge> = {}
): CanvasEdge {
  return {
    id: `${source}-${target}`,
    type: "smoothstep",
    source,
    target,
    ...getFlowHandles(),
    ...extra,
  }
}

// The router's row names the route, so its edge carries no label.
function route(source: string, routeId: string, target: string) {
  return flow(source, target, { sourceHandle: routeId })
}

function uses(source: string, target: string, handle: string): CanvasEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: handle,
    targetHandle: handle,
  }
}

export const AUTOMATION_EDGES: CanvasEdge[] = [
  flow("new-ticket", "find-customer"),
  flow("find-customer", "classify"),
  uses("model", "classify", "model"),
  uses("memory", "classify", "memory"),
  uses("help-center", "classify", "tool"),
  flow("classify", "route-topic"),
  route("route-topic", "billing", "find-invoice"),
  route("route-topic", "bug", "create-issue"),
  route("route-topic", "question", "draft-reply"),
  route("route-topic", "other", "assign-oncall"),
  flow("find-invoice", "under-limit"),
  route("under-limit", "yes", "refund-payment"),
  route("under-limit", "no", "ask-finance"),
  flow("refund-payment", "reply-refund"),
  flow("reply-refund", "update-ticket"),
  flow("ask-finance", "update-ticket"),
  flow("create-issue", "post-bugs"),
  flow("post-bugs", "update-ticket"),
  flow("draft-reply", "wait-approval"),
  flow("wait-approval", "send-reply"),
  flow("send-reply", "update-ticket"),
  flow("assign-oncall", "update-ticket"),
  flow("update-ticket", "log-run"),
]

export type AutomationTemplate = {
  id: string
  group: "Triggers" | "Actions" | "AI" | "Logic"
  data: AutomationStepData
}

const NEW_SAMPLE = { durationMs: 200, output: "Done" }

/** What the library adds. Each is a step with its settings still to fill. */
export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "schedule",
    group: "Triggers",
    data: {
      title: "On a schedule",
      description: "Runs at the times you set.",
      kind: "trigger",
      icon: "schedule",
      app: "Schedule",
      settings: [{ label: "Every", value: "Weekday at 9:00" }],
      sample: NEW_SAMPLE,
    },
  },
  {
    id: "webhook",
    group: "Triggers",
    data: {
      title: "Webhook",
      description: "Runs when another app calls its URL.",
      kind: "trigger",
      icon: "webhook",
      app: "Webhook",
      settings: [{ label: "Method", value: "POST" }],
      sample: NEW_SAMPLE,
    },
  },
  {
    id: "http",
    group: "Actions",
    data: {
      title: "HTTP request",
      description: "Calls any API and passes on its answer.",
      kind: "action",
      icon: "http",
      app: "HTTP",
      settings: [{ label: "URL", value: "Not set" }],
      sample: NEW_SAMPLE,
    },
  },
  {
    id: "email",
    group: "Actions",
    data: {
      title: "Send email",
      description: "Sends an email from your domain.",
      kind: "action",
      icon: "mail",
      app: "Email",
      settings: [{ label: "To", value: "Not set" }],
      sample: NEW_SAMPLE,
    },
  },
  {
    id: "chat",
    group: "Actions",
    data: {
      title: "Post a message",
      description: "Posts in a chat channel.",
      kind: "action",
      icon: "chat",
      app: "Chat",
      settings: [{ label: "Channel", value: "Not set" }],
      sample: NEW_SAMPLE,
    },
  },
  {
    id: "code",
    group: "Actions",
    data: {
      title: "Run code",
      description: "Transforms data with a short script.",
      kind: "action",
      icon: "code",
      app: "Code",
      settings: [{ label: "Language", value: "TypeScript" }],
      sample: NEW_SAMPLE,
    },
  },
  {
    id: "agent",
    group: "AI",
    data: {
      title: "AI agent",
      description: "Reasons over the input with tools you give it.",
      kind: "agent",
      icon: "agent",
      app: "AI agent",
      settings: [{ label: "Instructions", value: "Not set" }],
      sample: NEW_SAMPLE,
    },
  },
  {
    id: "tool",
    group: "AI",
    data: {
      title: "Search docs",
      description: "A tool an agent can call.",
      kind: "resource",
      resource: "tool",
      icon: "library",
      app: "Tool",
      settings: [{ label: "Collection", value: "Not set" }],
      sample: { durationMs: 0, output: "" },
    },
  },
  {
    id: "condition",
    group: "Logic",
    data: {
      title: "Condition",
      description: "Splits the flow on a yes or no.",
      kind: "condition",
      icon: "condition",
      app: "Condition",
      routes: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      settings: [{ label: "When", value: "Not set" }],
      sample: { durationMs: 5, output: "Yes" },
    },
  },
  {
    id: "wait",
    group: "Logic",
    data: {
      title: "Wait",
      description: "Pauses before the next step.",
      kind: "wait",
      icon: "wait",
      app: "Wait",
      settings: [{ label: "For", value: "1 hour" }],
      sample: { durationMs: 0, output: "Resumed" },
    },
  },
]

/** A step from a template, at a point, with its first setting to fill. */
export function createStep(
  template: AutomationTemplate,
  id: string,
  position: { x: number; y: number }
): CanvasNode {
  const isUnset = template.data.settings.some(
    ({ value }) => value === "Not set"
  )
  return {
    id,
    type: template.data.kind === "resource" ? "resource" : "step",
    position,
    color: COLORS[template.data.kind],
    selected: true,
    data: template.data,
    invalid: isUnset
      ? `Fill in “${template.data.settings[0]?.label}”.`
      : undefined,
  }
}
