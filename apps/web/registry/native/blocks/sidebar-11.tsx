import * as React from "react"
import { FileIcon, FolderIcon } from "@fabricator-ui/icons-react-native"
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
  SidebarChevron,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
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

const noop = () => {}

type TreeItem = string | TreeItem[]

const changes = [
  { file: "README.md", state: "M" },
  { file: "api/hello/route.ts", state: "U" },
  { file: "app/layout.tsx", state: "M" },
]

const tree: TreeItem[] = [
  [
    "app",
    [
      "api",
      ["hello", ["route.ts"]],
      "page.tsx",
      "layout.tsx",
      ["blog", ["page.tsx"]],
    ],
  ],
  ["components", ["ui", "button.tsx", "card.tsx"], "header.tsx", "footer.tsx"],
  ["lib", ["util.ts"]],
  ["public", "favicon.ico", "vercel.svg"],
  ".eslintrc.json",
  ".gitignore",
  "next.config.js",
  "tailwind.config.js",
  "package.json",
  "README.md",
]

function FolderRowIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <View className="flex-row items-center gap-1">
      <SidebarChevron open={isOpen} />
      <FolderIcon />
    </View>
  )
}

// A nested row has to be a sub-row: the depth that indents it lives on those.
function Tree({
  item,
  depth = 0,
  navigate,
}: {
  item: TreeItem
  depth?: number
  navigate: (title: string) => void
}) {
  const [head, ...items] = Array.isArray(item) ? item : [item]
  const name = String(head)
  const [isOpen, setIsOpen] = React.useState(
    name === "components" || name === "ui"
  )
  const isFolder = items.length > 0
  const icon = isFolder ? <FolderRowIcon isOpen={isOpen} /> : FileIcon
  const expanded = isFolder ? isOpen : undefined
  const onPress = isFolder ? () => setIsOpen(!isOpen) : () => navigate(name)
  const children = isFolder ? (
    <SidebarMenuSub open={isOpen}>
      {items.map((subItem, index) => (
        <Tree
          key={index}
          item={subItem}
          depth={depth + 1}
          navigate={navigate}
        />
      ))}
    </SidebarMenuSub>
  ) : null

  if (depth === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          icon={icon}
          aria-expanded={expanded}
          onPress={onPress}
        >
          {name}
        </SidebarMenuButton>
        {children}
      </SidebarMenuItem>
    )
  }
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={name === "button.tsx"}
        icon={icon}
        aria-expanded={expanded}
        className="data-[active=true]:bg-transparent"
        onPress={onPress}
      >
        {name}
      </SidebarMenuSubButton>
      {children}
    </SidebarMenuSubItem>
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
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Changes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {changes.map((item) => (
                <SidebarMenuItem key={item.file}>
                  <SidebarMenuButton
                    icon={FileIcon}
                    onPress={() => navigate(item.file)}
                  >
                    {item.file}
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{item.state}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tree.map((item, index) => (
                <Tree key={index} item={item} navigate={navigate} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

function Sidebar11({
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
                <BreadcrumbLink onPress={() => onNavigate("components")}>
                  components
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:flex" />
              <BreadcrumbItem className="hidden md:flex">
                <BreadcrumbLink onPress={() => onNavigate("ui")}>
                  ui
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:flex" />
              <BreadcrumbItem>
                <BreadcrumbPage>button.tsx</BreadcrumbPage>
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

export { Sidebar11 }
