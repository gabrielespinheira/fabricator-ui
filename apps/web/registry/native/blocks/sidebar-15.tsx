import * as React from "react"
import {
  ArrowUpRightIcon,
  AudioLinesIcon,
  BadgeCheckIcon,
  BellIcon,
  BlocksIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CheckIcon,
  CreditCardIcon,
  HomeIcon,
  InboxIcon,
  LinkIcon,
  LogOutIcon,
  MessageCircleQuestionIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon,
  StarOffIcon,
  TerminalIcon,
  Trash2Icon,
} from "@fabricator-ui/icons-react-native"
import { ScrollView, useWindowDimensions, View } from "react-native"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/registry/native/ui/breadcrumb"
import { Button } from "@/registry/native/ui/button"
import { Calendar } from "@/registry/native/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import { Separator } from "@/registry/native/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/registry/native/ui/sheet"
import {
  Sidebar,
  SidebarChevron,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
  useSidebarCollapse,
  useSidebarPortal,
} from "@/registry/native/ui/sidebar"
import { Text, TextStyle } from "@/registry/native/ui/text"
import { UserMenu } from "@/registry/native/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/native/ui/workspace-switcher"

const noop = () => {}

// The website's `lg`, where there's room for the second sidebar beside the page.
const WIDE_BREAKPOINT = 1024
// A phone sidebar's width: the calendar's seven columns need it.
const PANEL_WIDTH = 288

const data = {
  user: { name: "Gabs Fabricator", email: "gabs@fabricator.dev" },
  teams: [
    {
      id: "acme-inc",
      name: "Acme Inc",
      logo: <TerminalIcon />,
      description: "Enterprise",
    },
    {
      id: "acme-corp",
      name: "Acme Corp.",
      logo: <AudioLinesIcon />,
      description: "Startup",
    },
    {
      id: "evil-corp",
      name: "Evil Corp.",
      logo: <TerminalIcon />,
      description: "Free",
    },
  ],
  navMain: [
    { title: "Search", icon: SearchIcon },
    { title: "Ask AI", icon: SparklesIcon },
    { title: "Home", icon: HomeIcon, isActive: true },
    { title: "Inbox", icon: InboxIcon },
  ],
  navSecondary: [
    { title: "Calendar", icon: CalendarIcon },
    { title: "Settings", icon: Settings2Icon },
    { title: "Templates", icon: BlocksIcon },
    { title: "Trash", icon: Trash2Icon },
    { title: "Help", icon: MessageCircleQuestionIcon },
  ],
  favorites: [
    { name: "Project Management & Task Tracking", emoji: "📊" },
    { name: "Family Recipe Collection & Meal Planning", emoji: "🍳" },
    { name: "Fitness Tracker & Workout Routines", emoji: "💪" },
    { name: "Book Notes & Reading List", emoji: "📚" },
    { name: "Sustainable Gardening Tips & Plant Care", emoji: "🌱" },
    { name: "Language Learning Progress & Resources", emoji: "🗣️" },
    { name: "Home Renovation Ideas & Budget Tracker", emoji: "🏠" },
    { name: "Personal Finance & Investment Portfolio", emoji: "💰" },
    { name: "Movie & TV Show Watchlist with Reviews", emoji: "🎬" },
    { name: "Daily Habit Tracker & Goal Setting", emoji: "✅" },
  ],
  workspaces: [
    {
      name: "Personal Life Management",
      emoji: "🏠",
      pages: [
        { name: "Daily Journal & Reflection", emoji: "📔" },
        { name: "Health & Wellness Tracker", emoji: "🍏" },
        { name: "Personal Growth & Learning Goals", emoji: "🌟" },
      ],
    },
    {
      name: "Professional Development",
      emoji: "💼",
      pages: [
        { name: "Career Objectives & Milestones", emoji: "🎯" },
        { name: "Skill Acquisition & Training Log", emoji: "🧠" },
        { name: "Networking Contacts & Events", emoji: "🤝" },
      ],
    },
    {
      name: "Creative Projects",
      emoji: "🎨",
      pages: [
        { name: "Writing Ideas & Story Outlines", emoji: "✍️" },
        { name: "Art & Design Portfolio", emoji: "🖼️" },
        { name: "Music Composition & Practice Log", emoji: "🎵" },
      ],
    },
    {
      name: "Home Management",
      emoji: "🏡",
      pages: [
        { name: "Household Budget & Expense Tracking", emoji: "💰" },
        { name: "Home Maintenance Schedule & Tasks", emoji: "🔧" },
        { name: "Family Calendar & Event Planning", emoji: "📅" },
      ],
    },
    {
      name: "Travel & Adventure",
      emoji: "🧳",
      pages: [
        { name: "Trip Planning & Itineraries", emoji: "🗺️" },
        { name: "Travel Bucket List & Inspiration", emoji: "🌎" },
        { name: "Travel Journal & Photo Gallery", emoji: "📸" },
      ],
    },
  ],
  calendars: [
    { name: "My Calendars", items: ["Personal", "Work", "Family"] },
    { name: "Favorites", items: ["Holidays", "Birthdays"] },
    { name: "Other", items: ["Travel", "Reminders", "Deadlines"] },
  ],
}

