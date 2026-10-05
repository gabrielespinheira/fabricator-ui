"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import { ScrollArea, ScrollBar } from "@/registry/new-york-v4/ui/scroll-area"

const links = [
  {
    name: "Area Charts",
    href: "/charts/area#charts",
  },
  {
    name: "Bar Charts",
    href: "/charts/bar#charts",
  },
  {
    name: "Line Charts",
    href: "/charts/line#charts",
  },
  {
    name: "Pie Charts",
    href: "/charts/pie#charts",
  },
  {
    name: "Radar Charts",
    href: "/charts/radar#charts",
  },
  {
    name: "Radial Charts",
    href: "/charts/radial#charts",
  },
  {
    name: "Tooltips",
    href: "/charts/tooltip#charts",
  },
]

export function ChartsNav({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const pathname = usePathname()

  return (
    <div className="relative overflow-hidden">
      <ScrollArea className="max-w-[600px] lg:max-w-none">
        <div
          className={cn("flex items-center gap-1.5 py-0.5", className)}
          {...props}
        >
          {links.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              data-active={link.href.startsWith(pathname)}
              className={cn(
                "flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-muted px-3.5 text-center text-[15px] font-medium text-muted-foreground transition-colors duration-80 ease-spring outline-none hover:bg-active hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring data-[active=true]:bg-foreground data-[active=true]:text-background"
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  )
}
