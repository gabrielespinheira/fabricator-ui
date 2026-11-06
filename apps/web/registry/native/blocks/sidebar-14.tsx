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
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/registry/native/ui/sidebar"
import { Text } from "@/registry/native/ui/text"

const noop = () => {}

const data = {
  navMain: [
    {
      title: "Getting Started",
      items: [{ title: "Installation" }, { title: "Project Structure" }],
    },
    {
      title: "Build Your Application",
      items: [
        { title: "Routing" },
        { title: "Data Fetching", isActive: true },
        { title: "Rendering" },
        { title: "Caching" },
        { title: "Styling" },
        { title: "Optimizing" },
        { title: "Configuring" },
        { title: "Testing" },
        { title: "Authentication" },
        { title: "Deploying" },
        { title: "Upgrading" },
        { title: "Examples" },
      ],
    },
    {
      title: "API Reference",
      items: [
        { title: "Components" },
        { title: "File Conventions" },
        { title: "Functions" },
        { title: "next.config.js Options" },
        { title: "CLI" },
        { title: "Edge Runtime" },
      ],
    },
    {
      title: "Architecture",
      items: [
        { title: "Accessibility" },
        { title: "Fast Refresh" },
        { title: "Next.js Compiler" },
        { title: "Supported Browsers" },
        { title: "Turbopack" },
      ],
    },
    {
      title: "Community",
      items: [{ title: "Contribution Guide" }],
    },
  ],
}

function AppSidebar({ onNavigate }: { onNavigate: (title: string) => void }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const navigate = (title: string) => {
    onNavigate(title)
    if (isMobile) setOpenMobile(false)
  }
  return (
    <Sidebar side="right">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Table of Contents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((section) => (
                <SidebarMenuItem key={section.title}>
                  <SidebarMenuButton onPress={() => navigate(section.title)}>
                    <Text numberOfLines={1} className="flex-1 font-medium">
                      {section.title}
                    </Text>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    {section.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton
                          isActive={item.isActive}
                          onPress={() => navigate(item.title)}
                        >
                          {item.title}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
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

function Sidebar14({
  onNavigate = noop,
}: {
  onNavigate?: (title: string) => void
}) {
  return (
    <SidebarProvider>
      <SidebarInset>
        <View className="h-16 shrink-0 flex-row items-center gap-2 border-b border-border px-4 md:h-[calc(var(--density-48)+2*var(--density-8))]">
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
          {/* It mirrors itself for a right sidebar, so no rotation as on the website. */}
          <SidebarTrigger className="-mr-1 ml-auto" />
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow gap-4 px-4 pt-4 pb-safe-offset-4"
        >
          <View className="gap-4 sm:flex-row">
            <View className="aspect-video rounded-xl bg-muted/50 sm:flex-1" />
            <View className="aspect-video rounded-xl bg-muted/50 sm:flex-1" />
            <View className="aspect-video rounded-xl bg-muted/50 sm:flex-1" />
          </View>
          <View className="min-h-96 flex-1 rounded-xl bg-muted/50" />
        </ScrollView>
      </SidebarInset>
      <AppSidebar onNavigate={onNavigate} />
    </SidebarProvider>
  )
}

export { Sidebar14 }