function NavFavorites({ navigate }: { navigate: (title: string) => void }) {
  const { isMobile } = useSidebar()
  const collapse = useSidebarCollapse()
  if (collapse === "icon") return null
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Favorites</SidebarGroupLabel>
      <SidebarMenu>
        {data.favorites.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              icon={<Text>{item.emoji}</Text>}
              onPress={() => navigate(item.name)}
            >
              {item.name}
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuAction
                    showOnHover
                    accessibilityLabel={`${item.name} actions`}
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
                className="w-56 rounded-lg"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <StarOffIcon />
                    Remove from Favorites
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <LinkIcon />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ArrowUpRightIcon />
                    Open in New Tab
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Trash2Icon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton icon={MoreHorizontalIcon}>More</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

function WorkspaceRow({
  workspace,
  navigate,
}: {
  workspace: (typeof data.workspaces)[number]
  navigate: (title: string) => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        icon={<Text>{workspace.emoji}</Text>}
        onPress={() => navigate(workspace.name)}
      >
        {workspace.name}
      </SidebarMenuButton>
      {/* Both stay in view on touch, so the toggle can't sit over the emoji. */}
      <SidebarMenuActions showOnHover>
        <SidebarMenuAction
          accessibilityLabel={`${isOpen ? "Collapse" : "Expand"} ${workspace.name}`}
          aria-expanded={isOpen}
          onPress={() => setIsOpen(!isOpen)}
        >
          <SidebarChevron open={isOpen} />
        </SidebarMenuAction>
        <SidebarMenuAction
          accessibilityLabel={`Add a page to ${workspace.name}`}
        >
          <PlusIcon />
        </SidebarMenuAction>
      </SidebarMenuActions>
      <SidebarMenuSub open={isOpen}>
        {workspace.pages.map((page) => (
          <SidebarMenuSubItem key={page.name}>
            <SidebarMenuSubButton
              icon={<Text>{page.emoji}</Text>}
              onPress={() => navigate(page.name)}
            >
              {page.name}
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
      </SidebarMenuSub>
    </SidebarMenuItem>
  )
}

function SidebarLeft({ onNavigate }: { onNavigate: (title: string) => void }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const [team, setTeam] = React.useState("acme-inc")
  const navigate = (title: string) => {
    onNavigate(title)
    if (isMobile) setOpenMobile(false)
  }
  return (
    <Sidebar bordered={false}>
      <SidebarHeader>
        <WorkspaceSwitcher
          label="Teams"
          createLabel="Add team"
          workspaces={data.teams}
          activeId={team}
          onSelect={setTeam}
          onCreate={noop}
        />
        <SidebarMenu>
          {data.navMain.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                icon={item.icon}
                isActive={item.isActive}
                onPress={() => navigate(item.title)}
              >
                {item.title}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent contentContainerClassName="grow">
        <NavFavorites navigate={navigate} />
        <SidebarGroup>
          <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.workspaces.map((workspace) => (
                <WorkspaceRow
                  key={workspace.name}
                  workspace={workspace}
                  navigate={navigate}
                />
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton icon={MoreHorizontalIcon}>
                  More
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    icon={item.icon}
                    onPress={() => navigate(item.title)}
                  >
                    {item.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

function DatePicker() {
  const [date, setDate] = React.useState<Date | undefined>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 12)
  )
  return (
    <SidebarGroup className="px-0">
      <SidebarGroupContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(next) => setDate(next)}
          captionLayout="dropdown"
          className="w-full bg-transparent"
        />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function CalendarBox({ isActive }: { isActive: boolean }) {
  return (
    <TextStyle className="text-primary-foreground">
      <View
        data-active={isActive}
        className="size-(--density-icon-16) shrink-0 items-center justify-center rounded-sm border border-border data-[active=true]:border-primary data-[active=true]:bg-primary"
      >
        {isActive ? <CheckIcon size={12} /> : null}
      </View>
    </TextStyle>
  )
}

function Calendars() {
  return data.calendars.map((calendar, index) => (
    <React.Fragment key={calendar.name}>
      <SidebarGroup collapsible defaultOpen={index === 0}>
        <SidebarGroupLabel>{calendar.name}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {calendar.items.map((item, itemIndex) => (
              <SidebarMenuItem key={item}>
                <SidebarMenuButton
                  icon={<CalendarBox isActive={itemIndex < 2} />}
                  accessibilityState={{ checked: itemIndex < 2 }}
                >
                  {item}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
    </React.Fragment>
  ))
}

function CalendarsPanel() {
  return (
    <>
      <SidebarHeader className="border-b border-border">
        <UserMenu align="start" user={data.user}>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <SparklesIcon />
              Upgrade to Pro
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <BadgeCheckIcon />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCardIcon />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <BellIcon />
              Notifications
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarHeader>
      <SidebarContent>
        <DatePicker />
        <SidebarSeparator className="mx-0" />
        <Calendars />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton icon={PlusIcon}>New Calendar</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  )
}

/**
 * The website hides the right sidebar below `lg`, which on a phone would lose the
 * calendar and the account. Here it opens as a sheet from the page header.
 */
function CalendarsSheet() {
  const portal = useSidebarPortal()
  const { width } = useWindowDimensions()
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            accessibilityLabel="Show calendars"
          />
        }
      >
        <CalendarDaysIcon />
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        accessibilityLabel="Calendars"
        className="gap-0 bg-sidebar"
        style={{ width: PANEL_WIDTH, maxWidth: width }}
      >
        {portal(<CalendarsPanel />)}
      </SheetContent>
    </Sheet>
  )
}

function Sidebar15({
  onNavigate = noop,
}: {
  onNavigate?: (title: string) => void
}) {
  const { width, height } = useWindowDimensions()
  const isWide = width >= WIDE_BREAKPOINT
  return (
    <SidebarProvider>
      <SidebarLeft onNavigate={onNavigate} />
      <SidebarInset>
        <View className="h-14 shrink-0 flex-row items-center gap-2 bg-background px-3 md:h-[calc(var(--density-48)+2*var(--density-8))]">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="mr-2 h-4 data-[orientation=vertical]:self-center"
          />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage numberOfLines={1}>
                  Project Management & Task Tracking
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {isWide ? null : <CalendarsSheet />}
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pt-4 pb-safe-offset-4"
        >
          <View className="h-24 w-full max-w-3xl self-center rounded-xl bg-muted/50" />
          <View
            className="w-full max-w-3xl self-center rounded-xl bg-muted/50"
            style={{ height }}
          />
        </ScrollView>
      </SidebarInset>
      {/* Only mounted beside the page: a second Sidebar reports itself to the same
          provider, and would turn off the first one's swipe on a phone. */}
      {isWide ? (
        <Sidebar collapsible="none" className="border-l border-border">
          <CalendarsPanel />
        </Sidebar>
      ) : null}
    </SidebarProvider>
  )
}

export { Sidebar15 }
