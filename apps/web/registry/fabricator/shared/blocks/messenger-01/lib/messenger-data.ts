import {
  ME,
  type ChatMessage,
  type Conversation,
  type Person,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"

// Sample conversations. Replace with your messaging backend: people,
// conversations with their latest messages, and a live feed for new ones.

/** The moment the sample data was written around: Tuesday, 9:41 AM. */
export const SAMPLE_NOW = Date.UTC(2026, 10, 17, 9, 41)

/** Fixed so the server and the browser print the same times. */
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

function photo(id: string, size: number) {
  return `https://images.unsplash.com/photo-${id}?w=${size}&h=${size}&fit=crop&auto=format&q=80`
}

export const ME_PERSON = {
  name: "Gabs Fabricator",
  email: "gabs@fabricator.dev",
}

export const PEOPLE: Person[] = [
  {
    id: "maya",
    name: "Maya Chen",
    avatar: photo("1534528741775-53994a69daeb", 160),
    presence: { kind: "online" },
    phone: "+351 912 345 678",
    email: "maya.chen@example.com",
  },
  {
    id: "lucas",
    name: "Lucas Ferreira",
    avatar: photo("1500648767791-00dcc994a43e", 160),
    presence: { kind: "offline", lastSeenAt: SAMPLE_NOW - 2 * HOUR },
    phone: "+351 913 220 145",
    email: "lucas@example.com",
  },
  {
    id: "sofia",
    name: "Sofia Marques",
    avatar: photo("1494790108377-be9c29b29330", 160),
    presence: { kind: "online" },
    phone: "+351 916 870 332",
    email: "sofia.marques@example.com",
  },
  {
    id: "daniel",
    name: "Daniel Okafor",
    avatar: photo("1507003211169-0a1dd7228f2d", 160),
    presence: { kind: "offline", lastSeenAt: SAMPLE_NOW - 26 * HOUR },
    phone: "+44 7700 900 412",
    email: "daniel.okafor@example.com",
  },
  {
    id: "emma",
    name: "Emma Lindqvist",
    avatar: photo("1438761681033-6461ffad8d80", 160),
    presence: { kind: "offline", lastSeenAt: SAMPLE_NOW - 40 * MINUTE },
    phone: "+46 70 123 45 67",
    email: "emma@example.com",
  },
  {
    id: "tom",
    name: "Tom Becker",
    avatar: photo("1472099645785-5658abf4ff4e", 160),
    presence: { kind: "offline", lastSeenAt: SAMPLE_NOW - 6 * DAY },
    phone: "+49 151 2345 6789",
    email: "tom.becker@example.com",
  },
  {
    id: "nora",
    name: "Nora Ahmed",
    avatar: photo("1544005313-94ddf0286df2", 160),
    presence: { kind: "online" },
    phone: "+351 917 554 210",
    email: "nora.ahmed@example.com",
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

function text(
  id: string,
  senderId: string,
  sentAt: number,
  value: string,
  extra: Partial<ChatMessage> = {}
): ChatMessage {
  return { id, senderId, sentAt, body: { kind: "text", text: value }, ...extra }
}

export const CONVERSATIONS: Conversation[] = [
  {
    id: "maya",
    kind: "direct",
    title: "Maya Chen",
    memberIds: ["maya"],
    unreadCount: 0,
    isPinned: true,
    isMuted: false,
    messages: [
      text("m1", "maya", at(1, 18, 2), "Found the place for Saturday."),
      {
        id: "m2",
        senderId: "maya",
        sentAt: at(1, 18, 3),
        body: {
          kind: "image",
          src: photo("1501785888041-af3ef285b470", 960),
          alt: "A turquoise lake under pale mountains, with a wooden rowing boat",
          caption: "Lago di Braies at 7am, before the crowds",
        },
        reactions: [{ emoji: "😍", count: 1, label: "Loved by you" }],
      },
      text("m3", ME, at(1, 18, 10), "That water can't be real"),
      text("m4", ME, at(1, 18, 11), "I'm in. Can you send me the plan?"),
      {
        id: "m5",
        senderId: "maya",
        sentAt: at(1, 18, 40),
        body: {
          kind: "file",
          name: "dolomites-weekend.pdf",
          size: "1.2 MB",
        },
      },
      {
        id: "m6",
        senderId: "maya",
        sentAt: at(0, 8, 52),
        body: {
          kind: "voice",
          src: VOICE_SRC,
          duration: 52,
          peaks: VOICE_PEAKS,
        },
      },
      text(
        "m7",
        "maya",
        at(0, 8, 53),
        "Short version: we leave Friday at 6 and I drive the first half."
      ),
      text(
        "m8",
        ME,
        at(0, 9, 5),
        "Perfect. I'll bring the camera and the good coffee.",
        {
          readAt: at(0, 9, 6),
          reactions: [{ emoji: "☕", count: 1, label: "Coffee from Maya" }],
        }
      ),
      text(
        "m9",
        "maya",
        at(0, 9, 38),
        "Could you book the 9:10 ferry on Saturday? It sells out by Thursday."
      ),
    ],
  },
  {
    id: "dolomites",
    kind: "group",
    title: "Dolomites weekend",
    avatar: photo("1529156069898-49953e39b3ac", 160),
    memberIds: ["maya", "lucas", "sofia"],
    unreadCount: 3,
    isPinned: true,
    isMuted: false,
    messages: [
      text("d1", "maya", at(1, 20, 4), "Group's here. Plan's in the PDF."),
      text("d2", ME, at(1, 20, 6), "Thanks for organising this"),
      text(
        "d3",
        "lucas",
        at(0, 9, 12),
        "Car's booked. Seven seats, so bring whatever you want."
      ),
      text("d4", "sofia", at(0, 9, 20), "I'll do the groceries on Friday"),
      text("d5", "sofia", at(0, 9, 20), "Anyone vegetarian?"),
      text("d6", "lucas", at(0, 9, 31), "Me, mostly. Cheese counts though."),
    ],
  },
  {
    id: "sofia",
    kind: "direct",
    title: "Sofia Marques",
    memberIds: ["sofia"],
    unreadCount: 1,
    isPinned: false,
    isMuted: false,
    messages: [
      text("s1", ME, at(1, 16, 20), "Prototype's up on the staging link."),
      text(
        "s2",
        "sofia",
        at(0, 8, 15),
        "Just tried it on my phone. The new checkout is so much faster."
      ),
    ],
  },
  {
    id: "design",
    kind: "group",
    title: "Design team",
    memberIds: ["nora", "sofia", "daniel"],
    unreadCount: 12,
    isPinned: false,
    isMuted: true,
    messages: [
      text("t1", "daniel", at(0, 7, 40), "Pushed the new icon set to Figma"),
      text("t2", "nora", at(0, 7, 58), "Moved the review to 3pm, same room"),
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
      text("l1", "lucas", at(1, 19, 2), "Sending the invoice tonight"),
      text("l2", ME, at(1, 19, 15), "Thanks, got it", {
        readAt: at(1, 19, 16),
      }),
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
    messages: [
      {
        id: "e1",
        senderId: "emma",
        sentAt: at(5, 17, 30),
        body: {
          kind: "voice",
          src: VOICE_SRC,
          duration: 21,
          peaks: VOICE_PEAKS,
        },
      },
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
      {
        id: "o1",
        senderId: "daniel",
        sentAt: at(3, 12, 8),
        body: {
          kind: "image",
          src: photo("1506905925346-21bda4d32df4", 960),
          alt: "Mountain ridges above a sea of clouds",
        },
      },
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
      {
        id: "n1",
        senderId: "nora",
        sentAt: at(7, 10, 2),
        body: {
          kind: "file",
          name: "brand-guidelines-v3.pdf",
          size: "8.4 MB",
        },
      },
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
      text("b1", ME, at(20, 18, 45), "See you at the climbing gym", {
        readAt: at(20, 19, 2),
      }),
    ],
  },
]

/** What each conversation answers with after you send, in turn. */
export const SAMPLE_REPLIES: Record<
  string,
  { senderId: string; text: string }[]
> = {
  maya: [
    { senderId: "maya", text: "You're the best. See you Friday at 6!" },
    { senderId: "maya", text: "Ha, noted." },
  ],
  dolomites: [
    { senderId: "sofia", text: "Adding it to the list" },
    { senderId: "lucas", text: "Works for me" },
  ],
  sofia: [{ senderId: "sofia", text: "Let's ship it Thursday then" }],
  design: [{ senderId: "nora", text: "Thanks, see you at 3" }],
  lucas: [{ senderId: "lucas", text: "Anytime" }],
  emma: [{ senderId: "emma", text: "Call you after lunch?" }],
  daniel: [{ senderId: "daniel", text: "Next time you're coming with us" }],
  nora: [{ senderId: "nora", text: "Shout if anything's unclear" }],
  tom: [{ senderId: "tom", text: "Thursday works" }],
}
