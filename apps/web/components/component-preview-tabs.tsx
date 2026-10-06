"use client"

import * as React from "react"
import { cn } from "cn"
import { I18nProvider } from "react-aria-components"

import { DirectionProvider as BaseDirectionProvider } from "@/registry/bases/base/ui/direction"
import { DirectionProvider as RadixDirectionProvider } from "@/registry/bases/radix/ui/direction"

export function ComponentPreviewTabs({
  className,
  previewClassName,
  align = "center",
  hideCode = false,
  chromeLessOnMobile = false,
  component,
  source,
  // Kept for callers; the code view shows the full source instead.
  sourcePreview: _sourcePreview,
  styleName,
  ...props
}: React.ComponentProps<"div"> & {
  previewClassName?: string
  align?: "center" | "start" | "end"
  hideCode?: boolean
  chromeLessOnMobile?: boolean
  component: React.ReactNode
  source: React.ReactNode
  sourcePreview?: React.ReactNode
  styleName?: string
}) {
  const [view, setView] = React.useState<"preview" | "code">("preview")
  const base = styleName?.match(/^(base|radix|aria)-/)?.[1] || "radix"
  const showCode = !hideCode && view === "code"

  return (
    <div
      data-slot="component-preview"
      data-not-typeset
      className={cn(
        "group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border",
        className
      )}
      {...props}
    >
      {!hideCode && (
        <div className="flex h-14 shrink-0 items-center gap-1 border-b px-3">
          <div
            role="tablist"
            aria-label="View"
            className="flex items-center gap-1"
          >
            {(["preview", "code"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => setView(value)}
                className="h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground capitalize transition-colors duration-fast ease-spring outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring aria-selected:bg-active aria-selected:text-foreground"
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}
      {showCode ? (
        <div
          data-slot="code"
          className="relative overflow-hidden **:data-[slot=copy-button]:right-4 [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-none [&_[data-rehype-pretty-code-figure]]:border-0 [&_pre]:max-h-[26rem]"
        >
          {source}
        </div>
      ) : (
        <LtrProviders base={base}>
          <div data-slot="preview" dir="ltr">
            <div
              data-align={align}
              data-chromeless={chromeLessOnMobile}
              className={cn(
                "preview relative flex h-72 w-full justify-center p-10 data-[align=center]:items-center data-[align=end]:items-start data-[align=start]:items-start data-[chromeless=true]:h-auto data-[chromeless=true]:p-0 sm:data-[align=end]:items-end",
                previewClassName
              )}
            >
              {component}
            </div>
          </div>
        </LtrProviders>
      )}
    </div>
  )
}

/** Each base's direction/locale provider, fixed to left-to-right. */
function LtrProviders({
  base,
  children,
}: {
  base?: string
  children: React.ReactNode
}) {
  if (base === "base") {
    return (
      <BaseDirectionProvider direction="ltr">{children}</BaseDirectionProvider>
    )
  }
  if (base === "aria") {
    return <I18nProvider locale="en">{children}</I18nProvider>
  }
  return <RadixDirectionProvider dir="ltr">{children}</RadixDirectionProvider>
}
