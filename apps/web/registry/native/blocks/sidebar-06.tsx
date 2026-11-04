import * as React from "react"
import {
  GalleryVerticalEndIcon,
  MoreHorizontalIcon,
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
import { Button } from "@/registry/native/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/native/ui/card"
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
  SidebarFooter,
  SidebarGroup,
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
  navMain: [
    {
      title: "Getting Started",
      items: [{ title: "Installation" }, { title: "Project Structure" }],
    },
    {
      title: "Build Your Application",
      items: [
        { title: "Routing" },
        { title: "Data Fetching" },
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

function NavMain({ navigate }: { navigate: (title: string) => void }) {
  const { isMobile } = useSidebar()
  return (
    <SidebarGroup>
      <SidebarMenu>
        {data.navMain.map((section) => (
          // Around the row: a DropdownMenu directly in one is placed as its action.
          <DropdownMenu key={section.title}>
            <SidebarMenuItem>
              <DropdownMenuTrigger render={<SidebarMenuButton />}>
                {section.title}
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
                className="min-w-56 rounded-lg"
              >
                <DropdownMenuGroup>
                  {section.items.map((item) => (
                    <DropdownMenuItem
                      key={item.title}
                      onPress={() => navigate(item.title)}
                    >
                      {item.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </SidebarMenuItem>
          </DropdownMenu>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function SidebarOptInForm({
  onSubscribe,
}: {
  onSubscribe: (email: string) => void
}) {
  const [email, setEmail] = React.useState("")
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle>Subscribe to our newsletter</CardTitle>
        <CardDescription>
          Opt-in to receive updates and news about the sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-2.5 px-4">
        <SidebarInput
          accessibilityLabel="Email"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="done"
          onSubmitEditing={() => onSubscribe(email)}
        />
        <Button onPress={() => onSubscribe(email)}>Subscribe</Button>
      </CardContent>
    </Card>
  )
}

function AppSidebar({
  onNavigate,
  onSubscribe,
}: {
  onNavigate: (title: string) => void
  onSubscribe: (email: string) => void
}) {
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
      <SidebarContent keyboardShouldPersistTaps="handled">
        <NavMain navigate={navigate} />
      </SidebarContent>
      <SidebarFooter>
        <View className="p-1">
          <SidebarOptInForm onSubscribe={onSubscribe} />
        </View>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function Sidebar06({
  onNavigate = noop,
  onSubscribe = noop,
}: {
  onNavigate?: (title: string) => void
  onSubscribe?: (email: string) => void
}) {
  return (
    <SidebarProvider>
      <AppSidebar onNavigate={onNavigate} onSubscribe={onSubscribe} />
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

export { Sidebar06 }
