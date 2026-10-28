"use client"

import * as React from "react"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"

import {
  ArrowUpRightIcon,
  CalendarIcon,
  DownloadIcon,
  InfoIcon,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "@/lib/site-icons"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/styles/base-fabricator/ui/alert"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/styles/base-fabricator/ui/avatar"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Calendar } from "@/styles/base-fabricator/ui/calendar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/styles/base-fabricator/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/styles/base-fabricator/ui/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/styles/base-fabricator/ui/field"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/styles/base-fabricator/ui/hover-card"
import { Input } from "@/styles/base-fabricator/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/styles/base-fabricator/ui/pagination"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/base-fabricator/ui/popover"
import { Progress } from "@/styles/base-fabricator/ui/progress"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/styles/base-fabricator/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/styles/base-fabricator/ui/select"
import { Separator } from "@/styles/base-fabricator/ui/separator"
import { Slider } from "@/styles/base-fabricator/ui/slider"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/styles/base-fabricator/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/base-fabricator/ui/tabs"
import { Textarea } from "@/styles/base-fabricator/ui/textarea"
import { createToastManager, Toaster } from "@/styles/base-fabricator/ui/toast"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

// A manager of its own, so the preview never doubles up with a toaster
// mounted elsewhere on the page.
const previewToast = createToastManager()

type Status = "On track" | "In review" | "At risk"

const PROJECTS: {
  name: string
  client: string
  owner: string
  status: Status
  due: string
  progress: number
}[] = [
  {
    name: "Website relaunch",
    client: "Lumen Coffee",
    owner: "AP",
    status: "On track",
    due: "04/11/2026",
    progress: 68,
  },
  {
    name: "Brand refresh",
    client: "Atlas Bikes",
    owner: "LH",
    status: "In review",
    due: "29/10/2026",
    progress: 92,
  },
  {
    name: "Mobile app",
    client: "Harbour Health",
    owner: "MC",
    status: "At risk",
    due: "18/11/2026",
    progress: 41,
  },
  {
    name: "Booking flow",
    client: "Oak & Iron",
    owner: "ND",
    status: "On track",
    due: "25/11/2026",
    progress: 23,
  },
]

const STATUS_VARIANTS = {
  "On track": "success",
  "In review": "info",
  "At risk": "warning",
} as const

const STATS = [
  { label: "Revenue", value: "48.200 €", change: "+12,4%", isUp: true },
  { label: "Active projects", value: "24", change: "+3", isUp: true },
  { label: "Hours logged", value: "1.284", change: "-4,1%", isUp: false },
]

const TEAM = [
  {
    initials: "AP",
    name: "Ada Park",
    role: "owner",
    email: "ada@northwind.io",
  },
  {
    initials: "LH",
    name: "Leo Hart",
    role: "editor",
    email: "leo@northwind.io",
  },
  {
    initials: "MC",
    name: "Mia Chen",
    role: "viewer",
    email: "mia@northwind.io",
  },
]

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
]

export function DashboardOverview() {
  return (
    <main
      id="dashboard"
      className="@container flex flex-col gap-6 bg-surface-1 p-4 @xl:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold tracking-tight">Overview</h3>
          <p className="text-sm text-muted-foreground">
            How your studio is doing this month.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker />
          <Button
            variant="outline"
            onClick={() =>
              previewToast.add({
                title: "Export started",
                description: "We'll email the CSV when it's ready.",
              })
            }
          >
            <DownloadIcon data-icon="inline-start" />
            Export
          </Button>
          <NewProjectDialog />
        </div>
      </div>

      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>Your trial ends in 5 days</AlertTitle>
        <AlertDescription>
          Keep your projects and team by choosing a plan.
        </AlertDescription>
        <AlertAction>
          <Button size="xs">Choose a plan</Button>
        </AlertAction>
      </Alert>

      <div className="grid gap-4 @lg:grid-cols-2 @5xl:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl whitespace-nowrap tabular-nums">
                {stat.value}
              </CardTitle>
              <CardAction>
                <Badge variant={stat.isUp ? "success" : "destructive"}>
                  {stat.change}
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>
        ))}
        <Card size="sm">
          <CardHeader>
            <CardDescription>Monthly goal</CardDescription>
            <CardTitle className="text-2xl tabular-nums">76%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={76} aria-label="Monthly goal" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 @5xl:grid-cols-3">
        <ProjectsCard />
        <div className="flex flex-col gap-4">
          <TeamCard />
          <PreferencesCard />
        </div>
      </div>
      <Toaster toastManager={previewToast} />
    </main>
  )
}

function DateRangePicker() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(2026, 9, 1),
    to: new Date(2026, 9, 27),
  })

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" className="font-normal" />}
      >
        <CalendarIcon data-icon="inline-start" />
        {range?.from
          ? `${format(range.from, "dd/MM")} – ${
              range.to ? format(range.to, "dd/MM/yyyy") : "…"
            }`
          : "Pick dates"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          defaultMonth={range?.from}
          selected={range}
          onSelect={setRange}
        />
      </PopoverContent>
    </Popover>
  )
}

function NewProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        New project
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Set it up now; you can change everything later.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="preview-project-name">Name</FieldLabel>
            <Input id="preview-project-name" defaultValue="Spring campaign" />
          </Field>
          <Field>
            <FieldLabel htmlFor="preview-project-brief">Brief</FieldLabel>
            <Textarea
              id="preview-project-brief"
              placeholder="What should this project deliver?"
            />
          </Field>
          <FieldSet>
            <FieldLegend variant="label">Visibility</FieldLegend>
            <RadioGroup defaultValue="team">
              <Field orientation="horizontal">
                <RadioGroupItem value="team" id="preview-visibility-team" />
                <FieldLabel htmlFor="preview-visibility-team">
                  Everyone on the team
                </FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem
                  value="private"
                  id="preview-visibility-private"
                />
                <FieldLabel htmlFor="preview-visibility-private">
                  Only people I invite
                </FieldLabel>
              </Field>
            </RadioGroup>
          </FieldSet>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <DialogClose
            render={<Button />}
            onClick={() =>
              previewToast.add({
                title: "Project created",
                description: "Spring campaign is ready for its first task.",
              })
            }
          >
            Create project
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProjectsCard() {
  const [selected, setSelected] = React.useState<string[]>(["Brand refresh"])
  const [view, setView] = React.useState("list")

  return (
    <Card className="min-w-0 @5xl:col-span-2">
      <Tabs defaultValue="active">
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            {selected.length > 0
              ? `${selected.length} selected`
              : "Everything your team is working on."}
          </CardDescription>
          <CardAction className="flex items-center gap-2">
            <ToggleGroup
              aria-label="View"
              value={[view]}
              onValueChange={(next) => {
                if (next[0]) setView(next[0])
              }}
              size="sm"
              variant="outline"
            >
              <ToggleGroupItem value="list" aria-label="List">
                <ListIcon />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid">
                <LayoutGridIcon />
              </ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
          <TabsList className="mt-2">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="review">In review</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <TabsContent value="active">
            <ProjectsTable
              projects={PROJECTS}
              selected={selected}
              onSelectedChange={setSelected}
            />
          </TabsContent>
          <TabsContent value="review">
            <ProjectsTable
              projects={PROJECTS.filter(({ status }) => status === "In review")}
              selected={selected}
              onSelectedChange={setSelected}
            />
          </TabsContent>
          <TabsContent value="done">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nothing shipped yet this month</EmptyTitle>
                <EmptyDescription>
                  Finished projects land here, ready to send to the client.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </TabsContent>
        </CardContent>
      </Tabs>
      <CardFooter className="justify-between gap-4">
        <span className="hidden text-[13px] text-muted-foreground @xl:inline">
          Showing 1–4 of 24
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#dashboard" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#dashboard" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#dashboard">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#dashboard" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardFooter>
    </Card>
  )
}

function ProjectsTable({
  projects,
  selected,
  onSelectedChange,
}: {
  projects: typeof PROJECTS
  selected: string[]
  onSelectedChange: (selected: string[]) => void
}) {
  const allSelected =
    projects.length > 0 && projects.every(({ name }) => selected.includes(name))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <Checkbox
              aria-label="Select all projects"
              checked={allSelected}
              onCheckedChange={(checked) =>
                onSelectedChange(
                  checked ? projects.map(({ name }) => name) : []
                )
              }
            />
          </TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden @3xl:table-cell">Progress</TableHead>
          <TableHead className="hidden @xl:table-cell">Due</TableHead>
          <TableHead className="w-8">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const isSelected = selected.includes(project.name)
          return (
            <TableRow
              key={project.name}
              data-state={isSelected ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  aria-label={`Select ${project.name}`}
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    onSelectedChange(
                      checked
                        ? [...selected, project.name]
                        : selected.filter((name) => name !== project.name)
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[11px]">
                      {project.owner}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{project.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {project.client}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[project.status]}>
                  {project.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden @3xl:table-cell">
                <Progress
                  value={project.progress}
                  aria-label={`${project.name} progress`}
                  className="w-24"
                />
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums @xl:table-cell">
                {project.due}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Actions for ${project.name}`}
                      />
                    }
                  >
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <ArrowUpRightIcon />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem variant="destructive">
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function TeamCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>Who can open your projects.</CardDescription>
        <CardAction>
          <AvatarGroup>
            {TEAM.map(({ initials }) => (
              <Avatar key={initials} className="size-7">
                <AvatarFallback className="text-[11px]">
                  {initials[0]}
                </AvatarFallback>
              </Avatar>
            ))}
            <AvatarGroupCount className="size-7 text-[11px]">
              +9
            </AvatarGroupCount>
          </AvatarGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {TEAM.map((member) => (
          <div key={member.email} className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {member.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <HoverCard>
                <HoverCardTrigger
                  delay={150}
                  render={
                    <a
                      href="#dashboard"
                      className="w-fit truncate text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
                    />
                  }
                >
                  {member.name}
                </HoverCardTrigger>
                <HoverCardContent className="flex w-60 flex-col gap-1">
                  <span className="font-semibold">{member.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {member.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    On 6 projects · joined 03/2025
                  </span>
                </HoverCardContent>
              </HoverCard>
              <span className="truncate text-xs text-muted-foreground">
                {member.email}
              </span>
            </div>
            <Select items={ROLES} defaultValue={member.role}>
              <SelectTrigger size="sm" aria-label={`${member.name}'s role`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function PreferencesCard() {
  const [capacity, setCapacity] = React.useState(32)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>How Northwind keeps you posted.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="preview-digest">Weekly digest</FieldLabel>
              <FieldDescription>A summary every Monday.</FieldDescription>
            </FieldContent>
            <Switch id="preview-digest" defaultChecked />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="preview-mentions">Mentions only</FieldLabel>
              <FieldDescription>Skip the rest of the noise.</FieldDescription>
            </FieldContent>
            <Switch id="preview-mentions" />
          </Field>
          <Separator />
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="preview-capacity">
                Weekly capacity
              </FieldLabel>
              <span className="text-sm text-muted-foreground tabular-nums">
                {capacity} h
              </span>
            </div>
            <Slider
              id="preview-capacity"
              value={[capacity]}
              onValueChange={(next) =>
                setCapacity(Array.isArray(next) ? next[0] : next)
              }
              max={40}
              step={1}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
