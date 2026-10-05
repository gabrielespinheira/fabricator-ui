"use client"

import * as React from "react"
import Link from "next/link"
import { IconAlertCircle } from "@tabler/icons-react"
import { cn } from "cn"
import { I18nProvider } from "react-aria-components"

import {
  LanguageProvider,
  LanguageSelector,
  useLanguageContext,
  useTranslation,
  type Translations,
} from "@/components/language-selector"
import { DirectionProvider as BaseDirectionProvider } from "@/registry/bases/base/ui/direction"
import { DirectionProvider as RadixDirectionProvider } from "@/registry/bases/radix/ui/direction"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/base-nova/ui/popover"

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
  direction = "ltr",
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
  direction?: "ltr" | "rtl"
  styleName?: string
}) {
  const [view, setView] = React.useState<"preview" | "code">("preview")
  const base = styleName?.match(/^(base|radix|aria)-/)?.[1] || "radix"
  const showCode = !hideCode && view === "code"
  const hasHeader = !hideCode || direction === "rtl"

  const header = hasHeader ? (
    <div className="flex h-14 shrink-0 items-center gap-1 border-b px-3">
      {!hideCode && (
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
              className="h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground capitalize transition-colors duration-80 ease-spring outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring aria-selected:bg-active aria-selected:text-foreground"
            >
              {value}
            </button>
          ))}
        </div>
      )}
      {direction === "rtl" && (
        <div className="ms-auto flex items-center gap-1">
          <RtlLanguageSelector />
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="size-7">
                  <IconAlertCircle />
                  <span className="sr-only">Toggle</span>
                </Button>
              }
            ></PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-56 text-xs">
              <div>
                I used AI to translate the text for demonstration purposes.
                It&apos;s not perfect and may contain errors.
              </div>
              <Separator className="-mx-2.5 w-auto!" />
              <div data-lang="ar">
                لقد استخدمت الذكاء الاصطناعي لترجمة النص للأغراض التجريبية فقط.
                قد لا تكون الترجمة دقيقة وقد تحتوي على أخطاء.
              </div>
              <Separator className="-mx-2.5 w-auto!" />
              <div data-lang="he">
                השתמשתי בבינה מלאכותית כדי לתרגם את הטקסט למטרות הדגמה. זה לא
                מושלם ויכול להכיל שגיאות.
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  ) : null

  const code = (
    <div
      data-slot="code"
      className="relative overflow-hidden **:data-[slot=copy-button]:right-4 [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-none [&_[data-rehype-pretty-code-figure]]:border-0 [&_pre]:max-h-[26rem]"
    >
      {direction === "rtl" && (
        <div className="relative z-10 no-scrollbar overflow-x-auto border-b bg-code p-6 font-mono text-sm text-muted-foreground">
          <pre>{`// You will notice this example uses dir and data-lang attributes.
// This is because this site is not RTL by default.
// In your application, you won't need these.`}</pre>
          <span>
            {"// See the "}
            <Link href="/docs/rtl" className="underline underline-offset-4">
              RTL guide
            </Link>
            {" for more information."}
          </span>
        </div>
      )}
      {source}
    </div>
  )

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
      {direction === "rtl" ? (
        <LanguageProvider defaultLanguage="ar">
          {header}
          {showCode ? (
            code
          ) : (
            <PreviewWrapper
              align={align}
              chromeLessOnMobile={chromeLessOnMobile}
              previewClassName={previewClassName}
            >
              <DirectionProviderWrapper base={base}>
                {component}
              </DirectionProviderWrapper>
            </PreviewWrapper>
          )}
        </LanguageProvider>
      ) : (
        <>
          {header}
          {showCode ? (
            code
          ) : (
            <DirectionProviderWrapper base={base} dir="ltr">
              <PreviewWrapper
                align={align}
                chromeLessOnMobile={chromeLessOnMobile}
                previewClassName={previewClassName}
                dir="ltr"
              >
                {component}
              </PreviewWrapper>
            </DirectionProviderWrapper>
          )}
        </>
      )}
    </div>
  )
}

const directionTranslations: Translations<Record<string, never>> = {
  en: {
    dir: "ltr",
    values: {},
  },
  ar: {
    dir: "rtl",
    values: {},
  },
  he: {
    dir: "rtl",
    values: {},
  },
}

function RtlLanguageSelector({ className }: { className?: string }) {
  const context = useLanguageContext()
  if (!context) {
    return null
  }
  return (
    <LanguageSelector
      value={context.language}
      onValueChange={context.setLanguage}
      className={className}
    />
  )
}

function PreviewWrapper({
  align,
  chromeLessOnMobile,
  previewClassName,
  dir: explicitDir,
  children,
}: {
  align: "center" | "start" | "end"
  chromeLessOnMobile: boolean
  previewClassName?: string
  dir?: "ltr" | "rtl"
  children: React.ReactNode
}) {
  // useTranslation handles the case when there's no LanguageProvider context.
  // It will fall back to local state with defaultLanguage.
  const translation = useTranslation(directionTranslations, "ar")
  const dir = explicitDir ?? translation.dir

  return (
    <div
      data-slot="preview"
      dir={dir}
      data-lang={dir === "rtl" ? translation.language : undefined}
    >
      <div
        data-align={align}
        data-chromeless={chromeLessOnMobile}
        className={cn(
          "preview relative flex h-72 w-full justify-center p-10 data-[align=center]:items-center data-[align=end]:items-start data-[align=start]:items-start data-[chromeless=true]:h-auto data-[chromeless=true]:p-0 sm:data-[align=end]:items-end",
          previewClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

function DirectionProviderWrapper({
  base,
  dir: explicitDir,
  children,
}: {
  base?: string
  dir?: "ltr" | "rtl"
  children: React.ReactNode
}) {
  // useTranslation handles the case when there's no LanguageProvider context.
  // It will fall back to local state with defaultLanguage.
  const translation = useTranslation(directionTranslations, "ar")
  const dir = explicitDir ?? translation.dir

  if (base === "base") {
    return (
      <BaseDirectionProvider direction={dir}>{children}</BaseDirectionProvider>
    )
  }

  if (base === "aria") {
    return (
      <I18nProvider
        locale={
          explicitDir === "ltr"
            ? "en"
            : (translation.locale ?? translation.language)
        }
      >
        {children}
      </I18nProvider>
    )
  }

  return <RadixDirectionProvider dir={dir}>{children}</RadixDirectionProvider>
}
