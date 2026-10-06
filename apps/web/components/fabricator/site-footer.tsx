import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { Icons } from "@/components/icons"

const LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/changelog", label: "Changelog" },
  { href: "/llms.txt", label: "llms.txt" },
]

/** The footer for the homepage and the full-width pages. */
export function SiteFooter() {
  return (
    <footer className="group-has-data-[slot=designer]/layout:hidden group-has-data-[slot=docs-shell]/layout:hidden">
      <div className="flex justify-center py-16">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icons.logo className="size-5" />
        </span>
      </div>
      <div className="grid grid-cols-1 items-center gap-3 px-4 pb-8 text-[13px] text-muted-foreground sm:grid-cols-3 sm:px-5">
        <p className="text-center sm:text-start">
          <span className="text-foreground">Open source</span> under the MIT
          License
        </p>
        <p className="text-center">© {new Date().getFullYear()}</p>
        <nav className="flex items-center justify-center gap-4 sm:justify-end">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm transition-colors duration-fast ease-spring outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={siteConfig.links.github}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm transition-colors duration-fast ease-spring outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring"
          >
            <Icons.gitHub className="size-4" />
            <span className="sr-only">GitHub</span>
          </Link>
        </nav>
      </div>
    </footer>
  )
}
