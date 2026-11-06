import { GalleryVerticalEndIcon } from "@fabricator-ui/icons-react-native"
import { ScrollView, View } from "react-native"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/native/ui/breadcrumb"
import { Separator } from "@/registry/native/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
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
import { Text, TextStyle } from "@/registry/native/ui/text"

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
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onPress={() => navigate("Documentation")}
            >
              <TextStyle className="text-primary-foreground">
                <View className="size-(--density-32) items-center justify-center rounded-lg bg-primary">
                  <GalleryVerticalEndIcon />
                </View>
              </TextStyle>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text numberOfLines={1} className="font-medium">
                  Documentation
                </Text>
                <Text numberOfLines={1}>v1.0.0</Text>
              </View>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
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
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

function Sidebar03({
  onNavigate = noop,
}: {
  onNavigate?: (title: string) => void
}) {
  return (
    <SidebarProvider>
      <AppSidebar onNavigate={onNavigate} />
      <SidebarInset>
        <View className="h-16 shrink-0 flex-row items-center gap-2 border-b border-border px-3 md:h-[calc(var(--density-48)+2*var(--density-8))]">
          <SidebarTrigger />
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
    </SidebarProvider>
  )
}

export { Sidebar03 }
