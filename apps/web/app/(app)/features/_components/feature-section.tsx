import Link from "next/link"
import { ArrowRightIcon, CheckIcon } from "@fabricator-ui/icons"

import { highlightCode } from "@/lib/highlight-code"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy-button"

import { type Feature } from "../_lib/features"

export async function FeatureSection({
  feature,
  index,
  preview,
}: {
  feature: Feature
  index: number
  preview: React.ReactNode
}) {
  const highlightedCode = await highlightCode(feature.code, feature.language)
  const isReversed = index % 2 === 1
  const titleId = `${feature.id}-title`

  return (
    <section
      id={feature.id}
      aria-labelledby={titleId}
      className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-12 lg:gap-16"
    >
      <div
        className={cn(
          "flex min-w-0 flex-col lg:col-span-5",
          isReversed && "lg:order-last"
        )}
      >
        <p className="text-[13px] font-medium text-muted-foreground tabular-nums">
          {String(index + 1).padStart(2, "0")} · {feature.name}
        </p>
        <h2
          id={titleId}
          className="mt-3 text-[28px] leading-tight font-semibold tracking-[-0.01em] text-balance"
        >
          {feature.title}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-pretty text-muted-foreground">
          {feature.lead}
        </p>
        <h3 className="mt-8 text-[14px] font-medium">Why we built it</h3>
        <ul className="mt-3 flex flex-col gap-2.5">
          {feature.reasons.map((reason) => (
            <li
              key={reason}
              className="flex gap-2.5 text-[14px] leading-relaxed text-muted-foreground"
            >
              <CheckIcon
                aria-hidden="true"
                className="mt-[3px] size-4 shrink-0 text-foreground"
              />
              <span className="text-pretty">{reason}</span>
            </li>
          ))}
        </ul>
        <figure
          data-rehype-pretty-code-figure=""
          className="relative mt-8 [&_[data-line]]:ps-4 [&_[data-line]]:pe-12 [&_[data-line]]:before:hidden [&_pre]:py-3.5 [&_pre]:text-[13px]"
        >
          <CopyButton value={feature.code} />
          <div
            data-not-typeset
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </figure>
        <Link
          href={feature.docs.href}
          className="group/link mt-6 flex w-fit items-center gap-1.5 rounded-md text-[14px] font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Read the {feature.docs.label} docs
          <ArrowRightIcon
            aria-hidden="true"
            className="size-4 transition-transform duration-feedback ease-feedback group-hover/link:translate-x-0.5"
          />
        </Link>
      </div>
      <div className="min-w-0 lg:col-span-7">{preview}</div>
    </section>
  )
}
