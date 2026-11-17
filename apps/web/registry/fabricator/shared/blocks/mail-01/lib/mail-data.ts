import {
  ME,
  type MailContact,
  type MailLabelId,
  type MailThread,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"

// Sample mail for the block. Replace it with your mail API. The sample has a
// fixed "now" and prints times in UTC, so the page the server renders reads
// the same as the browser's; a real app passes the person's locale and time
// zone.

export const SAMPLE_NOW = Date.UTC(2026, 10, 17, 15, 20)

export const SAMPLE_TIME_FORMAT: TimeFormat = {
  locale: "en-US",
  timeZone: "UTC",
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function at(daysAgo: number, hour: number, minute: number) {
  const today = Date.UTC(2026, 10, 17)
  return today - daysAgo * DAY + hour * HOUR + minute * MINUTE
}

function photo(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&auto=format&q=80`
}

export const MAIL_LABELS: {
  id: MailLabelId
  name: string
  /** A chart series colour: picked by the person, not a status. */
  dot: string
}[] = [
  { id: "work", name: "Work", dot: "bg-chart-series-1" },
  { id: "travel", name: "Travel", dot: "bg-chart-series-3" },
  { id: "receipts", name: "Receipts", dot: "bg-chart-series-4" },
  { id: "personal", name: "Personal", dot: "bg-chart-series-5" },
]

export const MAIL_CONTACTS: MailContact[] = [
  {
    id: ME,
    name: "Ada Lovelace",
    email: "ada@acme.com",
    avatar: photo("1580489944761-15a19d654956"),
  },
  {
    id: "maya",
    name: "Maya Chen",
    email: "maya@acme.com",
    avatar: photo("1534528741775-53994a69daeb"),
  },
  {
    id: "lucas",
    name: "Lucas Ferreira",
    email: "lucas@acme.com",
    avatar: photo("1500648767791-00dcc994a43e"),
  },
  {
    id: "sofia",
    name: "Sofia Marques",
    email: "sofia@northwind.io",
    avatar: photo("1494790108377-be9c29b29330"),
  },
  {
    id: "daniel",
    name: "Daniel Okafor",
    email: "daniel@acme.com",
    avatar: photo("1507003211169-0a1dd7228f2d"),
  },
  {
    id: "emma",
    name: "Emma Lindqvist",
    email: "emma.lindqvist@example.com",
    avatar: photo("1438761681033-6461ffad8d80"),
  },
  {
    id: "tom",
    name: "Tom Becker",
    email: "tom@acme.com",
    avatar: photo("1472099645785-5658abf4ff4e"),
  },
  {
    id: "nora",
    name: "Nora Ahmed",
    email: "nora@acme.com",
    avatar: photo("1544005313-94ddf0286df2"),
  },
  { id: "priya", name: "Priya Raman", email: "priya@acme.com" },
  { id: "jonas", name: "Jonas Weber", email: "jonas.weber@example.com" },
  {
    id: "stripe",
    name: "Stripe",
    email: "receipts@stripe.com",
    brand: "stripe",
  },
  {
    id: "linear",
    name: "Linear",
    email: "notifications@linear.app",
    brand: "linear",
  },
  { id: "figma", name: "Figma", email: "no-reply@figma.com", brand: "figma" },
  {
    id: "vercel",
    name: "Vercel",
    email: "notifications@vercel.com",
    brand: "vercel",
  },
  {
    id: "github",
    name: "GitHub",
    email: "notifications@github.com",
    brand: "github",
  },
  { id: "notion", name: "Notion", email: "team@notion.so", brand: "notion" },
  {
    id: "booking",
    name: "Booking.com",
    email: "noreply@booking.com",
    brand: "booking",
  },
  { id: "prizes", name: "Prize Desk", email: "winner@prize-desk.biz" },
]

/** The people Compose suggests, everyone with a person's address. */
export const MAIL_RECIPIENTS = MAIL_CONTACTS.filter(
  ({ id, brand }) => id !== ME && !brand && id !== "prizes"
)

type ThreadSeed = Omit<
  MailThread,
  "box" | "isUnread" | "isStarred" | "labels"
> &
  Partial<Pick<MailThread, "box" | "isUnread" | "isStarred" | "labels">>

function thread({
  box = "inbox",
  isUnread = false,
  isStarred = false,
  labels = [],
  ...seed
}: ThreadSeed): MailThread {
  return { box, isUnread, isStarred, labels, ...seed }
}

export const MAIL_THREADS: MailThread[] = [
  thread({
    id: "q4-plan",
    subject: "Q4 planning: draft for Thursday",
    isUnread: true,
    isStarred: true,
    labels: ["work"],
    messages: [
      {
        id: "q4-plan-1",
        fromId: "maya",
        toIds: [ME],
        ccIds: ["lucas"],
        sentAt: at(1, 16, 10),
        body: "Hi Ada,\n\nCould you look over the goals section before I share the plan with the leads? I kept it to three bets this time.\n\nMaya",
      },
      {
        id: "q4-plan-2",
        fromId: ME,
        toIds: ["maya"],
        ccIds: ["lucas"],
        sentAt: at(1, 17, 2),
        body: "Looks focused. The second bet needs a number we can measure by December, otherwise it reads as a theme rather than a goal.",
      },
      {
        id: "q4-plan-3",
        fromId: "maya",
        toIds: [ME],
        ccIds: ["lucas"],
        sentAt: at(0, 14, 52),
        body: "Good call. I set it to 40% of new workspaces finishing setup in their first week, which is where we were in March.\n\nThe updated draft is attached. If it reads well to you, I'll send it to the leads tomorrow morning.\n\nMaya",
        attachments: [{ name: "q4-plan-draft-v3.pdf", size: "1.8 MB" }],
      },
    ],
  }),
  thread({
    id: "payout",
    subject: "Your payout of $18,240.00 is on the way",
    isUnread: true,
    labels: ["receipts"],
    messages: [
      {
        id: "payout-1",
        fromId: "stripe",
        toIds: [ME],
        sentAt: at(0, 13, 5),
        body: "A payout of $18,240.00 to your account ending in 4821 is on its way. It should arrive by Thursday, November 19.\n\nPayout ID: po_1QZ8eK2Lb7\nCovering charges from November 10 to November 16.",
      },
    ],
  }),
  thread({
    id: "design-review",
    subject: "Design review notes: new onboarding",
    isUnread: true,
    labels: ["work"],
    messages: [
      {
        id: "design-review-1",
        fromId: "lucas",
        toIds: [ME, "maya"],
        sentAt: at(0, 11, 40),
        body: "Thanks for the time this morning. The short version:\n\n1. Keep the workspace name step, drop the role question.\n2. Move the template picker after the first project exists.\n3. Invite teammates stays optional, with a reminder on day two.\n\nI exported the flow with the changes marked.",
        attachments: [{ name: "onboarding-flow-v4.png", size: "2.4 MB" }],
      },
    ],
  }),
  thread({
    id: "linear-482",
    subject: "ACME-482 was assigned to you: CSV export times out",
    labels: ["work"],
    messages: [
      {
        id: "linear-482-1",
        fromId: "linear",
        toIds: [ME],
        sentAt: at(0, 10, 12),
        body: "Tom Becker assigned ACME-482 to you.\n\nCSV export times out for workspaces with more than 50,000 rows. Priority: High. Cycle: 47.",
      },
    ],
  }),
  thread({
    id: "lisbon-stay",
    subject: "Your booking is confirmed: Memmo Alfama, Lisbon",
    isStarred: true,
    labels: ["travel"],
    messages: [
      {
        id: "lisbon-stay-1",
        fromId: "booking",
        toIds: [ME],
        sentAt: at(1, 19, 20),
        body: "Your stay is confirmed.\n\nCheck-in: Thursday, December 3, from 3:00 PM\nCheck-out: Sunday, December 6, until 11:00 AM\n2 guests, 1 room. Free cancellation until November 30.",
      },
    ],
  }),
  thread({
    id: "renewal",
    subject: "Contract renewal for 2027",
    isUnread: true,
    labels: ["work"],
    messages: [
      {
        id: "renewal-1",
        fromId: "sofia",
        toIds: [ME],
        sentAt: at(1, 16, 45),
        body: "Hi Ada,\n\nAttached is our proposal for 2027: the same seats, the analytics add-on included, and a 12% discount for a two-year term.\n\nWe need a signature by December 15 to keep this year's rate. Happy to walk through it on a call.\n\nBest,\nSofia",
        attachments: [{ name: "northwind-renewal-2027.pdf", size: "640 KB" }],
      },
    ],
  }),
  thread({
    id: "release",
    subject: "[acme/web] Release v2.8.0 is ready for review",
    labels: ["work"],
    messages: [
      {
        id: "release-1",
        fromId: "github",
        toIds: [ME],
        sentAt: at(1, 12, 3),
        body: "Daniel Okafor requested your review on Release v2.8.0.\n\n24 commits, 3 contributors. Checks: all passed.",
      },
    ],
  }),
  thread({
    id: "dinner",
    subject: "Dinner on Saturday?",
    labels: ["personal"],
    messages: [
      {
        id: "dinner-1",
        fromId: "emma",
        toIds: [ME],
        sentAt: at(2, 20, 15),
        body: "We're cooking on Saturday, around 8. Bring Jonas if he's back from Berlin!",
      },
      {
        id: "dinner-2",
        fromId: ME,
        toIds: ["emma"],
        sentAt: at(2, 21, 2),
        body: "Count us in. I'll bring dessert.",
      },
    ],
  }),
  thread({
    id: "bandwidth",
    subject: "Usage alert: 80% of this month's bandwidth used",
    labels: ["work"],
    messages: [
      {
        id: "bandwidth-1",
        fromId: "vercel",
        toIds: [ME],
        sentAt: at(3, 9, 30),
        body: "Your team acme has used 80% of its included bandwidth for November. At the current rate you'll reach the limit on November 26.",
      },
    ],
  }),
  thread({
    id: "figma-invite",
    subject: "Tom Becker invited you to “Billing redesign”",
    messages: [
      {
        id: "figma-invite-1",
        fromId: "figma",
        toIds: [ME],
        sentAt: at(3, 15, 48),
        body: "Tom Becker invited you to edit “Billing redesign” in the Acme team.",
      },
    ],
  }),
  thread({
    id: "offsite",
    subject: "Team offsite in Sintra: agenda and rooms",
    isStarred: true,
    labels: ["work", "travel"],
    messages: [
      {
        id: "offsite-1",
        fromId: "daniel",
        toIds: [ME, "maya", "lucas", "nora"],
        sentAt: at(4, 10, 5),
        body: "Hi all,\n\nThe agenda is attached. We arrive Wednesday by noon, workshops on Thursday, and a free afternoon on Friday before the train back.\n\nRooms are shared in pairs; reply by Friday if you'd like a single.\n\nDaniel",
        attachments: [{ name: "sintra-offsite-agenda.pdf", size: "320 KB" }],
      },
    ],
  }),
  thread({
    id: "notion-digest",
    subject: "Your weekly digest: 12 pages updated",
    messages: [
      {
        id: "notion-digest-1",
        fromId: "notion",
        toIds: [ME],
        sentAt: at(5, 8, 0),
        body: "12 pages were updated in Acme this week, including “Pricing experiments”, “Hiring plan 2027” and “Support playbook”.",
      },
    ],
  }),
  thread({
    id: "figma-receipt",
    subject: "Receipt for your Figma Organization plan",
    labels: ["receipts"],
    messages: [
      {
        id: "figma-receipt-1",
        fromId: "figma",
        toIds: [ME],
        sentAt: at(8, 7, 12),
        body: "Thanks for your payment of $2,700.00 for 30 seats on the Organization plan, November 2026.",
        attachments: [{ name: "figma-receipt-nov-2026.pdf", size: "88 KB" }],
      },
    ],
  }),
  thread({
    id: "interviews",
    subject: "Interview loop for the design engineer role",
    labels: ["work"],
    messages: [
      {
        id: "interviews-1",
        fromId: "nora",
        toIds: [ME, "lucas"],
        sentAt: at(9, 14, 30),
        body: "Three candidates made it to the final loop. I've put you on the systems interview for all three; slots are on your calendar.",
      },
    ],
  }),
  thread({
    id: "flight",
    subject: "Flight confirmed: Lisbon to Berlin, December 4",
    labels: ["travel"],
    messages: [
      {
        id: "flight-1",
        fromId: "booking",
        toIds: [ME],
        sentAt: at(12, 18, 40),
        body: "Your flight is confirmed. Departure Friday, December 4 at 7:05 AM from Lisbon (LIS), arriving 11:20 AM in Berlin (BER). Booking reference: 7QZ4KD.",
      },
    ],
  }),
  thread({
    id: "expenses",
    subject: "Expenses for the offsite",
    labels: ["receipts", "work"],
    messages: [
      {
        id: "expenses-1",
        fromId: "priya",
        toIds: [ME],
        sentAt: at(14, 11, 15),
        body: "Here's the sheet with everyone's offsite expenses so far. Could you approve yours by the end of the month?",
        attachments: [{ name: "offsite-expenses.xlsx", size: "54 KB" }],
      },
    ],
  }),
  thread({
    id: "climbing",
    subject: "Photos from the climbing trip",
    labels: ["personal"],
    messages: [
      {
        id: "climbing-1",
        fromId: "jonas",
        toIds: [ME],
        sentAt: at(20, 21, 30),
        body: "Finally sorted the photos. The one on the last pitch is my favourite.",
        attachments: [{ name: "arrabida-climbing.zip", size: "86 MB" }],
      },
    ],
  }),
  thread({
    id: "okr",
    subject: "Quarterly OKR check-in",
    snoozedUntil: at(-1, 8, 0),
    labels: ["work"],
    messages: [
      {
        id: "okr-1",
        fromId: "tom",
        toIds: [ME],
        sentAt: at(2, 9, 0),
        body: "Can you add your team's progress to the OKR doc before Wednesday's check-in?",
      },
    ],
  }),
  thread({
    id: "pricing-feedback",
    subject: "Feedback on the pricing page",
    box: "sent",
    messages: [
      {
        id: "pricing-feedback-1",
        fromId: ME,
        toIds: ["lucas"],
        sentAt: at(2, 17, 30),
        body: "Lucas, the new pricing page reads much clearer. Two notes: the yearly toggle should default to yearly, and the enterprise row needs a contact link rather than a price.",
      },
    ],
  }),
  thread({
    id: "renewal-draft",
    subject: "Re: Contract renewal for 2027",
    box: "drafts",
    messages: [
      {
        id: "renewal-draft-1",
        fromId: ME,
        toIds: ["sofia"],
        sentAt: at(0, 9, 10),
        body: "Hi Sofia, thanks for the proposal. Before we sign, could you",
      },
    ],
  }),
  thread({
    id: "cloud-receipt",
    subject: "Receipt from Acme Cloud",
    box: "archive",
    labels: ["receipts"],
    messages: [
      {
        id: "cloud-receipt-1",
        fromId: "stripe",
        toIds: [ME],
        sentAt: at(31, 6, 0),
        body: "Receipt #2291-0447 for $1,120.00, paid with the card ending in 4821.",
      },
    ],
  }),
  thread({
    id: "cruise",
    subject: "You've been selected for a free cruise",
    box: "spam",
    isUnread: true,
    messages: [
      {
        id: "cruise-1",
        fromId: "prizes",
        toIds: [ME],
        sentAt: at(1, 3, 12),
        body: "Claim your prize within 24 hours by confirming your card details.",
      },
    ],
  }),
  thread({
    id: "webinar",
    subject: "Webinar: scaling a design system",
    box: "trash",
    messages: [
      {
        id: "webinar-1",
        fromId: "notion",
        toIds: [ME],
        sentAt: at(6, 13, 0),
        body: "Join us on Thursday for a live session on scaling a design system across teams.",
      },
    ],
  }),
]
