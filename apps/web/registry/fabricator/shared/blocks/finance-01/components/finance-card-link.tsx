import { cn } from "cn"

import { buttonVariants } from "@/registry/bases/__base__/ui/button"

/**
 * A card header's "View all": a link styled as a small ghost button, pulled
 * out by its own padding so its text ends on the card's inset. Swap the
 * anchor for your router's link.
 */
export function FinanceCardLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-me-3")}
    >
      {children}
    </a>
  )
}
