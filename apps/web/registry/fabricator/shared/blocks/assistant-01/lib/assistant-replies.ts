import { type AssistantArtifact } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-artifact-model"
import {
  type AssistantAttachment,
  type AssistantPart,
  type AssistantStep,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"

// The demo's replies. Each one answers only the questions its patterns
// describe; anything else gets a reply that says it can't. Replace
// pickReplyScript with your model's stream (the AI SDK's useChat, your API).

export type AssistantScriptStep = {
  step: Omit<AssistantStep, "id" | "status" | "detail" | "seconds">
  result: { status: "done" | "blocked"; detail: string; seconds?: number }
}

export type AssistantReplyScript = {
  id: string
  steps: AssistantScriptStep[]
  text: string
  artifact?: AssistantArtifact
}

type AssistantReplyRule = {
  script: AssistantReplyScript
  /** A question has to match every one of these... */
  needs: RegExp[]
  /** ...and not this. */
  rejects?: RegExp
}

/** The file the sample chat starts from. */
export const SAMPLE_FILE: AssistantAttachment = {
  name: "q3-revenue.csv",
  size: "298 KB",
}

const growthByRegion: AssistantArtifact = {
  id: "growth-by-region",
  title: "Growth by region",
  scope: "Change in MRR, percent, Q2 to Q3 2026",
  source: SAMPLE_FILE.name,
  columns: [
    { key: "region", label: "Region", format: "text" },
    { key: "q2", label: "Q2", format: "money" },
    { key: "q3", label: "Q3", format: "money" },
    { key: "change", label: "Change", format: "change" },
  ],
  rows: [
    { region: "EMEA", q2: 348_000, q3: 412_000, change: 18.4 },
    { region: "North America", q2: 912_300, q3: 968_000, change: 6.1 },
    { region: "LATAM", q2: 91_600, q3: 96_000, change: 4.8 },
    { region: "APAC", q2: 145_700, q3: 141_000, change: -3.2 },
  ],
  total: { region: "Total", q2: 1_497_600, q3: 1_617_000, change: 8 },
  chart: {
    label: "Change in MRR",
    index: "region",
    value: "change",
    isRanked: true,
  },
}

const churnByMonth: AssistantArtifact = {
  id: "churn-by-month",
  title: "Churn by month",
  scope: "Accounts lost per month, Q3 2026",
  source: SAMPLE_FILE.name,
  columns: [
    { key: "month", label: "Month", format: "text" },
    { key: "accounts", label: "Accounts lost", format: "count" },
    { key: "rate", label: "Rate", format: "percent" },
  ],
  rows: [
    { month: "July", accounts: 41, rate: 1.9 },
    { month: "August", accounts: 36, rate: 1.6 },
    { month: "September", accounts: 29, rate: 1.3 },
  ],
  chart: {
    label: "Accounts lost",
    index: "month",
    value: "accounts",
    isRanked: false,
  },
}

const readExport: AssistantScriptStep = {
  step: {
    kind: "read",
    label: `Read ${SAMPLE_FILE.name}`,
    runningLabel: `Reading ${SAMPLE_FILE.name}`,
    output: {
      language: "text",
      code: `date,region,plan,account,mrr,churned
2026-07-01,EMEA,Growth,acc_0192,1240,false
2026-07-01,APAC,Starter,acc_0417,290,true
2026-07-02,NA,Scale,acc_0031,8900,false`,
    },
  },
  result: { status: "done", detail: "6,612 rows", seconds: 1.6 },
}

const growth: AssistantReplyScript = {
  id: "growth",
  steps: [
    readExport,
    {
      step: {
        kind: "code",
        label: "Ran Python",
        runningLabel: "Running Python",
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
      result: { status: "done", detail: "4 regions", seconds: 2.3 },
    },
  ],
  text: `EMEA grew fastest, and APAC is the one to watch: it's the only region that shrank.

- **EMEA** brought more than half of the new MRR, most of it from Scale plans.
- **APAC** lost 9 Growth accounts in September, after the price change on August 28.
- **North America** grew, but three accounts brought most of it. Without them it's flat.
`,
  artifact: growthByRegion,
}

const benchmarks: AssistantReplyScript = {
  id: "benchmarks",
  steps: [
    {
      step: {
        kind: "search",
        label: "Searched the web",
        runningLabel: "Searching the web",
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
      result: { status: "done", detail: "5 results", seconds: 2.4 },
    },
    {
      step: {
        kind: "code",
        label: `Compared with ${SAMPLE_FILE.name}`,
        runningLabel: `Comparing with ${SAMPLE_FILE.name}`,
        output: {
          language: "text",
          code: `            acme   median   top quartile
total        8.0%     5.5%           9.0%
EMEA        18.4%     7.1%          14.2%
APAC        -3.2%     4.9%           8.8%`,
        },
      },
      result: { status: "done", detail: "3 measures", seconds: 1.4 },
    },
    {
      step: {
        kind: "read",
        label: "Gartner's SaaS growth report",
        runningLabel: "Reading Gartner's SaaS growth report",
        connection: "Gartner",
        sources: [
          {
            title: "SaaS growth report 2026",
            domain: "gartner.com",
            url: "https://gartner.com",
          },
        ],
      },
      result: { status: "blocked", detail: "Needs a sign-in" },
    },
  ],
  text: `You're ahead of the market overall, with one region behind it.

- **Total MRR grew 8.0%** this quarter. The median at your size is **5 to 6%**.
- **EMEA's 18.4%** is well into the top quartile, which starts at 14.2%.
- **APAC's −3.2%** is below every benchmark I found. The timing points at the August price change, not at the market.
`,
}

const churn: AssistantReplyScript = {
  id: "churn",
  steps: [
    readExport,
    {
      step: {
        kind: "code",
        label: "Ran Python",
        runningLabel: "Running Python",
        input: {
          language: "python",
          code: `import pandas as pd

df = pd.read_csv("q3-revenue.csv", parse_dates=["date"])
lost = df[df.churned].groupby(df.date.dt.month_name())
print(lost.agg(accounts=("account", "nunique")))`,
        },
        output: {
          language: "text",
          code: `           accounts
July             41
August           36
September        29`,
        },
      },
      result: { status: "done", detail: "3 months", seconds: 1.8 },
    },
  ],
  text: `Churn fell every month of Q3, mostly because fewer annual plans cancelled.

- **Annual plans** lost 12 accounts, half of Q2's 24.
- **Starter**, billed monthly, holds most of what's left: 71 of the 106 accounts lost.
`,
  artifact: churnByMonth,
}

const launchEmail: AssistantReplyScript = {
  id: "launch-email",
  steps: [
    {
      step: {
        kind: "read",
        label: "Read launch-brief.md",
        runningLabel: "Reading launch-brief.md",
        output: {
          language: "markdown",
          code: `# Weekly reports
- Ships Monday, November 30
- Audience: finance and ops leads
- Voice: plain, specific, no hype`,
        },
      },
      result: { status: "done", detail: "4 lines", seconds: 1.2 },
    },
  ],
  text: `**Subject:** Your numbers, in your inbox every Monday

Hi Sofia,

Starting Monday, Acme sends last week's revenue, churn and pipeline to your inbox at 8:00. There's nothing to set up: it uses the dashboards you already have.

- **Pick what's in it** from any dashboard card.
- **Share it** with your team, or send your board a PDF.

The Acme team
`,
}

const pricingCopy: AssistantReplyScript = {
  id: "pricing-copy",
  steps: [
    {
      step: {
        kind: "read",
        label: "Read acme.com/pricing",
        runningLabel: "Reading acme.com/pricing",
      },
      result: { status: "done", detail: "1 page", seconds: 1.3 },
    },
  ],
  text: `Three changes would help most:

1. Lead each plan with who it's for, not its price.
2. Replace **Unlimited** with the real limit people care about.
3. Move the questions above the footer, where people look for them.
`,
}

const cohortSql: AssistantReplyScript = {
  id: "cohort-sql",
  steps: [],
  text: `\`\`\`sql
select
  date_trunc('month', signed_up_at) as cohort,
  months_since_signup,
  count(distinct account_id) as active
from activity
group by 1, 2
order by 1, 2;
\`\`\`

Each row is one cohort in one month. Divide \`active\` by the cohort's month 0 to get retention.
`,
}

const boardUpdate: AssistantReplyScript = {
  id: "board-update",
  steps: [],
  text: `1. **Highlights:** revenue, customers, runway
2. **What went wrong,** and what we changed
3. **Product:** weekly reports and the APAC pricing review
4. **Asks** for the board
`,
}

const competitors: AssistantReplyScript = {
  id: "competitors",
  steps: [],
  text: `| Feature | Acme | Northwind | Globex |
| --- | --- | --- | --- |
| Weekly reports | Yes | Yes | No |
| Usage pricing | Yes | No | Yes |
| SSO on every plan | No | No | Yes |

SSO on every plan is the one thing both a buyer and a competitor will bring up.
`,
}

const survey: AssistantReplyScript = {
  id: "survey",
  steps: [],
  text: `- What made you sign up today?
- Which tool did you use before?
- What would make the first week a success?
`,
}

export const ASSISTANT_SUGGESTIONS = [
  {
    id: "growth",
    prompt: "Show revenue growth by region",
    detail: "Chart and table",
  },
  {
    id: "churn",
    prompt: "Summarize this quarter's churn",
    detail: "From the revenue export",
  },
  {
    id: "benchmarks",
    prompt: "Compare us with SaaS benchmarks",
    detail: "Searches the web",
  },
  {
    id: "email",
    prompt: "Draft a launch email for weekly reports",
    detail: "From the launch brief",
  },
] as const

const promptList = ASSISTANT_SUGGESTIONS.map(
  ({ prompt }) => `- ${prompt}`
).join("\n")

const thanks: AssistantReplyScript = {
  id: "thanks",
  steps: [],
  text: "You're welcome.\n",
}

const hello: AssistantReplyScript = {
  id: "hello",
  steps: [],
  text: `Hi Ada. I can read your files, run code on them and search the web. Try one of these:

${promptList}
`,
}

/** Fits any question, because it answers none of them. */
const fallback: AssistantReplyScript = {
  id: "fallback",
  steps: [],
  text: `I don't have an answer to that. This demo replies to a few questions only, until a model is connected to it.

It can answer these:

${promptList}
`,
}

function createUnreadFileScript(
  attachments: AssistantAttachment[]
): AssistantReplyScript {
  const names = attachments.map(({ name }) => `**${name}**`).join(", ")
  return {
    id: "unread-file",
    steps: [],
    text: `I can't read ${names}. This demo opens its sample file only, until a model is connected to it.\n`,
  }
}

const RULES: AssistantReplyRule[] = [
  {
    script: growth,
    needs: [/\bregions?\b/, /\b(grew|growth|revenue)\b/],
    rejects:
      /\b(why|should|could|will|forecast|predict|next|plan|hire|last year|q[124]|market|benchmarks?|churn|draft|write|email|sql)\b/,
  },
  {
    script: benchmarks,
    needs: [
      /\b(benchmarks?|the market|industry)\b/,
      /\b(compare|against|versus|vs)\b/,
    ],
    rejects:
      /\b(why|should|could|will|forecast|predict|next|job|stock|labou?r|housing|draft|write|email|sql|price|pricing)\b/,
  },
  {
    script: churn,
    needs: [
      /\bchurn\b/,
      /\b(quarter('s)?|q3|our)\b/,
      /\b(summar(y|ize|ise)|show|what('s| is| was)|how (is|was|much))\b/,
    ],
    rejects:
      /\b(why|should|could|will|reduce|improve|lower|calculate|mean|forecast|predict|next|last|q[124]|market|benchmarks?|compare|regions?|plans?|draft|write|email|sql)\b/,
  },
  {
    script: launchEmail,
    needs: [/\b(draft|write)\b/, /\bemail\b/, /\b(launch|weekly reports)\b/],
    rejects: /\b(translate|reply|apology|shorter|rewrite|sms|post)\b/,
  },
  {
    script: pricingCopy,
    needs: [/\b(review|improve)\b/, /\bpricing page\b/],
    rejects: /\b(who|when|why|legal|seo|translate|rewrite)\b/,
  },
  {
    script: cohortSql,
    needs: [/\bsql\b/, /\bcohorts?\b/, /\bretention\b/],
    rejects: /\b(why|explain|weekly|daily|churn|fix)\b/,
  },
  {
    script: boardUpdate,
    needs: [/\b(outline|draft|write)\b/, /\bboard update\b/],
    rejects: /\b(cancel|send|email|translate)\b/,
  },
  {
    script: competitors,
    needs: [/\bcompetitors?\b/, /\b(feature|matrix|compare)\b/],
    rejects: /\b(why|should|pric(e|ing)|revenue|funding)\b/,
  },
  {
    script: survey,
    needs: [/\bquestions?\b/, /\bonboarding survey\b/],
    rejects: /\b(answers?|results?|translate)\b/,
  },
  {
    script: thanks,
    needs: [
      /^(thanks|thank you|great|perfect)[\s,]*(a lot|ada|so much)?[.!\s]*$/,
    ],
  },
  {
    script: hello,
    needs: [/^((hi|hello|hey)( there)?|what can you do)[.!?\s]*$/],
  },
]

const MAX_QUESTION = 160

function matchesRule(message: string, { needs, rejects }: AssistantReplyRule) {
  return (
    needs.every((pattern) => pattern.test(message)) && !rejects?.test(message)
  )
}

/** The reply to a message. A question that isn't clearly one of them gets the fallback. */
export function pickReplyScript(
  text: string,
  attachments: AssistantAttachment[]
): AssistantReplyScript {
  const unread = attachments.filter(({ name }) => name !== SAMPLE_FILE.name)
  if (unread.length > 0) return createUnreadFileScript(unread)

  const message = text.toLowerCase().replaceAll("’", "'").trim()
  if (message.length > MAX_QUESTION) return fallback
  const matches = RULES.filter((rule) => matchesRule(message, rule))
  return matches.length === 1 && matches[0] ? matches[0].script : fallback
}

/** What a blocked step brings once its service is connected. */
export const ASSISTANT_CONNECTIONS: Record<
  string,
  { detail: string; seconds: number; text: string }
> = {
  Gartner: {
    detail: "14 pages",
    seconds: 1.8,
    text: `

**Gartner's report agrees.** Its median for companies with $10M to $50M of ARR is 5.4% a quarter, and its top quartile starts at 9.1%, so your 8.0% sits between the two.
`,
  },
}

/** A script's parts once it has played, for the sample chats. */
export function createFinishedParts(
  script: AssistantReplyScript,
  idPrefix: string
): AssistantPart[] {
  return [
    ...script.steps.map(
      ({ step, result }, index): AssistantPart => ({
        type: "step",
        step: { ...step, ...result, id: `${idPrefix}-step-${index + 1}` },
      })
    ),
    { type: "text", text: script.text },
    ...(script.artifact
      ? [{ type: "artifact" as const, artifact: script.artifact }]
      : []),
  ]
}
