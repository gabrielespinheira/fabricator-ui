import { type AssistantToolCall } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"

// Canned replies for the demo, one per kind of tool. Replace pickReplyScript
// with your model's stream (the AI SDK's useChat, your own API).

export type AssistantReplyScript = {
  tool: Omit<AssistantToolCall, "id">
  /** The tool's result once it's done. */
  result: { status: "done" | "error"; detail?: string }
  text: string
}

const research: AssistantReplyScript = {
  tool: {
    kind: "search",
    label: "Searched the web",
    runningLabel: "Searching the web",
    status: "running",
    sources: [
      {
        title: "SaaS benchmarks 2026: retention and expansion",
        domain: "stripe.com",
        url: "https://stripe.com",
      },
      {
        title: "The state of B2B churn",
        domain: "hubspot.com",
        url: "https://hubspot.com",
      },
      {
        title: "Product analytics benchmarks",
        domain: "mixpanel.com",
        url: "https://mixpanel.com",
      },
      {
        title: "How usage pricing changes expansion",
        domain: "posthog.com",
        url: "https://posthog.com",
      },
      {
        title: "Payback periods by stage",
        domain: "substack.com",
        url: "https://substack.com",
      },
    ],
  },
  result: { status: "done", detail: "5 results" },
  text: `Here's what recent benchmarks say for companies of your size.

## What the data shows

- **Net revenue retention** at $10–50M ARR sits around **104%** at the median and **118%** in the top quartile.
- **Gross churn** in the same band runs **11–13% a year**, lower on annual contracts.
- Companies that price on usage expand faster, with noisier month-to-month revenue.

| Metric | Median | Top quartile |
| --- | --- | --- |
| Net revenue retention | 104% | 118% |
| Gross revenue churn | 12% | 7% |
| CAC payback | 19 months | 11 months |

Want me to put your Q3 numbers beside these?
`,
}

const analysis: AssistantReplyScript = {
  tool: {
    kind: "code",
    label: "Ran Python",
    runningLabel: "Running Python",
    status: "running",
    input: {
      language: "python",
      code: `import pandas as pd

df = pd.read_csv("q3-revenue.csv", parse_dates=["date"])
lost = df[df.churned].groupby(df.date.dt.month_name())
print(lost.agg(accounts=("account", "nunique"), mrr=("mrr", "sum")))`,
    },
    output: {
      language: "text",
      code: `           accounts      mrr
July             41   18,240
August           36   15,910
September        29   12,480`,
    },
  },
  result: { status: "done", detail: "0.8s" },
  text: `Churn fell every month this quarter, mostly because fewer annual plans cancelled.

## Q3 churn

| Month | Accounts lost | Gross churn |
| --- | --- | --- |
| July | 41 | 1.9% |
| August | 36 | 1.6% |
| September | 29 | 1.3% |

- **Annual plans** lost 12 accounts, half of Q2's 24.
- **Monthly Starter** holds most of it: 71 of the 106 accounts lost.

Next, I can break the Starter cancellations down by the reason people gave.
`,
}

const writing: AssistantReplyScript = {
  tool: {
    kind: "read",
    label: "Read launch-brief.md",
    runningLabel: "Reading launch-brief.md",
    status: "running",
    output: {
      language: "markdown",
      code: `# Weekly reports
- Ships Monday, Nov 23
- Audience: finance and ops leads
- Voice: plain, specific, no hype`,
    },
  },
  result: { status: "done", detail: "4 lines" },
  text: `Here's a first draft, in the voice of the brief.

**Subject:** Your numbers, in your inbox every Monday

Hi Ada,

Starting Monday, Acme sends last week's revenue, churn and pipeline to your inbox at 8:00. There's nothing to set up: it uses the dashboards you already have.

- **Pick what's in it** from any dashboard card.
- **Share it** with your team, or send your board a PDF.

The Acme team

Should I write a shorter version for the in-app announcement?
`,
}

export const ASSISTANT_SUGGESTIONS = [
  {
    id: "churn",
    label: "Summarize this quarter's churn",
    description: "From the revenue export",
  },
  {
    id: "email",
    label: "Draft a launch email",
    description: "For the weekly reports feature",
  },
  {
    id: "benchmarks",
    label: "Compare us with SaaS benchmarks",
    description: "Retention, churn and payback",
  },
] as const

/** The demo's reply to a message: data questions run code, writing reads the brief, the rest searches. */
export function pickReplyScript(text: string): AssistantReplyScript {
  const message = text.toLowerCase()
  if (/churn|csv|data|chart|revenue|numbers|metric|analy/.test(message)) {
    return analysis
  }
  if (/draft|write|email|announce|post\b/.test(message)) return writing
  return research
}
