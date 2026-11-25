import {
  type Invitation,
  type Person,
  type Seats,
  type TeamRow,
} from "@/registry/bases/__base__/blocks/members-01/lib/members-model"

// Sample data. Replace it with your workspace's; the shapes are in the model.

export const SAMPLE_NOW = "2026-11-24T14:20:00Z"
export const WORKSPACE = "Acme Inc"
export const ME_ID = "ada"
export const SIGN_IN_DOMAINS = ["acme.com", "acme.dev"]

export const SEATS: Seats = {
  total: 12,
  pricePerSeat: 12,
  renewsAt: "2026-12-01T00:00:00Z",
}

function getPhoto(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&auto=format&q=80`
}

const PEOPLE: Person[] = [
  {
    kind: "person",
    id: ME_ID,
    name: "Ada Lovelace",
    email: "ada@acme.com",
    photo: getPhoto("1580489944761-15a19d654956"),
    role: "owner",
    teams: ["Operations"],
    lastActiveAt: "2026-11-24T14:20:00Z",
    joinedAt: "2024-02-05T09:00:00Z",
    hasTwoFactor: true,
    signIn: "Google",
    owns: { projects: 4, reports: 3 },
    sessions: [
      {
        id: "ada-1",
        device: "Chrome on macOS",
        kind: "desktop",
        place: "Lisbon",
        lastActiveAt: "2026-11-24T14:20:00Z",
        isCurrent: true,
      },
      {
        id: "ada-2",
        device: "iPhone 17",
        kind: "phone",
        place: "Lisbon",
        lastActiveAt: "2026-11-24T08:02:00Z",
      },
    ],
    activity: [
      {
        id: "ada-a",
        text: "Invited Lena Hoffmann",
        at: "2026-11-23T10:15:00Z",
      },
      {
        id: "ada-b",
        text: "Made Maya Chen an Admin",
        at: "2026-11-18T16:40:00Z",
      },
    ],
  },
  {
    kind: "person",
    id: "maya",
    name: "Maya Chen",
    email: "maya@acme.com",
    photo: getPhoto("1534528741775-53994a69daeb"),
    role: "admin",
    teams: ["Product", "Design"],
    lastActiveAt: "2026-11-24T14:08:00Z",
    joinedAt: "2024-03-11T09:00:00Z",
    hasTwoFactor: true,
    signIn: "Google",
    owns: { projects: 9, reports: 4 },
    sessions: [
      {
        id: "maya-1",
        device: "Arc on macOS",
        kind: "desktop",
        place: "Porto",
        lastActiveAt: "2026-11-24T14:08:00Z",
      },
      {
        id: "maya-2",
        device: "iPad",
        kind: "phone",
        place: "Porto",
        lastActiveAt: "2026-11-22T19:30:00Z",
      },
    ],
    activity: [
      {
        id: "maya-a",
        text: "Changed the time zone to Lisbon",
        at: "2026-11-23T16:12:00Z",
      },
      {
        id: "maya-b",
        text: "Invited Margarethe Schoenberger",
        at: "2026-11-22T11:00:00Z",
      },
      {
        id: "maya-c",
        text: "Created Pricing page refresh",
        at: "2026-11-19T09:20:00Z",
      },
    ],
  },
  {
    kind: "person",
    id: "lucas",
    name: "Lucas Ferreira",
    email: "lucas@acme.com",
    photo: getPhoto("1500648767791-00dcc994a43e"),
    role: "member",
    teams: ["Design"],
    lastActiveAt: "2026-11-24T11:40:00Z",
    joinedAt: "2024-09-02T09:00:00Z",
    hasTwoFactor: true,
    signIn: "Google",
    owns: { projects: 6, reports: 2 },
    sessions: [
      {
        id: "lucas-1",
        device: "Safari on macOS",
        kind: "desktop",
        place: "São Paulo",
        lastActiveAt: "2026-11-24T11:40:00Z",
      },
    ],
    activity: [
      {
        id: "lucas-a",
        text: "Shared Onboarding illustrations",
        at: "2026-11-24T10:05:00Z",
      },
      {
        id: "lucas-b",
        text: "Commented on Pricing page refresh",
        at: "2026-11-21T15:33:00Z",
      },
    ],
  },
  {
    kind: "person",
    id: "daniel",
    name: "Daniel Okafor",
    email: "daniel@acme.com",
    photo: getPhoto("1507003211169-0a1dd7228f2d"),
    role: "admin",
    teams: ["Engineering"],
    lastActiveAt: "2026-11-24T13:55:00Z",
    joinedAt: "2024-04-22T09:00:00Z",
    hasTwoFactor: true,
    signIn: "Email and password",
    owns: { projects: 3, reports: 0 },
    sessions: [
      {
        id: "daniel-1",
        device: "Firefox on Linux",
        kind: "desktop",
        place: "Lagos",
        lastActiveAt: "2026-11-24T13:55:00Z",
      },
    ],
    activity: [
      { id: "daniel-a", text: "Connected GitHub", at: "2026-11-20T12:18:00Z" },
    ],
  },
  {
    kind: "person",
    id: "emma",
    name: "Emma Lindqvist",
    email: "emma@acme.com",
    photo: getPhoto("1438761681033-6461ffad8d80"),
    role: "member",
    teams: ["Customer success"],
    lastActiveAt: "2026-11-23T17:25:00Z",
    joinedAt: "2025-01-13T09:00:00Z",
    hasTwoFactor: true,
    signIn: "Google",
    owns: { projects: 0, reports: 1 },
    sessions: [
      {
        id: "emma-1",
        device: "Chrome on Windows",
        kind: "desktop",
        place: "Stockholm",
        lastActiveAt: "2026-11-23T17:25:00Z",
      },
    ],
    activity: [
      {
        id: "emma-a",
        text: "Exported Customer health",
        at: "2026-11-23T14:02:00Z",
      },
    ],
  },
  {
    kind: "person",
    id: "tom",
    name: "Tom Becker",
    email: "tom@acme.com",
    photo: getPhoto("1472099645785-5658abf4ff4e"),
    role: "member",
    teams: ["Engineering"],
    lastActiveAt: "2026-11-21T09:10:00Z",
    joinedAt: "2025-06-30T09:00:00Z",
    hasTwoFactor: false,
    signIn: "Email and password",
    owns: { projects: 0, reports: 0 },
    sessions: [],
    activity: [
      {
        id: "tom-a",
        text: "Commented on API limits",
        at: "2026-11-21T09:05:00Z",
      },
    ],
  },
  {
    kind: "person",
    id: "nora",
    name: "Nora Ahmed",
    email: "nora@acme.com",
    photo: getPhoto("1544005313-94ddf0286df2"),
    role: "member",
    teams: ["Marketing", "Design"],
    lastActiveAt: "2026-11-24T09:30:00Z",
    joinedAt: "2025-10-06T09:00:00Z",
    hasTwoFactor: false,
    signIn: "Google",
    owns: { projects: 2, reports: 0 },
    sessions: [
      {
        id: "nora-1",
        device: "Chrome on macOS",
        kind: "desktop",
        place: "Cairo",
        lastActiveAt: "2026-11-24T09:30:00Z",
      },
    ],
    activity: [
      {
        id: "nora-a",
        text: "Created Winter campaign",
        at: "2026-11-17T13:45:00Z",
      },
    ],
  },
  {
    kind: "person",
    id: "priya",
    name: "Priya Raman",
    email: "priya@acme.com",
    role: "viewer",
    teams: [],
    lastActiveAt: "2026-10-29T10:00:00Z",
    joinedAt: "2026-08-17T09:00:00Z",
    hasTwoFactor: false,
    signIn: "Email and password",
    owns: { projects: 0, reports: 0 },
    sessions: [],
    activity: [],
  },
]

const INVITATIONS: Invitation[] = [
  {
    kind: "invitation",
    id: "hana",
    name: "Hana Sato",
    email: "hana.sato@acme.con",
    role: "member",
    status: "undelivered",
    sentAt: "2026-11-24T09:02:00Z",
    invitedBy: "Daniel Okafor",
  },
  {
    kind: "invitation",
    id: "kofi",
    email: "kofi.mensah@acme.com",
    role: "viewer",
    status: "expired",
    sentAt: "2026-11-09T15:00:00Z",
    invitedBy: "Maya Chen",
  },
  {
    kind: "invitation",
    id: "lena",
    name: "Lena Hoffmann",
    email: "lena@acme.com",
    role: "member",
    status: "pending",
    sentAt: "2026-11-23T10:15:00Z",
    invitedBy: "Ada Lovelace",
  },
  {
    kind: "invitation",
    id: "margarethe",
    email: "margarethe.schoenberger@acme.com",
    role: "admin",
    status: "pending",
    sentAt: "2026-11-22T11:00:00Z",
    invitedBy: "Maya Chen",
  },
]

export const SAMPLE_ROWS: TeamRow[] = [...PEOPLE, ...INVITATIONS]
