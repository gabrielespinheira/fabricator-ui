import * as React from "react"
import {
  BadgeCheckIcon,
  BellIcon,
  BookOpenIcon,
  BotIcon,
  CreditCardIcon,
  FolderIcon,
  FrameIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MapIcon,
  MoreHorizontalIcon,
  PieChartIcon,
  SendIcon,
  Settings2Icon,
  ShareIcon,
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
  SidebarGroupContent,
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
  SidebarTrigger,
  useSidebar,
  useSidebarCollapse,
} from "@/registry/native/ui/sidebar"
import { Text, TextStyle } from "@/registry/native/ui/text"
import { UserMenu } from "@/registry/native/ui/user-menu"

const noop = () => {}

const data = {
  user: { name: "Gabs Fabricator", email: "gabs@fabricator.dev" },
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
  navSecondary: [
    { title: "Support", icon: LifeBuoyIcon },
    { title: "Feedback", icon: SendIcon },
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
  const [isOpen, setIsOpen] = React.useState(item.isActive ?? false)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        icon={item.icon}
        onPress={() => navigate(item.title)}
      >
        {item.title}
      </SidebarMenuButton>
      <SidebarMenuAction
        accessibilityLabel={`${isOpen ? "Collapse" : "Expand"} ${item.title}`}
        aria-expanded={isOpen}
        onPress={() => setIsOpen(!isOpen)}
      >
        <SidebarChevron open={isOpen} />
      </SidebarMenuAction>
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
                className="w-48"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <FolderIcon />
                    View Project
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ShareIcon />
                    Share Project
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
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
  const navigate = (title: string) => {
    onNavigate(title)
    if (isMobile) setOpenMobile(false)
  }
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onPress={() => navigate("Acme Inc")}>
              <TextStyle className="text-primary-foreground">
                <View className="size-(--density-32) items-center justify-center rounded-lg bg-primary">
                  <TerminalIcon />
                </View>
              </TextStyle>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-medium">
                  Acme Inc
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-(length:--density-text-12)"
                >
                  Enterprise
                </Text>
              </View>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent contentContainerClassName="grow">
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => (
              <NavMainRow key={item.title} item={item} navigate={navigate} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <NavProjects navigate={navigate} />
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    size="sm"
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
    </Sidebar>
  )
}

function Sidebar08({
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

export { Sidebar08 }
