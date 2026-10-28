import Link from "next/link"

import { SiteSettingsFields } from "@/components/fabricator/site-settings"

import { StepFooter } from "./step-parts"

const LINK_CLASS =
  "rounded-sm text-foreground underline underline-offset-4 outline-none hover:text-foreground/80 focus-visible:ring-1 focus-visible:ring-focus-ring"

/**
 * The Make it yours settings. They are the site's own, so the whole site,
 * the dashboard preview included, follows them.
 */
export function LookControls({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Change anything and the dashboard follows. Your colours, surface,
        radius, motion and icons go into the install command.
      </p>
      <div className="rounded-2xl bg-surface-3 px-3 py-1 shadow-surface-1 dark:bg-surface-2 dark:shadow-surface-2">
        <SiteSettingsFields />
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Want more control? Set every colour role and the surface tint on{" "}
        <Link href="/docs/foundations/colors" className={LINK_CLASS}>
          Colors
        </Link>
        . They carry over here.
      </p>
      <StepFooter onNext={onNext} nextLabel="Next: your project" />
    </div>
  )
}
