import * as React from "react"
import {
  CheckIcon,
  ChevronsUpDownIcon,
  GalleryVerticalEndIcon,
  SearchIcon,
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
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import { Separator } from "@/registry/native/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/registry/native/ui/sidebar"
import { Text, TextStyle } from "@/registry/native/ui/text"

const noop = () => {}

const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
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
  ],
}

function VersionSwitcher({
  versions,
  defaultVersion,
}: {
  versions: string[]
  defaultVersion: string
}) {
  const [selectedVersion, setSelectedVersion] = React.useState(defaultVersion)
  return (
    <SidebarMenu>
      {/* Around the row: a DropdownMenu directly in one is placed as its action. */}
      <DropdownMenu>
        <SidebarMenuItem>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <TextStyle className="text-primary-foreground">
              <View className="size-(--density-32) items-center justify-center rounded-lg bg-primary">
                <GalleryVerticalEndIcon />
              </View>
            </TextStyle>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text numberOfLines={1} className="font-medium">
                Documentation
              </Text>
              <Text numberOfLines={1}>v{selectedVersion}</Text>
            </View>
            <ChevronsUpDownIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              {versions.map((version) => (
                <DropdownMenuItem
                  key={version}
                  onPress={() => setSelectedVersion(version)}
                >
                  <Text className="flex-1">v{version}</Text>
                  {version === selectedVersion ? <CheckIcon /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </SidebarMenuItem>
      </DropdownMenu>
    </SidebarMenu>
  )
}

function SearchForm() {
  return (
    <View className="relative">
      <SidebarInput
        accessibilityLabel="Search"
        placeholder="Search the docs..."
        returnKeyType="search"
        className="pl-8"
      />
      <View
        pointerEvents="none"
        className="absolute inset-y-0 left-2 justify-center opacity-50"
      >
        <SearchIcon />
      </View>
    </View>
  )
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
        <VersionSwitcher versions={data.versions} defaultVersion="1.0.1" />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent keyboardShouldPersistTaps="handled">
        {data.navMain.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={item.isActive}
                      onPress={() => navigate(item.title)}
                    >
                      {item.title}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

function Sidebar01({
  onNavigate = noop,
}: {
  onNavigate?: (title: string) => void
}) {
  return (
    <SidebarProvider>
      <AppSidebar onNavigate={onNavigate} />
      <SidebarInset>
        <View className="h-16 shrink-0 flex-row items-center gap-2 border-b border-border px-4">
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

export { Sidebar01 }
