import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  AudioLinesIcon,
  BellIcon,
  BlocksIcon,
  CalendarIcon,
  ChartLineIcon,
  CopyIcon,
  CornerUpLeftIcon,
  CornerUpRightIcon,
  FileTextIcon,
  GalleryVerticalEndIcon,
  HomeIcon,
  InboxIcon,
  LinkIcon,
  MessageCircleQuestionIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon,
  StarIcon,
  StarOffIcon,
  TerminalIcon,
  Trash2Icon,
  TrashIcon,
} from "@fabricator-ui/icons-react-native"
import { ScrollView, useWindowDimensions, View } from "react-native"

import { getMenuMaxHeight } from "@/registry/native/lib/overlay-model"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/registry/native/ui/breadcrumb"
import { Button } from "@/registry/native/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/native/ui/popover"
import { Separator } from "@/registry/native/ui/separator"
import {
  Sidebar,
  SidebarChevron,
  SidebarContent,
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
  SidebarTrigger,
  useSidebar,
  useSidebarCollapse,
} from "@/registry/native/ui/sidebar"
import { Text } from "@/registry/native/ui/text"
import { WorkspaceSwitcher } from "@/registry/native/ui/workspace-switcher"

const noop = () => {}

const data = {
  teams: [
    {
      id: "acme-inc",
      name: "Acme Inc",
      logo: <GalleryVerticalEndIcon />,
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
  actions: [
    [
      { label: "Customize Page", icon: Settings2Icon },
      { label: "Turn into wiki", icon: FileTextIcon },
    ],
    [
      { label: "Copy Link", icon: LinkIcon },
      { label: "Duplicate", icon: CopyIcon },
      { label: "Move to", icon: CornerUpRightIcon },
      { label: "Move to Trash", icon: Trash2Icon },
    ],
    [
      { label: "Undo", icon: CornerUpLeftIcon },
      { label: "View analytics", icon: ChartLineIcon },
      { label: "Version History", icon: GalleryVerticalEndIcon },
      { label: "Show delete pages", icon: TrashIcon },
      { label: "Notifications", icon: BellIcon },
    ],
    [
      { label: "Import", icon: ArrowUpIcon },
      { label: "Export", icon: ArrowDownIcon },
    ],
  ],
}

function NavActions() {
  const { width, height } = useWindowDimensions()
  return (
    <View className="shrink-0 flex-row items-center gap-2">
      <Text className="hidden font-medium text-muted-foreground md:flex">
        Edit Oct 08
      </Text>
      <Button
        variant="ghost"
        size="icon-sm"
        accessibilityLabel="Add to favorites"
      >
        <StarIcon />
      </Button>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              accessibilityLabel="More actions"
            />
          }
        >
          <MoreHorizontalIcon />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-56 gap-0 overflow-hidden rounded-lg p-0"
        >
          {/* The sidebar's parts without its root: a popover's portal leaves the
              provider, which Sidebar needs and they don't. */}
          <ScrollView style={{ maxHeight: getMenuMaxHeight(height, width) }}>
            {data.actions.map((group, index) => (
              <SidebarGroup
                key={index}
                className={
                  index < data.actions.length - 1
                    ? "border-b border-border"
                    : undefined
                }
              >
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton icon={item.icon}>
                          {item.label}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </ScrollView>
        </PopoverContent>
      </Popover>
    </View>
  )
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
                  <DropdownMenuSeparator />
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

function AppSidebar({ onNavigate }: { onNavigate: (title: string) => void }) {
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

function Sidebar10({
  onNavigate = noop,
}: {
  onNavigate?: (title: string) => void
}) {
  return (
    <SidebarProvider>
      <AppSidebar onNavigate={onNavigate} />
      <SidebarInset>
        <View className="h-14 shrink-0 flex-row items-center gap-2 px-3 md:h-[calc(var(--density-48)+2*var(--density-8))]">
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
          <NavActions />
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow gap-4 px-4 pt-10 pb-safe-offset-10"
        >
          <View className="h-24 w-full max-w-3xl self-center rounded-xl bg-muted/50" />
          <View className="min-h-96 w-full max-w-3xl flex-1 self-center rounded-xl bg-muted/50" />
        </ScrollView>
      </SidebarInset>
    </SidebarProvider>
  )
}

export { Sidebar10 }
