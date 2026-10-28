import {
  ArrowRightIcon,
  BellIcon,
  ChevronDownIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
} from "@/lib/site-icons"
import { DemoColumn, DemoFrame } from "@/components/foundations/demo-frame"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/styles/base-fabricator/ui/accordion"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/styles/base-fabricator/ui/breadcrumb"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  DensityProvider,
  type Density,
} from "@/styles/base-fabricator/ui/density"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import { Input } from "@/styles/base-fabricator/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/styles/base-fabricator/ui/input-group"
import { Kbd } from "@/styles/base-fabricator/ui/kbd"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/styles/base-fabricator/ui/select"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"

const DENSITIES: {
  density: Density
  label: string
  note: string
  className: string
}[] = [
  {
    density: "compact",
    label: "Compact",
    note: "28px controls, 12px text",
    className: "w-48",
  },
  {
    density: "default",
    label: "Default",
    note: "36px controls, 13px text",
    className: "w-56",
  },
  {
    density: "spacious",
    label: "Spacious",
    note: "44px controls, 15px text",
    className: "w-64",
  },
]

const PLANS = [
  { label: "Starter", value: "starter" },
  { label: "Team", value: "team" },
  { label: "Business", value: "business" },
]

/** The same controls in each density, side by side. */
export function DensityCompare() {
  return (
    <DemoFrame
      className="items-start"
      caption="Each column is a DensityProvider. The plan menus open at their column's density."
    >
      {DENSITIES.map(({ density, label, note, className }) => (
        <DemoColumn
          key={density}
          label={label}
          note={note}
          className={className}
        >
          <DensityProvider
            density={density}
            className="flex flex-col gap-(--density-12)"
          >
            <Tabs defaultValue="monthly">
              <TabsList className="w-full">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input placeholder="Email" aria-label={`Email (${label})`} />
            <Select items={PLANS} defaultValue="team">
              <SelectTrigger className="w-full" aria-label={`Plan (${label})`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PLANS.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between gap-(--density-8)">
              <div className="flex gap-(--density-8)">
                <Button>Save</Button>
                <Button variant="outline">Cancel</Button>
              </div>
              <Switch aria-label={`Notify me (${label})`} defaultChecked />
            </div>
          </DensityProvider>
        </DemoColumn>
      ))}
    </DemoFrame>
  )
}

const TEAM_SIZES = [
  { label: "Just me", value: "1" },
  { label: "2 to 10", value: "10" },
  { label: "11 to 50", value: "50" },
  { label: "More than 50", value: "more" },
]

/** A landing section: one spacious container, popups included. */
export function DensityLanding() {
  return (
    <DemoFrame caption='One DensityProvider density="spacious" around the section. Nothing inside sets a size, and the team size menu opens spacious too.'>
      <DensityProvider
        density="spacious"
        className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
      >
        <Badge variant="secondary">Booking projects for May</Badge>
        <div className="flex flex-col gap-3">
          <h3 className="text-3xl font-semibold tracking-tight text-balance text-foreground">
            Launch your new site in two weeks
          </h3>
          <p className="text-(length:--density-text-14) text-balance text-muted-foreground">
            Design, copy and build in one fixed-price sprint. You get the code,
            and Fabricator UI underneath it.
          </p>
        </div>
        <form className="flex w-full flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            placeholder="you@company.com"
            aria-label="Work email"
            className="sm:flex-1"
          />
          <Select items={TEAM_SIZES}>
            <SelectTrigger className="sm:w-40" aria-label="Team size">
              <SelectValue placeholder="Team size" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TEAM_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button type="button">
            Get a quote
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </form>
        <Accordion className="w-full text-start">
          <AccordionItem value="scope">
            <AccordionTrigger>What does a sprint include?</AccordionTrigger>
            <AccordionContent>
              A homepage and up to four inner pages, written, designed and
              built, with two rounds of changes.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="after">
            <AccordionTrigger>
              Who looks after the site afterwards?
            </AccordionTrigger>
            <AccordionContent>
              You do, or we do on a monthly plan. The code is yours either way.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DensityProvider>
    </DemoFrame>
  )
}

/** A compact header in a page that keeps the default density. */
export function DensityDashboardHeader() {
  return (
    <DemoFrame
      className="block min-h-0 p-0 sm:p-0"
      caption='Only the header is compact (DensityProvider density="compact"); the page under it stays default. Open the workspace menu: it is compact too.'
    >
      <DensityProvider density="compact">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <Button variant="ghost" size="icon" aria-label="Toggle sidebar">
            <PanelLeftIcon />
          </Button>
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink href="#">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:inline-flex" />
              <BreadcrumbItem>
                <BreadcrumbPage>Website</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ms-auto flex items-center gap-2">
            <InputGroup className="hidden w-44 md:flex">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput placeholder="Search" aria-label="Search" />
              <InputGroupAddon align="inline-end">
                <Kbd>⌘K</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <BellIcon />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                Fabricator
                <ChevronDownIcon data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                  <DropdownMenuItem>
                    Fabricator
                    <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Studio
                    <DropdownMenuShortcut>⌘2</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <PlusIcon />
                    New workspace
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </DensityProvider>
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] font-medium text-foreground">Pages</span>
          <span className="text-[13px] text-muted-foreground">
            The page keeps the default density.
          </span>
        </div>
        <Button>
          <PlusIcon data-icon="inline-start" />
          New page
        </Button>
      </div>
    </DemoFrame>
  )
}

/** Pinning single components inside a spacious frame. */
export function DensityPinned() {
  return (
    <DemoFrame
      data-density="spacious"
      caption='This frame is spacious. size="sm" pins a button to compact; data-density pins any component, here an input.'
    >
      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Follows the frame</Button>
          <Button size="sm" variant="outline">
            size=&quot;sm&quot;
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-56"
            placeholder="Follows the frame"
            aria-label="Follows the frame"
          />
          <Input
            data-density="compact"
            className="w-56"
            placeholder='data-density="compact"'
            aria-label="Pinned to compact"
          />
        </div>
      </div>
    </DemoFrame>
  )
}

/** Concentric corners: rounded-lg items inside rounded-xl containers. */
export function ShapeDemo() {
  return (
    <DemoFrame caption="Containers are rounded-xl (12px) with 4px of padding, so the rounded-lg (8px) items inside them share the same curve.">
      <div className="flex w-56 flex-col gap-1 rounded-xl bg-surface-3 p-1 shadow-surface-3">
        <div className="flex h-9 items-center justify-between rounded-lg bg-hover px-3 text-[13px] text-foreground">
          Rounded large
          <Badge variant="secondary">8px</Badge>
        </div>
        <div className="flex h-9 items-center justify-between rounded-lg px-3 text-[13px] text-muted-foreground">
          Inside rounded extra large
          <Badge variant="secondary">12px</Badge>
        </div>
      </div>
    </DemoFrame>
  )
}
