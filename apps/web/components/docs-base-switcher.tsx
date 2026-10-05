import Link from "next/link"
import { cn } from "cn"

import { source } from "@/lib/source"
import { BASES } from "@/registry/bases"

export function DocsBaseSwitcher({
  base,
  component,
  hrefPrefix = "/docs/components",
  className,
}: {
  base: string
  component: string
  hrefPrefix?: string
  className?: string
}) {
  const activeBase = BASES.find((baseItem) => base === baseItem.name)

  return (
    <div
      className={cn(
        "not-typeset inline-flex w-full items-center gap-1",
        className
      )}
    >
      {BASES.filter((baseItem) =>
        source.getPage([`components/${baseItem.name}/${component}`])
      ).map((baseItem) => (
        <Link
          key={baseItem.name}
          href={`${hrefPrefix}/${baseItem.name}/${component}`}
          data-active={base === baseItem.name}
          className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-80 ease-spring outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring data-[active=true]:bg-active data-[active=true]:text-foreground"
        >
          {baseItem.title}
        </Link>
      ))}
      {activeBase?.meta?.logo && (
        <div
          className="ml-auto size-4 shrink-0 text-muted-foreground opacity-80 [&_svg]:size-4"
          dangerouslySetInnerHTML={{
            __html: activeBase.meta.logo,
          }}
        />
      )}
    </div>
  )
}
