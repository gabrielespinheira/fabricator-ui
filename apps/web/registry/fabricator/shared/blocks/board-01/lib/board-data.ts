import {
  createFilters,
  type BoardActivity,
  type BoardTicket,
  type BoardViewFilters,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-model"
import { type KanbanColumn } from "@/registry/bases/__base__/lib/kanban-model"
import {
  type PropertyDefinition,
  type PropertyFile,
} from "@/registry/bases/__base__/lib/property-model"

// Replace with your projects, people and tickets. Days are counted from the
// day the board opens, so the sample never goes stale.

const HOUR = 60 * 60_000
const DAY = 24 * HOUR

function portrait(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&auto=format&q=80`
}

function picture(id: string, name: string): PropertyFile {
  return {
    id,
    name,
    type: "image/jpeg",
    url: `https://images.unsplash.com/photo-${id}?w=1200&auto=format&fit=crop&q=80`,
    thumbnail: `https://images.unsplash.com/photo-${id}?w=600&auto=format&fit=crop&q=70`,
  }
}

export const BOARD_PEOPLE = [
  {
    value: "maya",
    label: "Maya Chen",
    image: portrait("1494790108377-be9c29b29330"),
  },
  {
    value: "daniel",
    label: "Daniel Okafor",
    image: portrait("1507003211169-0a1dd7228f2d"),
  },
  {
    value: "nora",
    label: "Nora Ahmed",
    image: portrait("1580489944761-15a19d654956"),
  },
  {
    value: "lucas",
    label: "Lucas Ferreira",
    image: portrait("1500648767791-00dcc994a43e"),
  },
  {
    value: "hana",
    label: "Hana Sato",
    image: portrait("1438761681033-6461ffad8d80"),
  },
]

/** Who is signed in. */
export const BOARD_ME = "maya"

export const BOARD_ACCOUNT = {
  name: "Maya Chen",
  email: "maya@acme.com",
  avatarUrl: portrait("1494790108377-be9c29b29330"),
}

export const BOARD_COLUMNS: KanbanColumn[] = [
  { id: "backlog", name: "Backlog", icon: "status-backlog", color: "gray" },
  { id: "planned", name: "Planned", icon: "status-todo", color: "purple" },
  {
    id: "progress",
    name: "In progress",
    icon: "status-progress",
    color: "yellow",
  },
  {
    id: "review",
    name: "In review",
    icon: "status-review",
    color: "blue",
    limit: 4,
    limitMode: "block",
  },
  { id: "done", name: "Done", icon: "status-done", color: "green" },
  { id: "canceled", name: "Canceled", icon: "status-canceled", color: "gray" },
]

/** The status's options are a project's columns, so editing one edits both. */
export function createStatusProperty(
  columns: readonly KanbanColumn[]
): PropertyDefinition {
  return {
    id: "status",
    name: "Status",
    type: "status",
    required: true,
    options: columns.map(({ id, name, icon, color }) => ({
      value: id,
      label: name,
      icon,
      color,
    })),
  }
}

const TICKET_PROPERTIES: PropertyDefinition[] = [
  {
    id: "key",
    name: "ID",
    type: "key",
    isSystem: true,
    isReadOnly: true,
    visibility: "hide",
  },
  {
    id: "priority",
    name: "Priority",
    type: "select",
    options: [
      {
        value: "urgent",
        label: "Urgent",
        icon: "priority-urgent",
        color: "destructive",
      },
      { value: "high", label: "High", icon: "priority-high" },
      { value: "medium", label: "Medium", icon: "priority-medium" },
      { value: "low", label: "Low", icon: "priority-low" },
    ],
  },
  {
    id: "assignee",
    name: "Assignee",
    type: "person",
    options: BOARD_PEOPLE,
  },
  {
    id: "labels",
    name: "Labels",
    type: "multi-select",
    options: [
      { value: "bug", label: "Bug", color: "red" },
      { value: "feature", label: "Feature", color: "blue" },
      { value: "design", label: "Design", color: "purple" },
      { value: "api", label: "API", color: "teal" },
      { value: "growth", label: "Growth", color: "green" },
      { value: "docs", label: "Docs", color: "orange" },
    ],
  },
  { id: "due", name: "Due date", type: "date" },
  {
    id: "estimate",
    name: "Estimate",
    type: "number",
    settings: { unit: "points", minimum: 0, maximum: 13 },
  },
  {
    id: "subtasks",
    name: "Sub-tasks",
    type: "progress",
    isReadOnly: true,
    visibility: "hide",
  },
  {
    id: "comments",
    name: "Comments",
    type: "number",
    icon: "comments",
    isReadOnly: true,
    visibility: "hide",
  },
  {
    id: "media",
    name: "Images",
    type: "files",
    settings: { accept: "images" },
  },
]

