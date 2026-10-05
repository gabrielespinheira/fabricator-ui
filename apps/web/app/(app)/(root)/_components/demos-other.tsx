"use client"

import * as React from "react"
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  HomeIcon,
  InboxIcon,
  ItalicIcon,
  LayersIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
  UnderlineIcon,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/styles/base-fabricator/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/styles/base-fabricator/ui/alert-dialog"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Calendar } from "@/styles/base-fabricator/ui/calendar"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/styles/base-fabricator/ui/progress"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/styles/base-fabricator/ui/sidebar"
import { Spinner } from "@/styles/base-fabricator/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/styles/base-fabricator/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"
import { createToastManager, Toaster } from "@/styles/base-fabricator/ui/toast"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/styles/base-fabricator/ui/tooltip"

export function TabsDemo() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export function ToggleGroupDemo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <ToggleGroup defaultValue={["center"]} aria-label="Text alignment">
        <ToggleGroupItem value="left" aria-label="Align left">
          <AlignLeftIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Align center">
          <AlignCenterIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Align right">
          <AlignRightIcon />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup variant="outline" multiple aria-label="Text style">
        <ToggleGroupItem value="bold" aria-label="Bold">
          <BoldIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Italic">
          <ItalicIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Underline">
          <UnderlineIcon />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

const NAV = [
  { label: "Home", icon: HomeIcon },
  { label: "Inbox", icon: InboxIcon, badge: "4" },
  { label: "Search", icon: SearchIcon },
  { label: "Projects", icon: LayersIcon, badge: "12" },
  { label: "Settings", icon: SettingsIcon },
]

export function SidebarDemo() {
  const [active, setActive] = React.useState("Inbox")

  return (
    <SidebarProvider
      className="min-h-0 w-auto"
      style={{ "--sidebar-width": "220px" } as React.CSSProperties}
    >
      <Sidebar
        collapsible="none"
        className="rounded-xl bg-transparent shadow-none"
      >
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ label, icon: Icon, badge }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      isActive={active === label}
                      onClick={() => setActive(label)}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                    {badge && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}

export function AccordionDemo() {
  return (
    <Accordion defaultValue={["hover"]} className="w-[280px]">
      <AccordionItem value="hover">
        <AccordionTrigger>What is fluid hover?</AccordionTrigger>
        <AccordionContent>
          One highlight that glides to the item under the pointer, instead of
          each item lighting up on its own.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="motion">
        <AccordionTrigger>How does motion work?</AccordionTrigger>
        <AccordionContent>
          Spring easings in three speeds. Bigger moves use slower springs.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="bases">
        <AccordionTrigger>Which primitives are supported?</AccordionTrigger>
        <AccordionContent>
          Base UI, Radix and React Aria, with the same API in all three.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export function CalendarDemo() {
  const [date, setDate] = React.useState<Date | undefined>(
    () => new Date(2026, 9, 14)
  )

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      defaultMonth={new Date(2026, 9, 1)}
      className="rounded-xl shadow-surface-3"
    />
  )
}

const TEAM = [
  { name: "Ada Park", role: "Design", status: "Active" },
  { name: "Leo Hart", role: "Engineering", status: "Active" },
  { name: "Mia Chen", role: "Research", status: "Away" },
  { name: "Noah Diaz", role: "Product", status: "Invited" },
]

export function TableDemo() {
  return (
    <div className="w-[320px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-end">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TEAM.map((member) => (
            <TableRow key={member.name}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {member.role}
              </TableCell>
              <TableCell className="text-end">
                <Badge
                  variant={member.status === "Active" ? "secondary" : "outline"}
                >
                  {member.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// A manager of its own, so this demo never doubles up with a toaster mounted
// elsewhere on the page.
const homeToast = createToastManager()

export function ToastDemo() {
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          const id = homeToast.add({
            title: "Changes saved",
            description: "Your theme was published to the registry.",
            actionProps: {
              children: "Undo",
              onClick() {
                homeToast.close(id)
              },
            },
          })
        }}
      >
        Save changes
      </Button>
      <Toaster toastManager={homeToast} />
    </>
  )
}

export function TooltipDemo() {
  return (
    <div className="flex items-center gap-1 rounded-xl p-1 shadow-surface-3">
      {[
        { label: "Bold", icon: BoldIcon },
        { label: "Italic", icon: ItalicIcon },
        { label: "Underline", icon: UnderlineIcon },
        { label: "Delete", icon: Trash2Icon },
      ].map(({ label, icon: Icon }) => (
        <Tooltip key={label}>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" aria-label={label} />}
          >
            <Icon />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

export function ProgressDemo() {
  const [value, setValue] = React.useState(24)

  React.useEffect(() => {
    const timer = setInterval(() => {
      setValue((current) => (current >= 100 ? 8 : current + 8))
    }, 900)
    return () => clearInterval(timer)
  }, [])

  return (
    <Progress value={value} className="w-[260px]">
      <ProgressLabel>Uploading assets</ProgressLabel>
      <ProgressValue />
    </Progress>
  )
}

export function ButtonDemo() {
  const [loading, setLoading] = React.useState(false)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
      <Button
        variant="secondary"
        disabled={loading}
        onClick={() => {
          setLoading(true)
          setTimeout(() => setLoading(false), 1600)
        }}
      >
        {loading && <Spinner data-icon="inline-start" />}
        {loading ? "Publishing" : "Publish"}
      </Button>
    </div>
  )
}

export function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete project
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete project?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the project and its components for everyone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
