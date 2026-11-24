import {
  FigmaIcon,
  GithubIcon,
  GmailIcon,
  GoogleAnalyticsIcon,
  GoogleCalendarIcon,
  GoogleSheetsIcon,
  HubspotIcon,
  LinearIcon,
  PosthogIcon,
  StripeIcon,
  type BrandIconComponent,
} from "@fabricator-ui/icons/brands"

import { type OnboardingUse } from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"

// Sample records: who signed up, who shares their domain, and the work the
// preview is filled with. Replace them with what your sign-up knows.

export type OnboardingPerson = { name: string; email: string; photo?: string }

function getPhoto(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&auto=format&q=80`
}

export const ONBOARDING_OWNER: OnboardingPerson = {
  name: "Ada Lovelace",
  email: "ada@acme.com",
  photo: getPhoto("1580489944761-15a19d654956"),
}

/** Found in the domain's directory. */
export const ONBOARDING_COLLEAGUES: OnboardingPerson[] = [
  {
    name: "Maya Chen",
    email: "maya@acme.com",
    photo: getPhoto("1534528741775-53994a69daeb"),
  },
  {
    name: "Lucas Ferreira",
    email: "lucas@acme.com",
    photo: getPhoto("1500648767791-00dcc994a43e"),
  },
  {
    name: "Emma Lindqvist",
    email: "emma@acme.com",
    photo: getPhoto("1438761681033-6461ffad8d80"),
  },
  { name: "Priya Raman", email: "priya@acme.com" },
]

export const ONBOARDING_SOURCE_MARKS: Record<string, BrandIconComponent> = {
  figma: FigmaIcon,
  github: GithubIcon,
  gmail: GmailIcon,
  "google-analytics": GoogleAnalyticsIcon,
  "google-calendar": GoogleCalendarIcon,
  "google-sheets": GoogleSheetsIcon,
  hubspot: HubspotIcon,
  linear: LinearIcon,
  posthog: PosthogIcon,
  stripe: StripeIcon,
}

/** The sample connection that its first attempt doesn't get through. */
export const ONBOARDING_FAILING_SOURCES = ["figma", "gmail", "posthog"]

export type OnboardingRecord = {
  id: string
  title: string
  /** An index into the use's columns. */
  column: number
  detail: string
  tag: string
  /** An index into the people; the owner is 0. */
  person: number
  /** Only there once this source is connected. */
  source?: string
}

export const ONBOARDING_COLUMNS: Record<OnboardingUse, string[]> = {
  projects: ["Planned", "In progress", "Done"],
  customers: ["New", "Proposal", "Won"],
  reports: ["Revenue", "Customers", "Product"],
}

export const ONBOARDING_RECORDS: Record<OnboardingUse, OnboardingRecord[]> = {
  projects: [
    {
      id: "launch-the-new-pricing-p0",
      title: "Launch the new pricing page",
      column: 1,
      detail: "Nov 27",
      person: 0,
      tag: "Growth",
    },
    {
      id: "interview-five-customers1",
      title: "Interview five customers",
      column: 0,
      detail: "Dec 2",
      person: 1,
      tag: "Research",
    },
    {
      id: "move-invoices-to-the-new2",
      title: "Move invoices to the new plan",
      column: 1,
      detail: "Nov 30",
      person: 2,
      tag: "Billing",
    },
    {
      id: "q4-planning3",
      title: "Q4 planning",
      column: 2,
      detail: "Nov 20",
      person: 0,
      tag: "Team",
    },
    {
      id: "write-the-december-updat4",
      title: "Write the December update",
      column: 0,
      detail: "Dec 4",
      person: 0,
      tag: "Team",
    },
    {
      id: "accessibility-pass-on-si5",
      title: "Accessibility pass on sign in",
      column: 1,
      detail: "Dec 1",
      person: 3,
      tag: "Quality",
    },
    {
      id: "faster-exports6",
      title: "Faster exports",
      column: 2,
      detail: "Nov 18",
      person: 2,
      tag: "Quality",
    },
    {
      id: "archive-old-customers7",
      title: "Archive old customers",
      column: 2,
      detail: "Nov 12",
      person: 1,
      tag: "Data",
    },
    {
      id: "crash-when-a-file-is-ren8",
      title: "Crash when a file is renamed",
      column: 0,
      detail: "#482",
      person: 3,
      tag: "Bug",
      source: "github",
    },
    {
      id: "slow-search-on-long-list9",
      title: "Slow search on long lists",
      column: 1,
      detail: "#467",
      person: 2,
      tag: "Bug",
      source: "github",
    },
    {
      id: "onboarding-second-round10",
      title: "Onboarding, second round",
      column: 0,
      detail: "12 frames",
      person: 0,
      tag: "Design",
      source: "figma",
    },
    {
      id: "design-review11",
      title: "Design review",
      column: 2,
      detail: "Today",
      person: 1,
      tag: "Meeting",
      source: "google-calendar",
    },
    {
      id: "cycle-12-scope12",
      title: "Cycle 12 scope",
      column: 0,
      detail: "ENG-214",
      person: 0,
      tag: "Cycle",
      source: "linear",
    },
    {
      id: "projects-0",
      title: "Pick the photos for the About page",
      column: 0,
      detail: "Dec 9",
      person: 2,
      tag: "Design",
    },
    {
      id: "projects-1",
      title: "Rename plans in the docs",
      column: 0,
      detail: "Dec 11",
      person: 4,
      tag: "Docs",
    },
    {
      id: "projects-2",
      title: "Offline drafts",
      column: 1,
      detail: "Dec 8",
      person: 1,
      tag: "Product",
    },
    {
      id: "projects-3",
      title: "Reply templates",
      column: 1,
      detail: "Dec 10",
      person: 4,
      tag: "Support",
    },
    {
      id: "projects-4",
      title: "Hire a support lead",
      column: 2,
      detail: "Nov 14",
      person: 1,
      tag: "Team",
    },
    {
      id: "projects-5",
      title: "New invoice emails",
      column: 2,
      detail: "Nov 10",
      person: 3,
      tag: "Billing",
    },
  ],
  customers: [
    {
      id: "northwind0",
      title: "Northwind",
      column: 1,
      detail: "$18,000",
      person: 0,
      tag: "Business",
    },
    {
      id: "contoso-retail1",
      title: "Contoso Retail",
      column: 0,
      detail: "$6,400",
      person: 1,
      tag: "Team",
    },
    {
      id: "fabrikam2",
      title: "Fabrikam",
      column: 2,
      detail: "$24,800",
      person: 2,
      tag: "Business",
    },
    {
      id: "tailspin-toys3",
      title: "Tailspin Toys",
      column: 0,
      detail: "$3,200",
      person: 0,
      tag: "Team",
    },
    {
      id: "wingtip4",
      title: "Wingtip",
      column: 1,
      detail: "$9,600",
      person: 3,
      tag: "Team",
    },
    {
      id: "alpine-ski-house5",
      title: "Alpine Ski House",
      column: 2,
      detail: "$12,000",
      person: 1,
      tag: "Business",
    },
    {
      id: "humongous6",
      title: "Humongous",
      column: 0,
      detail: "$4,100",
      person: 2,
      tag: "Trial",
    },
    {
      id: "lucerne7",
      title: "Lucerne",
      column: 1,
      detail: "$7,700",
      person: 0,
      tag: "Trial",
    },
    {
      id: "litware8",
      title: "Litware",
      column: 1,
      detail: "$11,500",
      person: 0,
      tag: "Imported",
      source: "hubspot",
    },
    {
      id: "adatum9",
      title: "Adatum",
      column: 0,
      detail: "$9,000",
      person: 1,
      tag: "Imported",
      source: "hubspot",
    },
    {
      id: "proseware10",
      title: "Proseware",
      column: 1,
      detail: "Replied today",
      person: 0,
      tag: "Email",
      source: "gmail",
    },
    {
      id: "woodgrove11",
      title: "Woodgrove",
      column: 2,
      detail: "Paid today",
      person: 2,
      tag: "Payment",
      source: "stripe",
    },
    {
      id: "relecloud-call12",
      title: "Relecloud call",
      column: 0,
      detail: "Thursday",
      person: 0,
      tag: "Meeting",
      source: "google-calendar",
    },
    {
      id: "customers-0",
      title: "Coho Winery",
      column: 0,
      detail: "$2,800",
      person: 3,
      tag: "Trial",
    },
    {
      id: "customers-1",
      title: "Margie's Travel",
      column: 0,
      detail: "$5,300",
      person: 1,
      tag: "Team",
    },
    {
      id: "customers-2",
      title: "Blue Yonder",
      column: 1,
      detail: "$15,200",
      person: 4,
      tag: "Business",
    },
    {
      id: "customers-3",
      title: "City Power",
      column: 2,
      detail: "$8,900",
      person: 0,
      tag: "Team",
    },
    {
      id: "customers-4",
      title: "Graphic Design Institute",
      column: 2,
      detail: "$6,100",
      person: 3,
      tag: "Team",
    },
  ],
  reports: [
    {
      id: "revenue0",
      title: "Revenue",
      column: 0,
      detail: "$48,260",
      person: 0,
      tag: "Monthly",
    },
    {
      id: "customers1",
      title: "Customers",
      column: 1,
      detail: "1,284",
      person: 1,
      tag: "Active",
    },
    {
      id: "sign-ups2",
      title: "Sign-ups",
      column: 2,
      detail: "342",
      person: 2,
      tag: "Weekly",
    },
    {
      id: "churn3",
      title: "Churn",
      column: 1,
      detail: "2.1%",
      person: 0,
      tag: "Monthly",
    },
    {
      id: "payouts4",
      title: "Payouts",
      column: 0,
      detail: "$31,904",
      person: 0,
      tag: "Monthly",
      source: "stripe",
    },
    {
      id: "budget5",
      title: "Budget",
      column: 0,
      detail: "$52,000",
      person: 1,
      tag: "Quarter",
      source: "google-sheets",
    },
    {
      id: "retention6",
      title: "Retention",
      column: 2,
      detail: "61%",
      person: 2,
      tag: "Weekly",
      source: "posthog",
    },
    {
      id: "visits7",
      title: "Visits",
      column: 2,
      detail: "18,420",
      person: 0,
      tag: "Weekly",
      source: "google-analytics",
    },
  ],
}

export const ONBOARDING_TREND = [
  { week: "Sep 29", revenue: 31_200 },
  { week: "Oct 6", revenue: 33_900 },
  { week: "Oct 13", revenue: 32_400 },
  { week: "Oct 20", revenue: 37_100 },
  { week: "Oct 27", revenue: 39_800 },
  { week: "Nov 3", revenue: 38_600 },
  { week: "Nov 10", revenue: 44_300 },
  { week: "Nov 17", revenue: 48_260 },
]