export function createBoardProperties(columns: readonly KanbanColumn[]) {
  return [createStatusProperty(columns), ...TICKET_PROPERTIES]
}

export const BOARD_PROPERTIES = createBoardProperties(BOARD_COLUMNS)

/** What the new ticket form asks for, besides the title. */
export const BOARD_FORM_PROPERTIES = [
  "status",
  "priority",
  "assignee",
  "labels",
  "due",
]

export const BOARD_CARD_PROPERTIES = [
  "key",
  "priority",
  "assignee",
  "labels",
  "subtasks",
  "comments",
  "due",
  "media",
]

/** Each project's saved views, in the sidebar. */
export const BOARD_VIEWS: (BoardViewFilters & { label: string })[] = [
  { id: "all", label: "All tickets", filters: undefined },
  {
    id: "mine",
    label: "My tickets",
    filters: createFilters(BOARD_PROPERTIES, { assignee: [BOARD_ME] }),
  },
  {
    id: "urgent",
    label: "High priority",
    filters: createFilters(BOARD_PROPERTIES, { priority: ["urgent", "high"] }),
  },
  {
    id: "bugs",
    label: "Bugs",
    filters: createFilters(BOARD_PROPERTIES, { labels: ["bug"] }),
  },
]

export type BoardProjectId = "storefront" | "mobile" | "fulfilment" | "loyalty"

export type BoardProject = {
  id: BoardProjectId
  name: string
  /** What its tickets' IDs start with. */
  key: string
  columns: KanbanColumn[]
  tickets: BoardTicket[]
}

type Sample = {
  number: number
  title: string
  status: string
  priority?: string
  assignee?: string
  labels?: string[]
  /** Days from today. */
  due?: number
  estimate?: number
  description?: string
  /** Titles, the finished ones first. */
  subtasks?: string[]
  finished?: number
  /** Who said what, how many hours ago. */
  comments?: [personId: string, text: string, hoursAgo: number][]
  media?: PropertyFile[]
}

