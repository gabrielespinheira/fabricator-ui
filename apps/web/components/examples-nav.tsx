"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import { siteConfig } from "@/lib/config"
import { ScrollArea, ScrollBar } from "@/registry/new-york-v4/ui/scroll-area"

const examples = [
  {
    name: "Dashboard",
    href: "/examples/dashboard",
    code: `${siteConfig.links.github}/tree/main/apps/web/app/(app)/examples/dashboard`,
    hidden: false,
  },
  {
    name: "Tasks",
    href: "/examples/tasks",
    code: `${siteConfig.links.github}/tree/main/apps/web/app/(app)/examples/tasks`,
    hidden: false,
  },
  {
    name: "Playground",
    href: "/examples/playground",
    code: `${siteConfig.links.github}/tree/main/apps/web/app/(app)/examples/playground`,
    hidden: false,
  },
  {
    name: "Authentication",
    href: "/examples/authentication",
    code: `${siteConfig.links.github}/tree/main/apps/web/app/(app)/examples/authentication`,
    hidden: false,
  },
  {
    name: "RTL",
    href: "/examples/rtl",
    code: `${siteConfig.links.github}/tree/main/apps/web/app/(app)/examples/rtl`,
    hidden: false,
  },
]

export function ExamplesNav({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const pathname = usePathname()

  return (
    <div className={cn("flex items-center", className)} {...props}>
      <ScrollArea className="max-w-[96%] md:max-w-[600px] lg:max-w-none">
        <div className="flex items-center gap-1.5 py-0.5">
          <ExampleLink
            example={{ name: "Examples", href: "/", code: "", hidden: false }}
            isActive={pathname === "/"}
          />
          {examples.map((example) => (
            <ExampleLink
              key={example.href}
              example={example}
              isActive={pathname?.startsWith(example.href) ?? false}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  )
}

function ExampleLink({
  example,
  isActive,
}: {
  example: (typeof examples)[number]
  isActive: boolean
}) {
  if (example.hidden) {
    return null
  }

  return (
    <Link
      href={example.href}
      key={example.href}
      className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-muted px-3.5 text-center text-[15px] font-medium text-muted-foreground transition-colors duration-80 ease-spring outline-none hover:bg-active hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring data-[active=true]:bg-foreground data-[active=true]:text-background"
      data-active={isActive}
    >
      {example.name}
      {example.name === "RTL" && (
        <span className="flex size-2 rounded-full bg-blue-500" title="New" />
      )}
    </Link>
  )
}
