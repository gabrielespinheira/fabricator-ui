import {
  type AssistantAttachment,
  type AssistantChat,
  type AssistantMessage,
  type AssistantPart,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  createFinishedParts,
  pickReplyScript,
  SAMPLE_FILE,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-replies"

// The demo's chat history. Load the person's chats from your database instead.

/** The sample's present: Tuesday, November 24, 2026. Use the real time. */
export const SAMPLE_NOW = new Date("2026-11-24T15:00:00Z")

export const ASSISTANT_USER = {
  name: "Ada Lovelace",
  firstName: "Ada",
  email: "ada@acme.com",
  avatarUrl:
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&h=160&fit=crop&auto=format&q=80",
}

const HOUR = 60 * 60 * 1000

function hoursAgo(hours: number) {
  return new Date(SAMPLE_NOW.getTime() - hours * HOUR).toISOString()
}

function createExchange(
  id: string,
  question: string,
  attachments: AssistantAttachment[] = []
): AssistantMessage[] {
  const script = pickReplyScript(question, attachments)
  return [
    { id: `${id}-user`, role: "user", text: question, attachments },
    {
      id: `${id}-reply`,
      role: "assistant",
      status: "done",
      parts: createFinishedParts(script, id),
    },
  ]
}

/** The same exchange, with a reply that broke off in its first sentence. */
function createFailedExchange(
  id: string,
  question: string
): AssistantMessage[] {
  return createExchange(id, question).map((message) => {
    if (message.role === "user") return message
    return {
      ...message,
      status: "failed",
      error: "The connection dropped before the reply finished.",
      parts: message.parts
        .filter((part) => part.type !== "artifact")
        .map(
          (part): AssistantPart =>
            part.type === "text"
              ? {
                  type: "text",
                  text: part.text.split(" ").slice(0, 9).join(" "),
                }
              : part
        ),
    }
  })
}

export const ASSISTANT_CHATS: AssistantChat[] = [
  {
    id: "q3-revenue",
    title: "Q3 revenue analysis",
    updatedAt: hoursAgo(0.2),
    isPinned: false,
    messages: [
      ...createExchange(
        "q3-growth",
        "Here's our Q3 revenue export. Which regions grew fastest, and is anything worrying?",
        [SAMPLE_FILE]
      ),
      ...createExchange(
        "q3-market",
        "How does that compare with the market? Look for recent benchmarks."
      ),
    ],
  },
  {
    id: "churn-summary",
    title: "Q3 churn summary",
    updatedAt: hoursAgo(1.5),
    isPinned: false,
    messages: createFailedExchange("churn", "Summarize this quarter's churn."),
  },
  {
    id: "launch-email",
    title: "Launch email for weekly reports",
    updatedAt: hoursAgo(3),
    isPinned: false,
    messages: createExchange(
      "launch-email",
      "Write a short launch email for weekly reports."
    ),
  },
  {
    id: "pricing-copy",
    title: "Pricing page copy review",
    updatedAt: hoursAgo(26),
    isPinned: false,
    messages: createExchange(
      "pricing-copy",
      "Review the copy on our pricing page."
    ),
  },
  {
    id: "cohort-sql",
    title: "SQL for cohort retention",
    updatedAt: hoursAgo(30),
    isPinned: false,
    messages: createExchange(
      "cohort-sql",
      "Write SQL for monthly cohort retention."
    ),
  },
  {
    id: "board-update",
    title: "Board update outline",
    updatedAt: hoursAgo(74),
    isPinned: true,
    messages: createExchange(
      "board-update",
      "Outline the November board update."
    ),
  },
  {
    id: "competitors",
    title: "Competitor feature matrix",
    updatedAt: hoursAgo(98),
    isPinned: false,
    messages: createExchange(
      "competitors",
      "Build a feature matrix of our three closest competitors."
    ),
  },
  {
    id: "survey",
    title: "Onboarding survey questions",
    updatedAt: hoursAgo(140),
    isPinned: false,
    messages: createExchange(
      "survey",
      "Suggest questions for our onboarding survey."
    ),
  },
]
