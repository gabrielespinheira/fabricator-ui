import * as React from "react"

import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const textLinkClassName =
  "rounded-(--radius-mark) font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"

// A caption-sized link, with a thumb-sized area around it on touch.
export const captionLinkClassName =
  "relative rounded-(--radius-mark) underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:after:absolute pointer-coarse:after:-inset-x-(--density-8) pointer-coarse:after:-inset-y-(--density-12)"

const footerLinkClassName =
  "rounded-(--radius-mark) py-(--density-8) underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"

// Sign in, sign up and the password reset share these classes, so the mark,
// the title and the first field keep their place from page to page. The column
// starts a share of the window's height from the top instead of centring, and
// phones start at the top, clear of the keyboard.
export function SignUpFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-surface-0 max-sm:density-spacious">
      <header className="flex items-center justify-between gap-(--density-16) p-(--density-16) text-(length:--density-text-13) leading-(--density-32) sm:px-(--density-24)">
        <a
          href="/"
          aria-label="Acme home"
          className="flex items-center gap-(--density-8) rounded-(--radius-control) text-(length:--density-text-14) leading-(--density-32) outline-none weight-semibold focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-(--density-32) items-center justify-center rounded-(--radius-control) bg-primary text-primary-foreground">
            <IconPlaceholder
              lucide="GalleryVerticalEndIcon"
              tabler="IconLayoutRows"
              hugeicons="LayoutBottomIcon"
              phosphor="RowsIcon"
              remixicon="RiGalleryView"
              className="size-(--density-icon-16)"
            />
          </span>
          Acme
        </a>
        <p className="text-muted-foreground">
          <span className="max-sm:sr-only">Already have an account? </span>
          <a
            href="/sign-in"
            className={`py-(--density-12) ${textLinkClassName}`}
          >
            Sign in
          </a>
        </p>
      </header>
      <main className="mx-auto flex w-full max-w-104 flex-1 flex-col gap-(--density-24) px-(--density-16) pt-(--density-20) pb-(--density-24) sm:pt-[clamp(var(--density-24),14svh,12rem)]">
        {children}
      </main>
      <footer className="flex items-center justify-between gap-(--density-16) px-(--density-16) py-(--density-8) text-(length:--density-text-12) text-muted-foreground sm:px-(--density-24)">
        <p>© 2026 Acme Inc</p>
        <nav aria-label="Support" className="flex gap-(--density-20)">
          <a href="/help" className={footerLinkClassName}>
            Help
          </a>
          <a href="/status" className={footerLinkClassName}>
            Status
          </a>
        </nav>
      </footer>
    </div>
  )
}

export function SignUpHeading({
  title,
  aside,
  children,
  headingRef,
}: {
  title: string
  /** Sits on the title's line, so it never moves what is under it. */
  aside?: React.ReactNode
  /** One line on a phone, about 45 characters, for the same reason. */
  children: React.ReactNode
  headingRef?: React.Ref<HTMLHeadingElement>
}) {
  return (
    <div className="flex flex-col gap-(--density-4) pb-(--density-8)">
      <div className="flex items-baseline justify-between gap-(--density-16)">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl tracking-tight text-balance outline-none weight-semibold"
        >
          {title}
        </h1>
        {aside}
      </div>
      <p className="text-[15px] text-pretty text-muted-foreground">
        {children}
      </p>
    </div>
  )
}
