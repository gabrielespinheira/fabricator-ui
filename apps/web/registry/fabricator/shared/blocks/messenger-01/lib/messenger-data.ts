import {
  createMessengerState,
  ME,
  type ChatMessage,
  type Conversation,
  type Person,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"

// Sample conversations. Replace with your messaging backend: people,
// conversations with their latest messages, and a live feed for new ones.

/** The moment the sample data was written around: Tuesday, 9:41 AM. */
export const SAMPLE_NOW = Date.UTC(2026, 10, 24, 9, 41)

/** Fixed so the server and the browser print the same times. */
export const SAMPLE_TIME_FORMAT: TimeFormat = {
  locale: "en-US",
  timeZone: "UTC",
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function at(daysAgo: number, hour: number, minute: number) {
  const today = Date.UTC(2026, 10, 24)
  return today - daysAgo * DAY + hour * HOUR + minute * MINUTE
}

function portrait(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&auto=format&q=80`
}

function picture(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=1280&h=960&fit=crop&auto=format&q=80`
}

export const WORKSPACES = [
  { id: "acme", name: "Acme Inc", description: "48 people" },
  { id: "northwind", name: "Northwind", description: "Guest" },
]

export const ME_PERSON = {
  name: "Ada Lovelace",
  email: "ada@acme.com",
  avatarUrl: portrait("1580489944761-15a19d654956"),
}

export const PEOPLE: Person[] = [
  {
    id: "maya",
    name: "Maya Chen",
    avatar: portrait("1534528741775-53994a69daeb"),
    presence: { kind: "online" },
    role: "Product designer",
    timeZone: "America/New_York",
    phone: "+1 917 555 0142",
    email: "maya@acme.com",
  },
  {
    id: "lucas",
    name: "Lucas Ferreira",
    avatar: portrait("1500648767791-00dcc994a43e"),
    presence: { kind: "offline", lastSeenAt: SAMPLE_NOW - 2 * HOUR },
    role: "Engineering manager",
    timeZone: "Europe/Lisbon",
    phone: "+351 913 220 145",
    email: "lucas@acme.com",
  },
  {
    id: "daniel",
    name: "Daniel Okafor",
    avatar: portrait("1507003211169-0a1dd7228f2d"),
    presence: { kind: "online" },
    role: "Customer success",
    timeZone: "Europe/London",
    phone: "+44 7700 900 412",
    email: "daniel@acme.com",
  },
  {
    id: "emma",
    name: "Emma Lindqvist",
    avatar: portrait("1438761681033-6461ffad8d80"),
    presence: { kind: "online" },
    role: "Head of operations",
    timeZone: "Europe/Stockholm",
    phone: "+46 70 123 45 67",
    email: "emma@acme.com",
  },
  {
    id: "tom",
    name: "Tom Becker",
    avatar: portrait("1472099645785-5658abf4ff4e"),
    presence: { kind: "offline", lastSeenAt: SAMPLE_NOW - 6 * DAY },
    role: "Sales",
    timeZone: "Europe/Berlin",
    phone: "+49 151 2345 6789",
    email: "tom@acme.com",
  },
  {
    id: "nora",
    name: "Nora Ahmed",
    avatar: portrait("1544005313-94ddf0286df2"),
    presence: { kind: "online" },
    role: "Brand designer",
    timeZone: "Europe/Lisbon",
    phone: "+351 917 554 210",
    email: "nora@acme.com",
  },
  {
    id: "priya",
    name: "Priya Raman",
    presence: { kind: "offline", lastSeenAt: SAMPLE_NOW - 35 * MINUTE },
    role: "Data analyst",
    timeZone: "Asia/Kolkata",
    phone: "+91 98450 01234",
    email: "priya@acme.com",
  },
  {
    id: "sofia",
    name: "Sofia Marques",
    avatar: portrait("1494790108377-be9c29b29330"),
    presence: { kind: "online" },
    role: "Head of product, Northwind",
    timeZone: "Europe/Lisbon",
    phone: "+351 916 870 332",
    email: "sofia@northwind.io",
  },
]

const VOICE_PEAKS = [
  0, 0.01, 0.12, 0.14, 0.1, 0.12, 0.68, 1, 0.62, 0.44, 0.27, 1, 1, 0.67, 0.21,
  0.94, 0.81, 0.48, 0.26, 0.28, 1, 1, 0.75, 0.55, 0.3, 0.36, 0.31, 0.62, 0.61,
  0.59, 0.52, 0.95, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.54, 0.36, 0.22, 0.33, 0.72,
  0.55, 0.49, 0.23, 1, 0.75, 0.47, 0.44, 0.36, 0.18, 0.19, 0.33, 0.85, 1, 1,
  0.61, 0.19, 0.04, 0,
]

const VOICE_SRC = "https://fabricator-ui.vercel.app/media/sintel-trailer.m4a"

type Extra = Omit<Partial<ChatMessage>, "id" | "senderId" | "sentAt" | "body">

function text(
  id: string,
  senderId: string,
  sentAt: number,
  value: string,
  extra: Extra = {}
): ChatMessage {
  return { id, senderId, sentAt, body: { kind: "text", text: value }, ...extra }
}

function image(
  id: string,
  senderId: string,
  sentAt: number,
  photo: { id: string; alt: string; caption?: string },
  extra: Extra = {}
): ChatMessage {
  return {
    id,
    senderId,
    sentAt,
    body: {
      kind: "image",
      src: picture(photo.id),
      alt: photo.alt,
      caption: photo.caption,
    },
    ...extra,
  }
}

function file(
  id: string,
  senderId: string,
  sentAt: number,
  name: string,
  size: string
): ChatMessage {
  return { id, senderId, sentAt, body: { kind: "file", name, size } }
}

function voice(
  id: string,
  senderId: string,
  sentAt: number,
  duration: number
): ChatMessage {
  return {
    id,
    senderId,
    sentAt,
    body: { kind: "voice", src: VOICE_SRC, duration, peaks: VOICE_PEAKS },
  }
}

const CONVERSATIONS: Conversation[] = [
  {
    id: "offsite",
    kind: "group",
    title: "Lisbon offsite",
    avatar: portrait("1585208798174-6cedd86e019a"),
    memberIds: ["emma", "maya", "lucas", "daniel"],
    unreadCount: 4,
    isPinned: true,
    isMuted: false,
    messages: [
      text(
        "o1",
        "emma",
        at(5, 15, 2),
        "The house is booked for March. Three days, 14 of us, and everything is a walk away."
      ),
      file("o2", "emma", at(5, 15, 3), "lisbon-offsite-agenda.pdf", "1.2 MB"),
      file("o3", "emma", at(5, 15, 3), "rooms-and-flights.xlsx", "48 KB"),
      image("o4", "lucas", at(5, 15, 20), {
        id: "1585208798174-6cedd86e019a",
        alt: "A yellow tram climbing a street between old buildings",
        caption: "Tram 28 stops outside",
      }),
      image("o5", "lucas", at(5, 15, 21), {
        id: "1548707309-dcebeab9ea9b",
        alt: "A wide square with a triumphal arch under a blue sky",
        caption: "And this is five minutes on foot",
      }),
      text("o6", ME, at(5, 15, 40), "Sold. Where do we work?", {
        readBy: ["maya", "lucas", "daniel", "emma"],
      }),
      image("o7", "daniel", at(1, 10, 5), {
        id: "1555396273-367ea4eb4db5",
        alt: "A bright café with tall windows and long wooden tables",
        caption: "The whole ground floor until 6 PM",
      }),
      image("o8", "daniel", at(1, 10, 6), {
        id: "1414235077428-338989a2e8c0",
        alt: "A plated dinner with wine glasses on a dark table",
      }),
      image(
        "o9",
        "maya",
        at(1, 10, 31),
        {
          id: "1517457373958-b7bdd4587205",
          alt: "People at an evening party under string lights",
          caption: "Wednesday, if the weather holds",
        },
        { reactions: [{ emoji: "👏", personIds: ["emma", ME] }] }
      ),
      image(
        "o10",
        "maya",
        at(0, 8, 49),
        {
          id: "1580323956656-26bbb1206e34",
          alt: "Red rooftops running down to the river",
          caption: "Breakfast, every morning",
        },
        { reactions: [{ emoji: "❤️", personIds: ["lucas", "emma", ME] }] }
      ),
      text("o11", ME, at(0, 8, 58), "That settles the early flight question"),
      text("o12", ME, at(0, 8, 58), "Is the long table ours on Thursday?", {
        readBy: ["maya", "lucas", "daniel", "emma"],
      }),
      voice("o13", "lucas", at(0, 9, 12), 52),
      text(
        "o14",
        "lucas",
        at(0, 9, 13),
        "Short version: we land at 11 and the vans leave at noon."
      ),
      text(
        "o15",
        "daniel",
        at(0, 9, 31),
        "Yes, from 8 PM. I asked for the side with the view.",
        {
          replyToId: "o12",
          reactions: [{ emoji: "👍", personIds: ["maya", "lucas"] }],
        }
      ),
      text("o16", "daniel", at(0, 9, 32), "Anyone vegetarian?"),
    ],
  },
  {
    id: "maya",
    kind: "direct",
    title: "Maya Chen",
    memberIds: ["maya"],
    unreadCount: 0,
    isPinned: true,
    isMuted: false,
    messages: [
      text("m1", "maya", at(1, 14, 2), "First pass at the new checkout."),
      image("m2", "maya", at(1, 14, 3), {
        id: "1581291518857-4e27b48ff24e",
        alt: "A hand sketching wireframes on paper",
        caption: "Paper first, so nobody argues about colours",
      }),
      image("m3", "maya", at(1, 14, 5), {
        id: "1586717791821-3f44a563fa4c",
        alt: "Wireframes drawn on a tablet beside a keyboard",
      }),
      text("m4", ME, at(1, 14, 10), "The second one is much calmer"),
      text("m5", ME, at(1, 14, 11), "Can you send me the spec?", {
        readAt: at(1, 14, 12),
      }),
      file("m6", "maya", at(1, 14, 40), "checkout-spec.pdf", "840 KB"),
      image("m7", "maya", at(0, 8, 50), {
        id: "1561070791-2526d30994b5",
        alt: "Printed colour swatches beside a phone",
        caption: "Now we can argue about colours",
      }),
      text(
        "m8",
        ME,
        at(0, 9, 5),
        "I like the warm set. Can we test it on the pricing page first?",
        {
          readAt: at(0, 9, 6),
          reactions: [{ emoji: "👍", personIds: ["maya"] }],
        }
      ),
      text(
        "m9",
        "maya",
        at(0, 9, 24),
        "Deal. I'll have it on staging after lunch."
      ),
    ],
  },
  {
    id: "sofia",
    kind: "direct",
    title: "Sofia Marques",
    memberIds: ["sofia"],
    unreadCount: 2,
    isPinned: false,
    isMuted: false,
    messages: [
      text("s1", ME, at(1, 16, 20), "The prototype is on your staging link.", {
        readAt: at(1, 16, 31),
      }),
      text(
        "s2",
        "sofia",
        at(0, 9, 14),
        "Just tried it on my phone. The new checkout is so much faster."
      ),
      text(
        "s3",
        "sofia",
        at(0, 9, 15),
        "Can we show it to the board Thursday?"
      ),
    ],
  },
  {
    id: "design",
    kind: "group",
    title: "Design crit",
    memberIds: ["nora", "maya", "priya"],
    unreadCount: 5,
    isPinned: false,
    isMuted: true,
    messages: [
      text("t1", ME, at(1, 11, 2), "Bring one thing you're unsure about", {
        readBy: ["nora", "maya"],
      }),
      text("t2", "nora", at(0, 7, 40), "I pushed the new icon set"),
      text("t3", "nora", at(0, 7, 41), "The 16px ones are redrawn, not scaled"),
      text(
        "t4",
        "priya",
        at(0, 8, 2),
        "Clicks on the old set by size, as asked"
      ),
      file("t5", "priya", at(0, 8, 2), "icon-clicks-november.csv", "212 KB"),
      text("t6", "nora", at(0, 8, 20), "Moved the review to 3 PM, same room"),
    ],
  },
  {
    id: "daniel",
    kind: "direct",
    title: "Daniel Okafor",
    memberIds: ["daniel"],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    messages: [
      text(
        "d1",
        "daniel",
        at(0, 7, 52),
        "Northwind wants two more seats before the renewal."
      ),
      text("d2", "daniel", at(0, 7, 52), "Can I offer them the old price?"),
      text("d3", ME, at(0, 8, 4), "Yes, until Friday. Copy Sofia on it.", {
        status: "failed",
      }),
    ],
  },
  {
    id: "lucas",
    kind: "direct",
    title: "Lucas Ferreira",
    memberIds: ["lucas"],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    messages: [
      text("l1", "lucas", at(1, 17, 2), "The deploy is out. No errors so far."),
      text("l2", ME, at(1, 17, 15), "Thanks for staying on it"),
    ],
  },
  {
    id: "emma",
    kind: "direct",
    title: "Emma Lindqvist",
    memberIds: ["emma"],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    messages: [voice("e1", "emma", at(4, 15, 30), 21)],
  },
  {
    id: "onboarding",
    kind: "group",
    title: "Northwind onboarding, phase two",
    memberIds: ["sofia", "daniel", "tom", "priya"],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    messages: [
      text(
        "w1",
        "tom",
        at(6, 13, 8),
        "Contract is signed. Over to you, Daniel."
      ),
      text("w2", "daniel", at(6, 13, 30), "Kickoff is on Monday at 10"),
    ],
  },
  {
    id: "nora",
    kind: "direct",
    title: "Nora Ahmed",
    memberIds: ["nora"],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    messages: [
      file("n1", "nora", at(8, 10, 2), "brand-guidelines-v3.pdf", "8.4 MB"),
    ],
  },
  {
    id: "tom",
    kind: "direct",
    title: "Tom Becker",
    memberIds: ["tom"],
    unreadCount: 0,
    isPinned: false,
    isMuted: true,
    messages: [
      text("b1", ME, at(20, 18, 45), "Enjoy the time off", {
        readAt: at(20, 19, 2),
      }),
    ],
  },
]

export const INITIAL_STATE = {
  ...createMessengerState(CONVERSATIONS, "offsite"),
  typing: { offsite: "emma" },
}

/** What the person typing as the screen opens sends next. */
export const SAMPLE_ARRIVAL = {
  id: "offsite",
  senderId: "emma",
  text: "Me. And Nora, if she joins.",
}

/** What each conversation answers with after you send, in turn. */
export const SAMPLE_REPLIES: Record<
  string,
  { senderId: string; text: string }[]
> = {
  offsite: [
    { senderId: "maya", text: "Adding it to the list" },
    { senderId: "lucas", text: "Works for me" },
  ],
  maya: [
    { senderId: "maya", text: "On it" },
    { senderId: "maya", text: "Staging in ten minutes" },
  ],
  sofia: [{ senderId: "sofia", text: "Thursday at 2 then" }],
  design: [{ senderId: "nora", text: "See you at 3" }],
  daniel: [{ senderId: "daniel", text: "Sent. Thank you" }],
  lucas: [{ senderId: "lucas", text: "Anytime" }],
  emma: [{ senderId: "emma", text: "Call you after lunch?" }],
  onboarding: [{ senderId: "sofia", text: "We're ready on our side" }],
  nora: [{ senderId: "nora", text: "Shout if anything is unclear" }],
  tom: [{ senderId: "tom", text: "Back on Thursday" }],
  priya: [{ senderId: "priya", text: "Hi Ada" }],
}