const STOREFRONT: Sample[] = [
  {
    number: 148,
    title: "Remember the last delivery address",
    status: "backlog",
    priority: "low",
    assignee: "hana",
    labels: ["feature"],
    estimate: 2,
  },
  {
    number: 155,
    title: "Gift notes on multi-address orders",
    status: "backlog",
    priority: "low",
    labels: ["feature", "design"],
    estimate: 3,
    media: [picture("1549465220-1a8b9238cd48", "Gift box.jpg")],
  },
  {
    number: 151,
    title: "Translate the returns flow into Portuguese and German",
    status: "backlog",
    priority: "medium",
    assignee: "lucas",
    labels: ["docs"],
    estimate: 5,
    comments: [
      ["hana", "Legal signed off on the German copy.", 30],
      ["lucas", "Great, Portuguese goes to review on Monday.", 26],
    ],
  },
  {
    number: 158,
    title: "Compare up to four products side by side",
    status: "backlog",
    priority: "medium",
    labels: ["feature"],
    estimate: 8,
  },
  {
    number: 137,
    title: "Stock counts drift after a partial refund",
    status: "planned",
    priority: "urgent",
    assignee: "daniel",
    labels: ["bug", "api"],
    due: -1,
    estimate: 3,
    description:
      "Refunding one line of an order puts every line back in stock. Seen on 14 orders since the last release.",
    comments: [
      ["nora", "Support has three open cases about this.", 20],
      ["daniel", "Reproduced. The refund job reads the whole order.", 5],
      ["maya", "Let’s pull this in before the weekend sale.", 2],
    ],
  },
  {
    number: 132,
    title: "Let shoppers split one order across two cards",
    status: "planned",
    priority: "high",
    assignee: "maya",
    labels: ["feature", "api"],
    due: 9,
    estimate: 8,
    description:
      "Support asks for this every week around the holidays. Start with two cards and equal or custom amounts.",
    subtasks: [
      "Amount editor in the payment step",
      "Refund each card in proportion",
      "Receipt with both cards",
    ],
    finished: 0,
    comments: [["lucas", "Finance needs both cards on the invoice.", 49]],
  },
  {
    number: 140,
    title: "Empty states for saved lists",
    status: "planned",
    priority: "medium",
    assignee: "nora",
    labels: ["design"],
    due: 14,
    estimate: 2,
  },
  {
    number: 118,
    title: "New size guide with measurements per region",
    status: "progress",
    priority: "high",
    assignee: "nora",
    labels: ["design", "feature"],
    due: 2,
    estimate: 5,
    description:
      "One table per region, with the shopper’s own region first. Returns for size are 31% of all returns.",
    subtasks: [
      "Collect regional charts",
      "Unit switch",
      "Table on phones",
      "Link from the size picker",
      "Copy review",
    ],
    finished: 3,
    comments: [
      ["hana", "The Japanese chart is in the folder.", 22],
      ["nora", "Added. Phones are the last open question.", 4],
    ],
    media: [picture("1556905055-8f358a7a47b2", "Flat lay.jpg")],
  },
  {
    number: 124,
    title: "Faster product search with typo tolerance",
    status: "progress",
    priority: "medium",
    assignee: "maya",
    labels: ["api"],
    due: 6,
    estimate: 8,
    subtasks: ["Index product names", "Rank by stock"],
    finished: 1,
  },
  {
    number: 129,
    title: "Referral banner after the second order",
    status: "progress",
    priority: "low",
    assignee: "lucas",
    labels: ["growth"],
    estimate: 3,
    comments: [["maya", "Copy is final, see the brief.", 70]],
  },
  {
    number: 109,
    title: "Wallet buttons on the product page",
    status: "review",
    priority: "high",
    assignee: "daniel",
    labels: ["feature"],
    due: 1,
    estimate: 5,
    subtasks: ["Apple Pay", "Google Pay", "Fallback", "Analytics"],
    finished: 4,
    comments: [
      ["maya", "Works on my phone. One question on the fallback.", 8],
      ["daniel", "It shows the card form. Screenshot in the pull request.", 6],
    ],
    media: [picture("1556742049-0cfed4f6a45d", "Checkout.jpg")],
  },
  {
    number: 113,
    title: "Webhook signatures for order events",
    status: "review",
    priority: "medium",
    assignee: "hana",
    labels: ["api", "docs"],
    estimate: 3,
    comments: [["daniel", "Please add a Ruby example.", 12]],
  },
  {
    number: 145,
    title: "Cart total flickers when a coupon is removed",
    status: "review",
    priority: "medium",
    assignee: "maya",
    labels: ["bug"],
    estimate: 1,
  },
  {
    number: 96,
    title: "Order status page without signing in",
    status: "done",
    priority: "medium",
    assignee: "nora",
    labels: ["feature"],
    estimate: 5,
  },
  {
    number: 101,
    title: "Weekly sales digest for store managers",
    status: "done",
    priority: "low",
    assignee: "lucas",
    labels: ["growth"],
    estimate: 2,
    media: [picture("1472851294608-062f824d29cc", "Open sign.jpg")],
  },
  {
    number: 88,
    title: "Loyalty points in a separate app",
    status: "canceled",
    priority: "low",
    labels: ["growth"],
  },
]

