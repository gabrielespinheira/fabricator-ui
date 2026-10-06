"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import { getColors } from "@/lib/colors"
import { ScrollArea, ScrollBar } from "@/registry/new-york-v4/ui/scroll-area"

export function ColorsNav({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const pathname = usePathname()
  const colors = getColors()

  return (
    <div className={cn("flex items-center", className)} {...props}>
      <ScrollArea className="max-w-full">
        <div className="flex items-center gap-1.5 py-0.5">
          {colors.map((colorPalette, index) => (
            <Link
              href={`/colors#${colorPalette.name}`}
              key={colorPalette.name}
              data-active={
                pathname?.startsWith(colorPalette.name) ||
                (index === 0 && pathname === "/colors")
              }
              className={cn(
                "flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-muted px-3.5 text-center text-[15px] font-medium text-muted-foreground capitalize transition-colors duration-fast ease-spring outline-none hover:bg-active hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring data-[active=true]:bg-foreground data-[active=true]:text-background"
              )}
            >
              {colorPalette.name}
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  )
}
