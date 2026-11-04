import * as React from "react"
import {
  ArrowRightIcon,
  AudioLinesIcon,
  BadgeCheckIcon,
  BellIcon,
  BookOpenIcon,
  BotIcon,
  CreditCardIcon,
  FolderIcon,
  FrameIcon,
  GalleryVerticalEndIcon,
  LogOutIcon,
  MapIcon,
  MoreHorizontalIcon,
  PieChartIcon,
  Settings2Icon,
  SparklesIcon,
  TerminalIcon,
  TerminalSquareIcon,
  Trash2Icon,
} from "@fabricator-ui/icons-react-native"
import { ScrollView, View } from "react-native"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/native/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import { Separator } from "@/registry/native/ui/separator"
import {
  Sidebar,
  SidebarChevron,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
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
import { UserMenu } from "@/registry/native/ui/user-menu"
import { WorkspaceSwitcher } from "@/registry/native/ui/workspace-switcher"

const noop = () => {}

const data = {
  user: { name: "Gabs Fabricator", email: "gabs@fabricator.dev" },
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
    {
      title: "Playground",
      icon: TerminalSquareIcon,
      isActive: true,
      items: [
        { title: "History" },
        { title: "Starred" },
        { title: "Settings" },
      ],
    },
    {
      title: "Models",
      icon: BotIcon,
      items: [
        { title: "Genesis" },
        { title: "Explorer" },
        { title: "Quantum" },
      ],
    },
    {
      title: "Documentation",
      icon: BookOpenIcon,
      items: [
        { title: "Introduction" },
        { title: "Get Started" },
        { title: "Tutorials" },
        { title: "Changelog" },
      ],
    },
    {
      title: "Settings",
      icon: Settings2Icon,
      items: [
        { title: "General" },
        { title: "Team" },
        { title: "Billing" },
        { title: "Limits" },
      ],
    },
  ],
  projects: [
    { name: "Design Engineering", icon: FrameIcon },
    { name: "Sales & Marketing", icon: PieChartIcon },
    { name: "Travel", icon: MapIcon },
  ],
}

function NavMainRow({
  item,
  navigate,
}: {
  item: (typeof data.navMain)[number]
  navigate: (title: string) => void
}) {
  const collapse = useSidebarCollapse()
  const [isOpen, setIsOpen] = React.useState(item.isActive ?? false)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        icon={item.icon}
        aria-expanded={isOpen}
        onPress={() => setIsOpen(!isOpen)}
      >
        {item.title}
        {collapse === "icon" ? null : <SidebarChevron open={isOpen} />}
      </SidebarMenuButton>
      <SidebarMenuSub open={isOpen}>
        {item.items.map((subItem) => (
          <SidebarMenuSubItem key={subItem.title}>
            <SidebarMenuSubButton onPress={() => navigate(subItem.title)}>
              {subItem.title}
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
      </SidebarMenuSub>
    </SidebarMenuItem>
  )
}

function NavProjects({ navigate }: { navigate: (title: string) => void }) {
  const { isMobile } = useSidebar()
  const collapse = useSidebarCollapse()
  if (collapse === "icon") return null
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {data.projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              icon={item.icon}
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
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <FolderIcon />
                    View Project
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ArrowRightIcon />
                    Share Project
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive">
                    <Trash2Icon />
                    Delete Project
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

function AppSidebar({ onNavigate }: { onNavigate: (title: string) => void }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const [team, setTeam] = React.useState("acme-inc")
  const navigate = (title: string) => {
    onNavigate(title)
    if (isMobile) setOpenMobile(false)
  }
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher
          label="Teams"
          createLabel="Add team"
          workspaces={data.teams}
          activeId={team}
          onSelect={setTeam}
          onCreate={noop}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => (
              <NavMainRow key={item.title} item={item} navigate={navigate} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <NavProjects navigate={navigate} />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={data.user}>
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
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function Sidebar07({
  onNavigate = noop,
}: {
  onNavigate?: (title: string) => void
}) {
  return (
    <SidebarProvider>
      <AppSidebar onNavigate={onNavigate} />
      <SidebarInset>
        <View className="h-16 shrink-0 flex-row items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 h-4 data-[orientation=vertical]:self-center"
          />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:flex">
                <BreadcrumbLink
                  onPress={() => onNavigate("Build Your Application")}
                >
                  Build Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:flex" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow gap-4 px-4 pb-safe-offset-4"
        >
          <View className="gap-4 sm:flex-row">
            <View className="aspect-video rounded-xl bg-muted/50 sm:flex-1" />
            <View className="aspect-video rounded-xl bg-muted/50 sm:flex-1" />
            <View className="aspect-video rounded-xl bg-muted/50 sm:flex-1" />
          </View>
          <View className="min-h-96 flex-1 rounded-xl bg-muted/50" />
        </ScrollView>
      </SidebarInset>
    </SidebarProvider>
  )
}

export { Sidebar07 }