const MOBILE: Sample[] = [
  {
    number: 62,
    title: "Widget with the next delivery window",
    status: "backlog",
    priority: "low",
    labels: ["feature"],
    estimate: 5,
  },
  {
    number: 58,
    title: "Haptics when an item lands in the cart",
    status: "planned",
    priority: "low",
    assignee: "lucas",
    labels: ["design"],
    estimate: 1,
  },
  {
    number: 55,
    title: "Push opt-in after the first order ships",
    status: "planned",
    priority: "high",
    assignee: "maya",
    labels: ["growth"],
    due: 5,
    estimate: 3,
  },
  {
    number: 49,
    title: "Rebuild the product gallery for tall screens",
    status: "progress",
    priority: "high",
    assignee: "nora",
    labels: ["design", "feature"],
    due: 3,
    estimate: 5,
    subtasks: ["Pinch to zoom", "Video first frame", "Landscape"],
    finished: 2,
    media: [picture("1512941937669-90a1b58e7e9c", "Phone.jpg")],
  },
  {
    number: 51,
    title: "Scanner freezes on older phones",
    status: "review",
    priority: "urgent",
    assignee: "daniel",
    labels: ["bug"],
    due: 0,
    estimate: 3,
    comments: [["hana", "Confirmed fixed on an eight-year-old phone.", 3]],
  },
  {
    number: 40,
    title: "Sign in with a passkey",
    status: "done",
    priority: "high",
    assignee: "hana",
    labels: ["feature"],
    estimate: 8,
  },
]

const FULFILMENT: Sample[] = [
  {
    number: 31,
    title: "Pick lists sorted by aisle",
    status: "planned",
    priority: "high",
    assignee: "hana",
    labels: ["feature"],
    due: 7,
    estimate: 5,
    media: [picture("1553413077-190dd305871c", "Aisle.jpg")],
  },
  {
    number: 33,
    title: "Carrier labels print twice after a retry",
    status: "progress",
    priority: "urgent",
    assignee: "daniel",
    labels: ["bug", "api"],
    due: 1,
    estimate: 2,
  },
  {
    number: 28,
    title: "Daily packing report per station",
    status: "review",
    priority: "medium",
    assignee: "maya",
    labels: ["docs"],
    estimate: 3,
  },
  {
    number: 24,
    title: "Return labels in the box",
    status: "done",
    priority: "medium",
    assignee: "lucas",
    labels: ["feature"],
    estimate: 3,
    media: [picture("1586528116311-ad8dd3c8310d", "Packing floor.jpg")],
  },
]

const PROJECTS: (Pick<BoardProject, "id" | "name" | "key"> & {
  samples: Sample[]
})[] = [
  { id: "storefront", name: "Storefront", key: "SHOP", samples: STOREFRONT },
  { id: "mobile", name: "Mobile app", key: "APP", samples: MOBILE },
  { id: "fulfilment", name: "Fulfilment", key: "OPS", samples: FULFILMENT },
  { id: "loyalty", name: "Loyalty", key: "LOY", samples: [] },
]

function toDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, "0")}`
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function createTicket(key: string, sample: Sample, now: Date): BoardTicket {
  const id = `${key}-${sample.number}`
  const { status, priority, assignee, labels, estimate, media } = sample
  const activity: BoardActivity[] = [
    {
      id: `${id}-created`,
      kind: "created",
      personId: assignee ?? BOARD_ME,
      // Higher numbers are newer.
      at: now.getTime() - (200 - sample.number) * (DAY / 8) - 4 * DAY,
    },
    ...(sample.comments ?? []).map(
      ([personId, text, hoursAgo], index): BoardActivity => ({
        id: `${id}-comment-${index}`,
        kind: "comment",
        personId,
        text,
        at: now.getTime() - hoursAgo * HOUR,
      })
    ),
  ]
  return {
    id,
    title: sample.title,
    description: sample.description ?? "",
    subtasks: (sample.subtasks ?? []).map((title, index) => ({
      id: `${id}-subtask-${index}`,
      title,
      isDone: index < (sample.finished ?? 0),
    })),
    activity,
    values: {
      status,
      priority,
      assignee,
      labels,
      estimate,
      media,
      due:
        sample.due === undefined ? undefined : toDay(addDays(now, sample.due)),
    },
  }
}

export function createBoardProjects(now: Date): BoardProject[] {
  return PROJECTS.map(({ samples, ...project }) => ({
    ...project,
    columns: BOARD_COLUMNS,
    tickets: samples.map((sample) => createTicket(project.key, sample, now)),
  }))
}
