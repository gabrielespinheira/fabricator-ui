import { type AssistantMessage } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"

// The demo's chat history. Load the person's chats from your database instead.

export type AssistantChat = {
  id: string
  title: string
  updatedAt: string
  messages: AssistantMessage[]
}

const HOUR = 60 * 60 * 1000

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * HOUR).toISOString()
}

function exchange(id: string, question: string, answer: string) {
  return [
    { id: `${id}-user`, role: "user", text: question, attachments: [] },
    {
      id: `${id}-reply`,
      role: "assistant",
      status: "done",
      parts: [{ type: "text", text: answer }],
    },
  ] satisfies AssistantMessage[]
}

const revenueAnalysis: AssistantMessage[] = [
  {
    id: "q3-user-1",
    role: "user",
    text: "Here's our Q3 revenue export. Which regions grew fastest, and is anything worrying?",
    attachments: [{ name: "q3-revenue.csv", size: "48 KB" }],
  },
  {
    id: "q3-reply-1",
    role: "assistant",
    status: "done",
    parts: [
      {
        type: "tool",
        tool: {
          id: "q3-read",
          kind: "read",
          label: "Read q3-revenue.csv",
          runningLabel: "Reading q3-revenue.csv",
          status: "done",
          detail: "1,284 rows",
          output: {
            language: "text",
            code: `date,region,plan,account,mrr,churned
2026-07-01,EMEA,Growth,acc_0192,1240,false
2026-07-01,APAC,Starter,acc_0417,290,true
2026-07-02,NA,Scale,acc_0031,8900,false`,
          },
        },
      },
      {
        type: "tool",
        tool: {
          id: "q3-python",
          kind: "code",
          label: "Ran Python",
          runningLabel: "Running Python",
          status: "done",
          detail: "1.2s",
          input: {
            language: "python",
            code: `import pandas as pd

df = pd.read_csv("q3-revenue.csv", parse_dates=["date"])
by_region = df.pivot_table(
    index="region", columns=df.date.dt.quarter, values="mrr", aggfunc="sum"
)
print(by_region.pct_change(axis=1).iloc[:, -1].sort_values(ascending=False))`,
          },
          output: {
            language: "text",
            code: `region
EMEA     0.184
NA       0.061
LATAM    0.048
APAC    -0.032`,
          },
        },
      },
      {
        type: "text",
        text: `EMEA grew fastest this quarter, and APAC is the one to watch.

## Growth by region

| Region | Q3 MRR | Change |
| --- | --- | --- |
| EMEA | $412K | +18.4% |
| North America | $968K | +6.1% |
| LATAM | $96K | +4.8% |
| APAC | $141K | −3.2% |

### Worth watching

- **APAC** lost 9 Growth accounts in September, after the price change on Aug 28.
- **North America** grew, but three accounts brought most of the new MRR. Without them it's flat.
`,
      },
    ],
  },
  {
    id: "q3-user-2",
    role: "user",
    text: "How does that compare with the market? Look for recent benchmarks.",
    attachments: [],
  },
  {
    id: "q3-reply-2",
    role: "assistant",
    status: "done",
    parts: [
      {
        type: "tool",
        tool: {
          id: "q3-search",
          kind: "search",
          label: "Searched the web",
          runningLabel: "Searching the web",
          status: "done",
          detail: "5 results",
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
      },
      {
        type: "tool",
        tool: {
          id: "q3-report",
          kind: "read",
          label: "Read gartner.com/saas-growth-2026",
          runningLabel: "Reading gartner.com/saas-growth-2026",
          status: "error",
          detail: "Needs a sign-in",
        },
      },
      {
        type: "text",
        text: `You're ahead of the market overall, with one region behind it.

- **Total MRR grew 7.9%** this quarter. The median for companies at your size is **5–6%** a quarter.
- **EMEA's 18.4%** is top-quartile growth.
- **APAC's −3.2%** is below every benchmark I found, and the timing points at the August price change rather than the market.

I couldn't open Gartner's report: it needs a sign-in. Share it as a PDF and I'll add its numbers.
`,
      },
    ],
  },
]

export const ASSISTANT_CHATS: AssistantChat[] = [
  {
    id: "q3-revenue",
    title: "Q3 revenue analysis",
    updatedAt: hoursAgo(0.2),
    messages: revenueAnalysis,
  },
  {
    id: "launch-email",
    title: "Launch email for weekly reports",
    updatedAt: hoursAgo(3),
    messages: exchange(
      "launch-email",
      "Write a short launch email for weekly reports.",
      "**Subject:** Your numbers, in your inbox every Monday\n\nStarting Monday, Acme sends last week's revenue, churn and pipeline to your inbox at 8:00, from the dashboards you already have.\n"
    ),
  },
  {
    id: "pricing-copy",
    title: "Pricing page copy review",
    updatedAt: hoursAgo(26),
    messages: exchange(
      "pricing-copy",
      "Review the copy on our pricing page.",
      "Three changes would help most:\n\n1. Lead each plan with who it's for, not its price.\n2. Replace **Unlimited** with the real limit people care about.\n3. Move the FAQ above the footer, where people look for it.\n"
    ),
  },
  {
    id: "cohort-sql",
    title: "SQL for cohort retention",
    updatedAt: hoursAgo(30),
    messages: exchange(
      "cohort-sql",
      "Write SQL for monthly cohort retention.",
      "```sql\nselect date_trunc('month', signed_up_at) as cohort,\n       months_since_signup,\n       count(distinct account_id) as active\nfrom activity\ngroup by 1, 2\norder by 1, 2;\n```\n"
    ),
  },
  {
    id: "board-update",
    title: "Board update outline",
    updatedAt: hoursAgo(74),
    messages: exchange(
      "board-update",
      "Outline the November board update.",
      "1. Highlights: revenue, customers, runway\n2. What went wrong, and what we changed\n3. Product: weekly reports and the APAC pricing review\n4. Asks for the board\n"
    ),
  },
  {
    id: "competitors",
    title: "Competitor feature matrix",
    updatedAt: hoursAgo(98),
    messages: exchange(
      "competitors",
      "Build a feature matrix of our three closest competitors.",
      "| Feature | Acme | Northwind | Globex |\n| --- | --- | --- | --- |\n| Weekly reports | Yes | Yes | No |\n| Usage pricing | Yes | No | Yes |\n| SSO on every plan | No | No | Yes |\n"
    ),
  },
  {
    id: "survey",
    title: "Onboarding survey questions",
    updatedAt: hoursAgo(140),
    messages: exchange(
      "survey",
      "Suggest questions for our onboarding survey.",
      "- What made you sign up today?\n- Which tool did you use before?\n- What would make the first week a success?\n"
    ),
  },
]
