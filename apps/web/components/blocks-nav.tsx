"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { registryCategories } from "@/lib/categories"
import { ScrollArea, ScrollBar } from "@/registry/new-york-v4/ui/scroll-area"

export function BlocksNav() {
  const pathname = usePathname()

  return (
    <div className="relative overflow-hidden">
      <ScrollArea className="max-w-none">
        <div className="flex items-center gap-1.5 py-0.5">
          <BlocksNavLink
            category={{ name: "Featured", slug: "", hidden: false }}
            isActive={pathname === "/blocks"}
          />
          {registryCategories.map((category) => (
            <BlocksNavLink
              key={category.slug}
              category={category}
              isActive={pathname === `/blocks/${category.slug}`}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  )
}

function BlocksNavLink({
  category,
  isActive,
}: {
  category: (typeof registryCategories)[number]
  isActive: boolean
}) {
  if (category.hidden) {
    return null
  }

  return (
    <Link
      href={`/blocks/${category.slug}`}
      key={category.slug}
      className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-muted px-3.5 text-center text-[15px] font-medium text-muted-foreground transition-colors duration-fast ease-spring outline-none hover:bg-active hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring data-[active=true]:bg-foreground data-[active=true]:text-background"
      data-active={isActive}
    >
      {category.name}
    </Link>
  )
}
